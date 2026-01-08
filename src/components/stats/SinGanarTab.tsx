'use client'

import useSWR from 'swr'
import Image from 'next/image'
import { Flame } from 'lucide-react'

interface PlayerWithVictoryData {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string | null
  lastVictoryDate?: string | null
  daysWithoutVictory: number
  hasNeverWon: boolean
}

interface Tournament {
  id: number
  number: number
  name: string
}

interface DaysWithoutVictoryResponse {
  tournament: Tournament
  players: PlayerWithVictoryData[]
  stats: {
    totalPlayers: number
    playersWithVictories: number
    playersNeverWon: number
    averageDaysWithoutVictory: number
    longestStreak: number
  }
}

const fetcher = async (url: string) => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' }
  })
  if (!response.ok) throw new Error('Error fetching data')
  return response.json()
}

const getDaysColor = (days: number) => {
  if (days <= 60) return '#10b981'    // green
  if (days <= 250) return '#fbbf24'   // yellow
  if (days <= 500) return '#f97316'   // orange
  if (days <= 900) return '#ec4899'   // pink
  return '#E53935'                     // red
}

export default function SinGanarTab() {
  const { data, error, isLoading } = useSWR<DaysWithoutVictoryResponse>(
    '/api/stats/days-without-victory/1',
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true
    }
  )

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div style={{ color: 'var(--cp-on-surface-muted)' }}>Cargando racha sin victorias...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        <p style={{ color: '#E53935', fontSize: 'var(--cp-body-size)' }}>
          Error al cargar los datos
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 rounded-lg font-medium"
          style={{ background: '#E53935', color: 'white' }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  const players = data?.players ?? []

  // Players close to 1000 days milestone
  const milestonePlayers = players
    .filter(player => player.daysWithoutVictory >= 985 && player.daysWithoutVictory <= 1015)
    .sort((a, b) => b.daysWithoutVictory - a.daysWithoutVictory)

  return (
    <div className="space-y-4">
      {/* Milestone Alert Card */}
      {milestonePlayers.length > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'var(--cp-surface)',
            border: '1px solid var(--cp-surface-border)',
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: '#E5393520' }}
            >
              <Flame className="w-5 h-5" style={{ color: '#E53935' }} />
            </div>
            <div>
              <h3
                className="font-semibold"
                style={{ fontSize: 'var(--cp-body-size)', color: 'var(--cp-on-surface)' }}
              >
                Club 1000
              </h3>
              <p style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-muted)' }}>
                Jugadores cerca del hito
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {milestonePlayers.map(player => {
              const delta = 1000 - player.daysWithoutVictory
              const status = delta > 0
                ? `Faltan ${delta} dia${delta === 1 ? '' : 's'}`
                : `+${Math.abs(delta)} dia${Math.abs(delta) === 1 ? '' : 's'} sobre 1000`

              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between rounded-xl p-3"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div>
                    <span
                      className="font-medium"
                      style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface)' }}
                    >
                      {player.firstName} {player.lastName}
                    </span>
                    <p style={{ fontSize: '11px', color: 'var(--cp-on-surface-muted)' }}>
                      {status}
                    </p>
                  </div>
                  <span
                    className="font-bold"
                    style={{ fontSize: 'var(--cp-body-size)', color: getDaysColor(player.daysWithoutVictory) }}
                  >
                    {player.daysWithoutVictory}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Main Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        {/* Table Header */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--cp-surface-border)' }}
        >
          <h3
            className="font-semibold"
            style={{ fontSize: 'var(--cp-body-size)', color: 'var(--cp-on-surface)' }}
          >
            Dias sin Ganar
          </h3>
          <span style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-muted)' }}>
            {players.length} jugadores
          </span>
        </div>

        {/* Table Content */}
        {players.length === 0 ? (
          <div className="p-8 text-center">
            <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-body-size)' }}>
              No hay datos disponibles
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--cp-surface-border)' }}>
            {players.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  background: player.hasNeverWon ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                }}
              >
                {/* Position */}
                <div
                  className="w-6 text-center font-medium"
                  style={{
                    fontSize: 'var(--cp-caption-size)',
                    color: 'var(--cp-on-surface-muted)',
                  }}
                >
                  {index + 1}
                </div>

                {/* Photo */}
                <div className="relative w-9 h-9 flex-shrink-0 overflow-hidden rounded-full border border-white/10">
                  {player.photoUrl ? (
                    <Image
                      src={player.photoUrl}
                      alt={`${player.firstName} ${player.lastName}`}
                      fill
                      loading="lazy"
                      className="object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-xs font-semibold"
                      style={{
                        background: 'linear-gradient(135deg, #E53935, #f97316)',
                        color: 'white',
                      }}
                    >
                      {player.firstName.charAt(0)}
                      {player.lastName.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium truncate"
                    style={{
                      fontSize: 'var(--cp-caption-size)',
                      color: 'var(--cp-on-surface)',
                    }}
                  >
                    {player.firstName}
                  </p>
                  <p
                    className="truncate"
                    style={{
                      fontSize: '11px',
                      color: 'var(--cp-on-surface-muted)',
                    }}
                  >
                    {player.lastName}
                  </p>
                </div>

                {/* Days */}
                <div className="text-right">
                  {player.hasNeverWon ? (
                    <div className="flex flex-col items-end">
                      <span
                        className="font-medium"
                        style={{
                          fontSize: 'var(--cp-caption-size)',
                          color: 'var(--cp-on-surface-muted)',
                        }}
                      >
                        N/A
                      </span>
                      <span
                        className="italic"
                        style={{
                          fontSize: '10px',
                          color: 'var(--cp-on-surface-muted)',
                        }}
                      >
                        Nunca
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <span
                        className="font-bold"
                        style={{
                          fontSize: 'var(--cp-body-size)',
                          color: getDaysColor(player.daysWithoutVictory),
                        }}
                      >
                        {player.daysWithoutVictory}
                      </span>
                      {player.lastVictoryDate && (
                        <span
                          className="font-mono"
                          style={{
                            fontSize: '10px',
                            color: 'var(--cp-on-surface-muted)',
                          }}
                        >
                          {player.lastVictoryDate}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
