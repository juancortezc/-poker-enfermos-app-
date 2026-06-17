'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import useSWR from 'swr'

interface BlindLevel {
  level: number
  smallBlind: number
  bigBlind: number
  duration: number // minutes
}

interface TimerApiResponse {
  success: boolean
  serverTime: number
  timerState: {
    id: number
    currentLevel: number
    timeRemaining: number
    status: 'inactive' | 'active' | 'paused' | 'completed'
    levelStartTime: string | null
    startTime: string | null
    totalElapsed: number
  }
  currentBlind: BlindLevel | null
  nextBlind: BlindLevel | null
  tournament: { id: number; name: string }
  gameDate: { id: number; dateNumber: number; status: string }
  isActive: boolean
  canControl: boolean
}

export interface PokerTimerState {
  // Server state
  status: 'inactive' | 'active' | 'paused' | 'completed'
  currentLevel: number
  currentBlind: BlindLevel | null
  nextBlind: BlindLevel | null
  canControl: boolean
  gameDateStartTime: string | null
  totalLevelDuration: number // seconds, for progress bar
  // Computed locally
  displayTimeRemaining: number
  formattedTime: string
  isCritical: boolean // < 60 seconds
  elapsedInLevel: number // seconds elapsed in current level
  // Hook state
  isLoading: boolean
  isError: boolean
  refresh: () => void
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function computeDisplay(
  status: string,
  storedTimeRemaining: number,
  levelStartTime: string | null,
  serverTime: number
): number {
  if (status !== 'active' || !levelStartTime) {
    return Math.max(0, storedTimeRemaining)
  }
  const levelStart = new Date(levelStartTime).getTime()
  const now = Date.now()
  // Adjust for server-client clock difference (serverTime came with the snapshot)
  const clockOffset = serverTime - now // typically ±200ms
  const adjustedNow = now + clockOffset
  const elapsedSinceLevelStart = Math.floor((adjustedNow - levelStart) / 1000)
  return Math.max(0, storedTimeRemaining - elapsedSinceLevelStart)
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json() as Promise<TimerApiResponse>
  })

export function usePokerTimer(gameDateId: number | null): PokerTimerState {
  const [displayTime, setDisplayTime] = useState(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastAutoAdvancedFromRef = useRef<number | null>(null)
  const isAdvancingRef = useRef(false)

  const { data, error, isLoading, mutate } = useSWR<TimerApiResponse>(
    gameDateId ? `/api/timer/game-date/${gameDateId}` : null,
    fetcher,
    {
      refreshInterval: 15000, // re-sync every 15 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  )

  // When server data arrives, compute the accurate display time and sync local state
  useEffect(() => {
    if (!data?.timerState) return
    const { status, timeRemaining, levelStartTime } = data.timerState
    const computed = computeDisplay(status, timeRemaining, levelStartTime, data.serverTime)
    setDisplayTime(computed)
  }, [data])

  // Local tick: decrement every second when active (purely cosmetic, server re-sync corrects drift)
  useEffect(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }

    if (data?.timerState?.status === 'active') {
      tickRef.current = setInterval(() => {
        setDisplayTime(prev => Math.max(0, prev - 1))
      }, 1000)
    }

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current)
        tickRef.current = null
      }
    }
  }, [data?.timerState?.status, data?.timerState?.levelStartTime])

  // Re-sync when user comes back to the tab
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        mutate()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [mutate])

  // Auto-advance: only Comision, only when timer hits 0 and there's a next level
  useEffect(() => {
    if (!data) return
    const { canControl, timerState, nextBlind } = data
    if (!canControl) return
    if (timerState.status !== 'active') return
    if (!nextBlind) return
    if (displayTime > 0) return
    if (isAdvancingRef.current) return
    if (lastAutoAdvancedFromRef.current === timerState.currentLevel) return

    const fromLevel = timerState.currentLevel
    const toLevel = nextBlind.level
    lastAutoAdvancedFromRef.current = fromLevel
    isAdvancingRef.current = true

    fetch(`/api/timer/game-date/${gameDateId}/level-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ toLevel, fromLevel }),
    })
      .then(r => r.json())
      .then(() => mutate())
      .catch(() => {
        // Reset guard so it can retry on next tick
        lastAutoAdvancedFromRef.current = null
      })
      .finally(() => {
        isAdvancingRef.current = false
      })
  }, [displayTime, data, gameDateId, mutate])

  // Reset auto-advance guard when level changes (new level from server)
  const currentLevel = data?.timerState?.currentLevel
  useEffect(() => {
    if (currentLevel !== undefined && lastAutoAdvancedFromRef.current !== null) {
      if (currentLevel !== lastAutoAdvancedFromRef.current) {
        lastAutoAdvancedFromRef.current = null
      }
    }
  }, [currentLevel])

  const refresh = useCallback(() => { mutate() }, [mutate])

  if (!data?.timerState) {
    return {
      status: 'inactive',
      currentLevel: 1,
      currentBlind: null,
      nextBlind: null,
      canControl: false,
      gameDateStartTime: null,
      totalLevelDuration: 0,
      displayTimeRemaining: 0,
      formattedTime: '00:00',
      isCritical: false,
      elapsedInLevel: 0,
      isLoading,
      isError: !!error,
      refresh,
    }
  }

  const { timerState, currentBlind, nextBlind, canControl } = data
  const totalLevelDuration = (currentBlind?.duration ?? 0) * 60
  const elapsedInLevel = Math.max(0, totalLevelDuration - displayTime)

  return {
    status: timerState.status,
    currentLevel: timerState.currentLevel,
    currentBlind,
    nextBlind,
    canControl,
    gameDateStartTime: timerState.startTime,
    totalLevelDuration,
    displayTimeRemaining: displayTime,
    formattedTime: currentBlind?.duration === 0 ? 'SIN LÍMITE' : formatTime(displayTime),
    isCritical: displayTime > 0 && displayTime <= 60 && currentBlind?.duration !== 0,
    elapsedInLevel,
    isLoading,
    isError: !!error,
    refresh,
  }
}
