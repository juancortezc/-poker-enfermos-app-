'use client'

import { Card } from '@/components/ui/card'
import { CalendarX } from 'lucide-react'
import Image from 'next/image'

interface PlayerWithVictoryData {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string | null
  lastVictoryDate?: string | null
  daysWithoutVictory: number
  hasNeverWon: boolean
}

interface DaysWithoutVictoryTableProps {
  players: PlayerWithVictoryData[]
  tournamentNumber: number
}

const getDaysColorClass = (days: number) => {
  if (days <= 60) return 'text-green-400'
  if (days <= 250) return 'text-yellow-300'
  if (days <= 500) return 'text-orange-400'
  if (days <= 900) return 'text-pink-400'
  return 'text-red-400'
}

const formatVictoryDate = (value?: string | null) => {
  if (!value) return '—'
  return value
}

export default function DaysWithoutVictoryTable({
  players,
  tournamentNumber
}: DaysWithoutVictoryTableProps) {
  if (players.length === 0) {
    return (
      <div className="mx-auto max-w-md">
        <Card className="admin-card p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-700/50">
              <CalendarX className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-white">Sin Datos de Victorias</h3>
            <p className="text-center text-gray-400">
              No se encontraron datos de victorias para este torneo.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full">
      <Card className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-gray-850 to-gray-950">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3">
          <h3 className="flex items-center gap-2 text-base font-semibold text-white">
            <CalendarX className="h-5 w-5 text-poker-red" />
            Días sin Ganar
          </h3>
        </div>

        <div className="overflow-hidden">
          <table className="w-full table-fixed text-[13px] sm:text-sm">
            <thead className="bg-white/5 text-[10px] uppercase tracking-[0.3em] text-gray-300">
              <tr>
                <th className="w-12 px-2 py-3 text-center">#</th>
                <th className="px-2 py-3 text-left">Jugador</th>
                <th className="w-28 px-2 py-3 text-center">Días</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => (
                <tr
                  key={player.id}
                  className={`border-t border-white/10 text-xs sm:text-sm ${
                    player.hasNeverWon ? 'bg-white/5' : 'bg-transparent'
                  }`}
                >
                  <td className="px-2 py-3 text-center font-semibold text-white/80">
                    {index + 1}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-gray-700">
                        {player.photoUrl ? (
                          <Image
                            src={player.photoUrl}
                            alt={`${player.firstName} ${player.lastName}`}
                            width={36}
                            height={36}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-poker-red to-orange-500">
                            <span className="text-xs font-bold text-white">
                              {player.firstName.charAt(0)}
                              {player.lastName.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate text-sm font-semibold text-white">
                          {player.firstName}
                        </span>
                        <span className="truncate text-xs text-white/70">
                          {player.lastName}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center">
                    {player.hasNeverWon ? (
                      <div className="flex flex-col items-center text-[11px] text-gray-400">
                        <span className="font-semibold text-gray-500">N/A</span>
                        <span className="mt-1 italic">Nunca</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className={`text-sm font-black ${getDaysColorClass(player.daysWithoutVictory)}`}>
                          {player.daysWithoutVictory}
                        </span>
                        <span className="mt-1 text-[11px] font-mono text-gray-500">
                          {formatVictoryDate(player.lastVictoryDate)}
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
