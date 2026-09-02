import type { TimerState } from '@prisma/client'
import { prisma } from './prisma'
import { sendNotificationIfEnabled } from './notification-config'
import type { ComputedTimerState } from './timer-state'

const WARNING_THRESHOLD_SECONDS = 60

interface BlindLevelInfo {
  level: number
  smallBlind: number
  bigBlind: number
}

/**
 * Fires the "1 minute left" push once per blind level, as a side effect of
 * any device polling the timer (not tied to a specific controlling device).
 * Uses an atomic conditional update on `warnedLevel` so concurrent pollers
 * only send the notification once.
 */
export async function maybeSendBlindWarning(
  timerState: TimerState,
  computed: ComputedTimerState,
  blindLevels: BlindLevelInfo[]
): Promise<void> {
  if (computed.status !== 'active') return
  if (computed.timeRemaining <= 0 || computed.timeRemaining > WARNING_THRESHOLD_SECONDS) return
  if (timerState.warnedLevel === timerState.currentLevel) return

  const { count } = await prisma.timerState.updateMany({
    where: {
      id: timerState.id,
      OR: [{ warnedLevel: null }, { warnedLevel: { not: timerState.currentLevel } }],
    },
    data: { warnedLevel: timerState.currentLevel },
  })

  if (count === 0) return

  const nextBlind = blindLevels.find((bl) => bl.level === timerState.currentLevel + 1)
  const body = nextBlind
    ? `${nextBlind.smallBlind.toLocaleString()}/${nextBlind.bigBlind.toLocaleString()}`
    : 'Termina el nivel actual'

  await sendNotificationIfEnabled(
    'blind_level_warning',
    '⏱️ ¡Sube en 1 minuto!',
    body,
    { gameDateId: timerState.gameDateId, level: timerState.currentLevel }
  )
}
