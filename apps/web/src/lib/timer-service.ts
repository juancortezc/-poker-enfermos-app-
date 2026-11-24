import { prisma } from '@/lib/prisma'
import {
  resolveTimer,
  toBlindSpecs,
  startTimer,
  pauseTimer,
  resumeTimer,
  restartLevel,
  advanceLevel,
  type TimerAnchor,
  type TimerView,
} from '@poker/shared'

/**
 * Puente entre el motor puro y la base de datos.
 *
 * Regla que el sistema anterior rompia: LEER NUNCA ESCRIBE. Antes el endpoint
 * del home llamaba a syncTimerLevel() para hacer subir el nivel, o sea que un
 * GET mutaba el estado — y con varias pantallas abiertas, varios GET competian
 * por escribir lo mismo. Ahora el nivel se deriva, asi que leer es leer.
 */

/**
 * `start` es idempotente: si el timer ya corre (o esta pausado) no lo toca.
 * Para volver al nivel 1 de verdad hay que pedir `reset` explicitamente.
 */
export type TimerAction = 'start' | 'reset' | 'pause' | 'resume' | 'restart-level' | 'advance'

export const TIMER_ACTIONS: TimerAction[] = ['start', 'reset', 'pause', 'resume', 'restart-level', 'advance']

/** Error con status HTTP y codigo estable para el cliente. */
export class TimerError extends Error {
  constructor(
    message: string,
    readonly status: 404 | 409,
    readonly code: 'GAME_DATE_NOT_FOUND' | 'GAME_DATE_NOT_IN_PROGRESS' | 'NO_BLIND_LEVELS'
  ) {
    super(message)
    this.name = 'TimerError'
  }
}

/** Un nivel de la estructura del torneo, tal como esta en BlindLevel. */
export interface TimerBlindLevel {
  level: number
  smallBlind: number
  bigBlind: number
  /** Minutos. 0 = sin limite. */
  duration: number
}

/** Lo que viaja al cliente. Las fechas van en ISO. */
export interface TimerSnapshot {
  status: TimerView['status']
  level: number
  smallBlind: number | null
  bigBlind: number | null
  nextSmallBlind: number | null
  nextBigBlind: number | null
  nextLevel: number | null
  remainingMs: number
  /**
   * Instante absoluto del cambio de blind, en ISO. Es lo que el cliente usa
   * para programar el aviso: no depende de que la pestana este despierta ni de
   * ir descontando de a un segundo.
   */
  levelEndsAt: string | null
  isUnlimited: boolean
  isLastLevel: boolean
  /** Reloj del servidor, para que el cliente corrija su propio desfase. */
  serverNow: string
  /**
   * Estructura de blinds del torneo, para que el cliente reconstruya el
   * ancla sin pedir el torneo entero.
   */
  blindLevels: TimerBlindLevel[]
}

const ESTADO_VACIO = {
  status: 'inactive' as const,
  anchorLevel: 1,
  anchorElapsedMs: 0,
  anchorAt: null,
}

async function cargar(gameDateId: number) {
  const [estado, fecha] = await Promise.all([
    prisma.timerState.findUnique({ where: { gameDateId } }),
    prisma.gameDate.findUnique({
      where: { id: gameDateId },
      select: {
        status: true,
        tournament: {
          select: {
            blindLevels: {
              orderBy: { level: 'asc' },
              select: { level: true, smallBlind: true, bigBlind: true, duration: true },
            },
          },
        },
      },
    }),
  ])

  if (!fecha) {
    throw new TimerError('Fecha no encontrada', 404, 'GAME_DATE_NOT_FOUND')
  }

  const blindLevels = fecha.tournament.blindLevels
  const niveles = toBlindSpecs(blindLevels)
  // Una fecha que ya no esta en curso no tiene reloj, aunque haya quedado un
  // ancla vieja (fechas cerradas antes de que el cierre detuviera el timer).
  const anchor: TimerAnchor =
    estado && fecha.status === 'in_progress'
      ? {
          status: estado.status as TimerAnchor['status'],
          anchorLevel: estado.anchorLevel,
          anchorElapsedMs: estado.anchorElapsedMs,
          anchorAt: estado.anchorAt,
        }
      : ESTADO_VACIO

  return { anchor, niveles, blindLevels, existe: Boolean(estado), gameDateStatus: fecha.status }
}

