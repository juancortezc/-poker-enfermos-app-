'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card } from '@/components/ui/card'
import { Target, Calendar, Users, ChevronDown, ChevronUp } from 'lucide-react'
import Image from 'next/image'

interface Player {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string | null
}

interface Elimination {
  id: string
  position: number
  eliminatedPlayerId: string
  eliminatorPlayerId?: string | null
  points: number
  eliminatedPlayer: Player
  eliminatorPlayer?: Player | null
}

interface GameDate {
  id: number
  dateNumber: number
  scheduledDate: string
  status: string
}

interface Tournament {
  id: number
  number: number
  name: string
  gameDates: GameDate[]
}

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Error fetching data')
  return response.json()
}

interface EliminationsTabProps {
  tournamentId: number
}

export default function EliminationsTab({ tournamentId }: EliminationsTabProps) {
  const [expandedDateId, setExpandedDateId] = useState<number | null>(null)

  // Fetch tournament with game dates
  const { data: tournament, isLoading: tournamentLoading } = useSWR<Tournament>(
    `/api/tournaments/${tournamentId}`,
    fetcher
  )

  // Fetch eliminations for expanded date
  const { data: eliminations, isLoading: eliminationsLoading } = useSWR<Elimination[]>(
    expandedDateId ? `/api/eliminations/game-date/${expandedDateId}` : null,
    fetcher
  )

  if (tournamentLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-2xl bg-white/5"
          />
        ))}
      </div>
    )
  }

  if (!tournament) {
    return (
      <Card className="admin-card p-8 text-center">
        <p className="text-white/70">No se encontró información del torneo.</p>
      </Card>
    )
  }

  const completedDates = tournament.gameDates.filter(gd => gd.status === 'completed')

  if (completedDates.length === 0) {
    return (
      <Card className="admin-card p-8 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-700/50">
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-white">Sin fechas completadas</h3>
          <p className="text-gray-400 text-sm">
            No hay fechas finalizadas con eliminaciones registradas.
          </p>
        </div>
      </Card>
    )
  }

  const handleToggleDate = (dateId: number) => {
    setExpandedDateId(expandedDateId === dateId ? null : dateId)
  }

  return (
    <div className="space-y-4">
      {completedDates.map((gameDate) => {
        const isExpanded = expandedDateId === gameDate.id
        const dateEliminations = isExpanded ? eliminations || [] : []
        const isLoadingEliminations = isExpanded && eliminationsLoading

        return (
          <div
            key={gameDate.id}
            className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden transition-all"
          >
            {/* Header */}
            <button
              onClick={() => handleToggleDate(gameDate.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-poker-red/20">
                  <Calendar className="h-5 w-5 text-poker-red" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-white">
                    Fecha #{gameDate.dateNumber}
                  </h3>
                  <p className="text-xs text-white/60">
                    {new Date(gameDate.scheduledDate).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-white/60" />
              ) : (
                <ChevronDown className="h-5 w-5 text-white/60" />
              )}
            </button>

            {/* Eliminations List */}
            {isExpanded && (
              <div className="border-t border-white/10 p-4 space-y-3">
                {isLoadingEliminations ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="h-16 animate-pulse rounded-xl bg-white/5"
                      />
                    ))}
                  </div>
                ) : dateEliminations.length === 0 ? (
                  <div className="py-8 text-center">
                    <Target className="mx-auto h-8 w-8 text-white/40 mb-2" />
                    <p className="text-sm text-white/60">
                      No hay eliminaciones registradas para esta fecha
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dateEliminations.map((elimination) => (
                      <div
                        key={elimination.id}
                        className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors"
                      >
                        {/* Position */}
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-poker-red/20 text-xs font-bold text-poker-red">
                          #{elimination.position}
                        </div>

                        {/* Eliminated Player */}
                        <div className="flex flex-1 items-center gap-2">
                          {elimination.eliminatedPlayer.photoUrl ? (
                            <div className="relative h-8 w-8 overflow-hidden rounded-full border border-white/20">
                              <Image
                                src={elimination.eliminatedPlayer.photoUrl}
                                alt={`${elimination.eliminatedPlayer.firstName} ${elimination.eliminatedPlayer.lastName}`}
                                fill
                                sizes="32px"
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                              <Users className="h-4 w-4 text-white/60" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {elimination.eliminatedPlayer.firstName} {elimination.eliminatedPlayer.lastName}
                            </p>
                            <p className="text-xs text-white/50">Eliminado</p>
                          </div>
                        </div>

                        {/* Eliminator */}
                        {elimination.eliminatorPlayer ? (
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-xs text-white/50">Eliminado por</p>
                              <p className="text-sm font-medium text-white">
                                {elimination.eliminatorPlayer.firstName} {elimination.eliminatorPlayer.lastName}
                              </p>
                            </div>
                            {elimination.eliminatorPlayer.photoUrl ? (
                              <div className="relative h-8 w-8 overflow-hidden rounded-full border border-white/20">
                                <Image
                                  src={elimination.eliminatorPlayer.photoUrl}
                                  alt={`${elimination.eliminatorPlayer.firstName} ${elimination.eliminatorPlayer.lastName}`}
                                  fill
                                  sizes="32px"
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                                <Users className="h-4 w-4 text-white/60" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-white/40 italic">Sin eliminador</p>
                        )}

                        {/* Points */}
                        <div className="text-right">
                          <p className="text-xs text-white/50">Puntos</p>
                          <p className="text-sm font-bold text-poker-red">{elimination.points}</p>
                        </div>
                      </div>
                    ))}

                    <div className="pt-2 text-center text-xs text-white/50">
                      {dateEliminations.length} eliminación{dateEliminations.length !== 1 ? 'es' : ''} registrada{dateEliminations.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-sm text-white/70">
        {completedDates.length} fecha{completedDates.length !== 1 ? 's' : ''} completada{completedDates.length !== 1 ? 's' : ''}.
      </div>
    </div>
  )
}
