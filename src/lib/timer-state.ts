import { TimerState, TimerStatus } from '@prisma/client'

interface TimerComputationOptions {
  /** Override current timestamp (ms) for deterministic calculations. */
  now?: number
}

export interface ComputedTimerState {
  id: number
  status: TimerStatus
  currentLevel: number
  /** Remaining seconds in the current blind level. */
  timeRemaining: number
  /** Seconds elapsed inside the current blind level. */
  elapsedInLevel: number
  /** Seconds transcurridos desde el inicio del torneo. */
  totalElapsed: number
  startTime: Date | null
  levelStartTime: Date | null
}

const asDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

const secondsBetween = (from: Date | null, to: number): number => {
  if (!from) return 0
  return Math.max(0, Math.floor((to - from.getTime()) / 1000))
}

export function computeTimerState(
  timerState: TimerState,
  { now }: TimerComputationOptions = {}
): ComputedTimerState {
  const reference = now ?? Date.now()
  const startTime = asDate(timerState.startTime)
  const levelStartTime = asDate(timerState.levelStartTime)

  let timeRemaining = timerState.timeRemaining
  let elapsedInLevel = 0

  if (timerState.status === 'active') {
    const elapsedSinceLevelStart = secondsBetween(levelStartTime, reference)
    timeRemaining = Math.max(0, timerState.timeRemaining - elapsedSinceLevelStart)
    elapsedInLevel = Math.min(timerState.timeRemaining, elapsedSinceLevelStart)
  }

  const totalElapsed = startTime
    ? Math.max(timerState.totalElapsed, secondsBetween(startTime, reference))
    : timerState.totalElapsed

  return {
    id: timerState.id,
    status: timerState.status,
    currentLevel: timerState.currentLevel,
    timeRemaining,
    elapsedInLevel,
    totalElapsed,
    startTime,
    levelStartTime
  }
}

export function derivePauseUpdate(
  timerState: TimerState,
  { now }: TimerComputationOptions = {}
) {
  const reference = now ?? Date.now()
  const computed = computeTimerState(timerState, { now: reference })

  return {
    status: 'paused' as TimerStatus,
    timeRemaining: computed.timeRemaining,
    totalElapsed: computed.totalElapsed,
    pausedAt: new Date(reference),
    lastUpdated: new Date(reference)
  }
}

export function deriveResumeUpdate(
  timerState: TimerState,
  { now }: TimerComputationOptions = {}
) {
  const reference = now ?? Date.now()
  const computed = computeTimerState(timerState, { now: reference })

  return {
    status: 'active' as TimerStatus,
    timeRemaining: computed.timeRemaining,
    levelStartTime: new Date(reference),
    pausedAt: null,
    lastUpdated: new Date(reference)
  }
}

export function deriveLevelChangeUpdate(
  timerState: TimerState,
  newLevel: number,
  newDurationSeconds: number,
  { now }: TimerComputationOptions = {}
) {
  const reference = now ?? Date.now()
  const computed = computeTimerState(timerState, { now: reference })

  return {
    currentLevel: newLevel,
    timeRemaining: newDurationSeconds,
    totalElapsed: computed.totalElapsed,
    levelStartTime: new Date(reference),
    lastUpdated: new Date(reference)
  }
}
