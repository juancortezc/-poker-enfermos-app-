import type { TimerState } from '@prisma/client'
import { prisma } from './prisma'
import { sendNotificationIfEnabled } from './notification-config'

export interface BlindLevelInfo {
  level: number
  smallBlind: number
  bigBlind: number
  duration: number
}

export interface LevelAdvance {
  toLevel: number
  /** Segundos que le quedan al nivel nuevo, descontando lo que ya se pasó. */
  timeRemaining: number
  /** Cuántos niveles se saltaron de una sola vez (nadie miró el timer en un rato). */
  levelsAdvanced: number
}

/**
 * Cuántos niveles pasaron desde levelStartTime y en cuál queda el timer.
 * Función pura: no toca la base de datos.
 *
 * Devuelve null si no hay nada que avanzar — pausado, sin arrancar, todavía
 * queda tiempo, o ya está en el último nivel.
 */
export function computeLevelAdvance(
  timerState: Pick<TimerState, 'status' | 'currentLevel' | 'timeRemaining' | 'levelStartTime'>,
  blindLevels: BlindLevelInfo[],
  now: number = Date.now()
): LevelAdvance | null {
  if (timerState.status !== 'active') return null
  if (!timerState.levelStartTime) return null

  const levelStart = new Date(timerState.levelStartTime).getTime()
  const elapsed = Math.floor((now - levelStart) / 1000)
  if (elapsed < 0) return null // reloj corrido: no adivinar

  // Segundos que se pasaron del final del nivel actual.
  let overflow = elapsed - timerState.timeRemaining
  if (overflow < 0) return null

  const byLevel = new Map(blindLevels.map((bl) => [bl.level, bl]))
  let level = timerState.currentLevel
  let timeRemaining = 0
  let levelsAdvanced = 0

  // El tope evita cualquier bucle infinito si los niveles vinieran mal.
  for (let i = 0; i < blindLevels.length; i++) {
    const next = byLevel.get(level + 1)
    if (!next) break // ya está en el último: se queda ahí en 00:00

    level = next.level
    levelsAdvanced++

    const duration = next.duration * 60
    // duration 0 = nivel final sin límite de tiempo.
    if (duration <= 0) {
      timeRemaining = 0
      break
    }

    if (overflow < duration) {
      timeRemaining = duration - overflow
      break
    }

    overflow -= duration
  }

  if (levelsAdvanced === 0) return null

  return { toLevel: level, timeRemaining, levelsAdvanced }
}

/**
 * Adelanta el nivel si corresponde y lo persiste.
 *
 * No hay cron que mueva el timer: el nivel sube de forma perezosa cuando
 * alguien lee el estado. El registro y el home consultan cada pocos segundos,
 * así que en la práctica sube solo; y si nadie miró en media hora, la
 * siguiente lectura recupera todos los niveles pasados de una vez.
 *
 * El update es condicional sobre currentLevel, así que entre varios
 * dispositivos leyendo a la vez solo uno avanza y manda la notificación.
 */
export async function syncTimerLevel(
  timerState: TimerState,
  blindLevels: BlindLevelInfo[]
): Promise<TimerState> {
  const advance = computeLevelAdvance(timerState, blindLevels)
  if (!advance) return timerState

  const now = new Date()
  const { count } = await prisma.timerState.updateMany({
    where: { id: timerState.id, currentLevel: timerState.currentLevel, status: 'active' },
    data: {
      currentLevel: advance.toLevel,
      timeRemaining: advance.timeRemaining,
      levelStartTime: now,
      lastUpdated: now,
      warnedLevel: null // que el aviso de "1 minuto" pueda dispararse en el nivel nuevo
    }
  })

  const updated = await prisma.timerState.findUnique({ where: { id: timerState.id } })

  // count === 0 significa que otro poller ganó la carrera: él manda el push.
  if (count === 0) return updated ?? timerState

  // No se registra TimerAction porque performedBy es obligatorio y apunta a un
  // Player: un avance automático no tiene autor. Queda en el historial de
  // notificaciones y en el propio TimerState.

  const blind = blindLevels.find((bl) => bl.level === advance.toLevel)
  if (blind) {
    await sendNotificationIfEnabled(
      'blind_level_changed',
      '📈 ¡Sube!',
      `${blind.smallBlind.toLocaleString()}/${blind.bigBlind.toLocaleString()}`,
      {
        gameDateId: timerState.gameDateId,
        level: advance.toLevel,
        smallBlind: blind.smallBlind,
        bigBlind: blind.bigBlind,
        automatic: true
      }
    ).catch((err) => console.error('[AUTO LEVEL-UP NOTIFICATION ERROR]', err))
  }

  return updated ?? timerState
}