function aSnapshot(vista: TimerView, now: Date, blindLevels: TimerBlindLevel[]): TimerSnapshot {
  return {
    status: vista.status,
    level: vista.level,
    smallBlind: vista.blind?.smallBlind ?? null,
    bigBlind: vista.blind?.bigBlind ?? null,
    nextSmallBlind: vista.nextBlind?.smallBlind ?? null,
    nextBigBlind: vista.nextBlind?.bigBlind ?? null,
    nextLevel: vista.nextBlind?.level ?? null,
    remainingMs: vista.remainingMs,
    levelEndsAt: vista.levelEndsAt?.toISOString() ?? null,
    isUnlimited: vista.isUnlimited,
    isLastLevel: vista.isLastLevel,
    serverNow: now.toISOString(),
    blindLevels,
  }
}

/** Estado actual. Solo lee. */
export async function readTimer(gameDateId: number): Promise<TimerSnapshot> {
  const now = new Date()
  const { anchor, niveles, blindLevels } = await cargar(gameDateId)
  return aSnapshot(resolveTimer(anchor, niveles, now), now, blindLevels)
}

/**
 * Aplica una accion de control y devuelve el estado resultante.
 *
 * Cada accion escribe un ancla nueva; ninguna hace leer-modificar-escribir
 * sobre un contador, asi que repetirla no acumula efectos.
 */
export async function applyTimerAction(
  gameDateId: number,
  action: TimerAction
): Promise<TimerSnapshot> {
  const now = new Date()
  const { anchor, niveles, blindLevels, gameDateStatus } = await cargar(gameDateId)

  if (gameDateStatus !== 'in_progress') {
    throw new TimerError(
      `La fecha no esta en curso (estado: ${gameDateStatus})`,
      409,
      'GAME_DATE_NOT_IN_PROGRESS'
    )
  }

  if (niveles.length === 0) {
    throw new TimerError('El torneo no tiene estructura de blinds cargada', 409, 'NO_BLIND_LEVELS')
  }

  let nuevo: TimerAnchor
  switch (action) {
    case 'start':
      // Idempotente: un segundo toque (u otro telefono) no reinicia la noche.
      if (anchor.status !== 'inactive') {
        return aSnapshot(resolveTimer(anchor, niveles, now), now, blindLevels)
      }
      nuevo = startTimer(niveles, now)
      break
    case 'reset':
      nuevo = startTimer(niveles, now)
      break
    case 'pause':
      nuevo = pauseTimer(anchor, niveles, now)
      break
    case 'resume':
      nuevo = resumeTimer(anchor, now)
      break
    case 'restart-level':
      nuevo = restartLevel(anchor, niveles, now)
      break
    case 'advance':
      nuevo = advanceLevel(anchor, niveles, now)
      break
  }

  const datos = {
    status: nuevo.status,
    anchorLevel: nuevo.anchorLevel,
    anchorElapsedMs: nuevo.anchorElapsedMs,
    anchorAt: nuevo.anchorAt,
  }

  await prisma.timerState.upsert({
    where: { gameDateId },
    create: { gameDateId, ...datos },
    update: datos,
  })

  return aSnapshot(resolveTimer(nuevo, niveles, now), now, blindLevels)
}

/**
 * Detiene el timer de una fecha (al cerrarla). Acepta un cliente de
 * transaccion para quedar dentro del mismo cierre.
 */
export async function stopTimer(
  gameDateId: number,
  client: Pick<typeof prisma, 'timerState'> = prisma
): Promise<void> {
  await client.timerState.updateMany({
    where: { gameDateId },
    data: { status: 'inactive', anchorAt: null },
  })
}

/** Arranca el timer junto con la fecha, si todavia no existe. */
export async function ensureTimerStarted(gameDateId: number): Promise<void> {
  const { existe } = await cargar(gameDateId)
  if (existe) return
  await applyTimerAction(gameDateId, 'start')
}
