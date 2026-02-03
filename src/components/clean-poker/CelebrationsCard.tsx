'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import useSWR from 'swr'
import { Cake, Trophy, User, X } from 'lucide-react'

interface BirthdayPlayer {
  id: string
  firstName: string
  lastName: string
  photoUrl: string | null
  isToday: boolean
  daysUntil: number
}

interface DroughtPlayer {
  id: string
  firstName: string
  lastName: string
  photoUrl: string | null
  daysSinceVictory: number
}

interface CelebrationsData {
  birthdays: BirthdayPlayer[]
  droughts: DroughtPlayer[]
}

const DISMISSED_KEY = 'celebrations_dismissed'

interface DismissedState {
  birthdayIds: string[]
  droughtIds: string[]
  lastUpdated: string // ISO date for cleanup
}

function getDismissedState(): DismissedState {
  if (typeof window === 'undefined') {
    return { birthdayIds: [], droughtIds: [], lastUpdated: '' }
  }

  try {
    const stored = localStorage.getItem(DISMISSED_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as DismissedState
      // Reset if it's a new day (birthdays change daily)
      const today = new Date().toISOString().split('T')[0]
      if (parsed.lastUpdated !== today) {
        // New day - clear birthday dismissals but keep drought dismissals
        return {
          birthdayIds: [],
          droughtIds: parsed.droughtIds || [],
          lastUpdated: today
        }
      }
      return parsed
    }
  } catch {
    // Invalid stored data
  }

  return {
    birthdayIds: [],
    droughtIds: [],
    lastUpdated: new Date().toISOString().split('T')[0]
  }
}

function setDismissedState(state: DismissedState) {
  if (typeof window === 'undefined') return
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(state))
}

export function CelebrationsCard() {
  const { data } = useSWR<CelebrationsData>('/api/players/celebrations', {
    refreshInterval: 3600000 // Refresh every hour
  })

  const [dismissed, setDismissed] = useState<DismissedState>(() => getDismissedState())

  // Update localStorage when dismissed changes
  useEffect(() => {
    setDismissedState(dismissed)
  }, [dismissed])

  // Filter out dismissed players
  const visibleBirthdays = useMemo(() => {
    if (!data?.birthdays) return []
    return data.birthdays.filter(p => !dismissed.birthdayIds.includes(p.id))
  }, [data?.birthdays, dismissed.birthdayIds])

  const visibleDroughts = useMemo(() => {
    if (!data?.droughts) return []
    return data.droughts.filter(p => !dismissed.droughtIds.includes(p.id))
  }, [data?.droughts, dismissed.droughtIds])

  const handleDismissBirthdays = () => {
    if (!data?.birthdays) return
    setDismissed(prev => ({
      ...prev,
      birthdayIds: [...prev.birthdayIds, ...data.birthdays.map(p => p.id)],
      lastUpdated: new Date().toISOString().split('T')[0]
    }))
  }

  const handleDismissDroughts = () => {
    if (!data?.droughts) return
    setDismissed(prev => ({
      ...prev,
      droughtIds: [...prev.droughtIds, ...data.droughts.map(p => p.id)],
      lastUpdated: new Date().toISOString().split('T')[0]
    }))
  }

  // Don't render if no data or no visible celebrations
  if (!data) return null
  if (visibleBirthdays.length === 0 && visibleDroughts.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Birthday Notifications */}
      {visibleBirthdays.length > 0 && (
        <div
          className="rounded-2xl p-4 relative"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.15) 0%, rgba(255, 152, 0, 0.1) 100%)',
            border: '1px solid rgba(255, 193, 7, 0.3)',
          }}
        >
          {/* Dismiss button */}
          <button
            onClick={handleDismissBirthdays}
            className="absolute top-3 right-3 p-1.5 rounded-full transition-colors hover:bg-white/10"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" style={{ color: 'var(--cp-on-surface-muted)' }} />
          </button>

          <div className="flex items-center gap-2 mb-3">
            <Cake className="w-5 h-5" style={{ color: '#FFC107' }} />
            <span
              className="font-semibold"
              style={{ fontSize: 'var(--cp-body-size)', color: '#FFC107' }}
            >
              Cumpleanos
            </span>
          </div>

          <div className="space-y-2">
            {visibleBirthdays.map((player) => (
              <div key={player.id} className="flex items-center gap-3">
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                  style={{
                    background: player.photoUrl ? 'transparent' : 'var(--cp-surface-solid)',
                    border: '2px solid #FFC107',
                  }}
                >
                  {player.photoUrl ? (
                    <Image
                      src={player.photoUrl}
                      alt={`${player.firstName} ${player.lastName}`}
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <User className="w-5 h-5" style={{ color: 'var(--cp-on-surface-variant)' }} />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium truncate"
                    style={{ fontSize: 'var(--cp-body-size)', color: 'var(--cp-on-surface)' }}
                  >
                    {player.firstName} {player.lastName}
                  </p>
                  <p
                    style={{
                      fontSize: 'var(--cp-caption-size)',
                      color: player.isToday ? '#FFC107' : 'var(--cp-on-surface-muted)',
                      fontWeight: player.isToday ? 600 : 400
                    }}
                  >
                    {player.isToday
                      ? 'Hoy!'
                      : player.daysUntil === 1
                        ? 'Manana'
                        : `En ${player.daysUntil} dias`}
                  </p>
                </div>

                {/* Today badge */}
                {player.isToday && (
                  <span
                    className="px-2 py-1 rounded-full text-xs font-bold"
                    style={{
                      background: 'rgba(255, 193, 7, 0.2)',
                      color: '#FFC107'
                    }}
                  >
                    Felicidades!
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drought Notifications (1000+ days without winning) */}
      {visibleDroughts.length > 0 && (
        <div
          className="rounded-2xl p-4 relative"
          style={{
            background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.15) 0%, rgba(103, 58, 183, 0.1) 100%)',
            border: '1px solid rgba(156, 39, 176, 0.3)',
          }}
        >
          {/* Dismiss button */}
          <button
            onClick={handleDismissDroughts}
            className="absolute top-3 right-3 p-1.5 rounded-full transition-colors hover:bg-white/10"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" style={{ color: 'var(--cp-on-surface-muted)' }} />
          </button>

          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5" style={{ color: '#9C27B0' }} />
            <span
              className="font-semibold"
              style={{ fontSize: 'var(--cp-body-size)', color: '#9C27B0' }}
            >
              1000+ dias sin ganar
            </span>
          </div>

          <div className="space-y-2">
            {visibleDroughts.map((player) => (
              <div key={player.id} className="flex items-center gap-3">
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                  style={{
                    background: player.photoUrl ? 'transparent' : 'var(--cp-surface-solid)',
                    border: '2px solid #9C27B0',
                  }}
                >
                  {player.photoUrl ? (
                    <Image
                      src={player.photoUrl}
                      alt={`${player.firstName} ${player.lastName}`}
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <User className="w-5 h-5" style={{ color: 'var(--cp-on-surface-variant)' }} />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium truncate"
                    style={{ fontSize: 'var(--cp-body-size)', color: 'var(--cp-on-surface)' }}
                  >
                    {player.firstName} {player.lastName}
                  </p>
                  <p
                    style={{
                      fontSize: 'var(--cp-caption-size)',
                      color: 'var(--cp-on-surface-muted)'
                    }}
                  >
                    {player.daysSinceVictory.toLocaleString()} dias
                  </p>
                </div>

                {/* Drought badge */}
                <span
                  className="px-2 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: 'rgba(156, 39, 176, 0.2)',
                    color: '#9C27B0'
                  }}
                >
                  Sequia
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default CelebrationsCard
