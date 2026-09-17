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
} from '@/lib/timer-engine'

/**
 * Puente entre el motor puro y la base de datos.
 *
 * Regla que el sistema anterior rompia: LEER NUNCA ESCRIBE. Antes el endpoint
 * del home llamaba a syncTimerLevel() para hacer subir el nivel, o sea que un
 * GET mutaba el estado — y con varias pantallas abiertas, varios GET competian
 * por escribir lo mismo. Ahora el nivel se deriva, asi que leer es leer.
 */

export type TimerAction = 'start' | 'pause' | 'resume' | 'restart-level' | 'advance'

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
        tournament: {
          select: { blindLevels: { orderBy: { level: 'asc' } } },
        },
      },
    }),
  ])

  const niveles = toBlindSpecs(fecha?.tournament.blindLevels ?? [])
  const anchor: TimerAnchor = estado
    ? {
        status: estado.status as TimerAnchor['status'],
        anchorLevel: estado.anchorLevel,
        anchorElapsedMs: estado.anchorElapsedMs,
        anchorAt: estado.anchorAt,
      }
    : ESTADO_VACIO

  return { anchor, niveles, existe: Boolean(estado) }
}

function aSnapshot(vista: TimerView, now: Date): TimerSnapshot {
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
  }
}

/** Estado actual. Solo lee. */
export async function readTimer(gameDateId: number): Promise<TimerSnapshot> {
  const now = new Date()
  const { anchor, niveles } = await cargar(gameDateId)
  return aSnapshot(resolveTimer(anchor, niveles, now), now)
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
  const { anchor, niveles } = await cargar(gameDateId)

  if (niveles.length === 0) {
    throw new Error('El torneo no tiene estructura de blinds cargada')
  }

  let nuevo: TimerAnchor
  switch (action) {
    case 'start':
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

  return aSnapshot(resolveTimer(nuevo, niveles, now), now)
}

/** Arranca el timer junto con la fecha, si todavia no existe. */
export async function ensureTimerStarted(gameDateId: number): Promise<void> {
  const { existe } = await cargar(gameDateId)
  if (existe) return
  await applyTimerAction(gameDateId, 'start')
}
