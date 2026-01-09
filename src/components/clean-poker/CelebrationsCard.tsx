'use client'

import Image from 'next/image'
import useSWR from 'swr'
import { Cake, Trophy, User } from 'lucide-react'

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

export function CelebrationsCard() {
  const { data } = useSWR<CelebrationsData>('/api/players/celebrations', {
    refreshInterval: 3600000 // Refresh every hour
  })

  // Don't render if no data or no celebrations
  if (!data) return null
  if (data.birthdays.length === 0 && data.droughts.length === 0) return null

  return (
    <div className="space-y-3">
      {/* Birthday Notifications */}
      {data.birthdays.length > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.15) 0%, rgba(255, 152, 0, 0.1) 100%)',
            border: '1px solid rgba(255, 193, 7, 0.3)',
          }}
        >
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
            {data.birthdays.map((player) => (
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
      {data.droughts.length > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.15) 0%, rgba(103, 58, 183, 0.1) 100%)',
            border: '1px solid rgba(156, 39, 176, 0.3)',
          }}
        >
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
            {data.droughts.map((player) => (
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
