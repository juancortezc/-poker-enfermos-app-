'use client'

import { Card } from '@/components/ui/card'
import { Trophy, CalendarX } from 'lucide-react'
import Image from 'next/image'

interface PlayerWithVictoryData {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  lastVictoryDate?: string | null;
  daysWithoutVictory: number;
  hasNeverWon: boolean;
}

interface DaysWithoutVictoryTableProps {
  players: PlayerWithVictoryData[];
  tournamentNumber: number;
}

export default function DaysWithoutVictoryTable({ 
  players, 
  tournamentNumber 
}: DaysWithoutVictoryTableProps) {
  if (players.length === 0) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="admin-card p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center">
              <CalendarX className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-white">
              Sin Datos de Victorias
            </h3>
            <p className="text-gray-400 text-center">
              No se encontraron datos de victorias para este torneo.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const renderPlayerRow = (player: PlayerWithVictoryData, index: number) => {
    return (
      <tr 
        key={player.id}
        className={`
          border-b border-gray-700/50
          ${player.hasNeverWon ? 'bg-gray-800/30' : 'bg-transparent'}
        `}
      >
        <td className="px-4 py-3 border-r border-gray-600 bg-inherit">
          <div className="flex items-center gap-2">
            <span className="text-gray-300 font-mono text-sm">
              {index + 1}
            </span>
            {index === 0 && !player.hasNeverWon && (
              <Trophy className="w-4 h-4 text-poker-red" />
            )}
          </div>
        </td>
        <td className="px-4 py-3 border-r border-gray-600 bg-inherit">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
              {player.photoUrl ? (
                <Image
                  src={player.photoUrl}
                  alt={`${player.firstName} ${player.lastName}`}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-poker-red to-orange-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {player.firstName.charAt(0)}{player.lastName.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <div>
              <p className="text-white font-medium">
                {player.firstName} {player.lastName}
              </p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-center bg-inherit">
          <div className="flex flex-col items-center">
            {player.hasNeverWon ? (
              <>
                <span className="text-gray-500 italic text-sm">N/A</span>
                <span className="text-gray-500 italic text-xs mt-1">Nunca</span>
              </>
            ) : (
              <>
                <span className={`
                  font-bold text-lg
                  ${player.daysWithoutVictory > 100 ? 'text-red-400' : 
                    player.daysWithoutVictory > 60 ? 'text-orange-400' : 
                    player.daysWithoutVictory > 30 ? 'text-yellow-400' : 
                    'text-green-400'}
                `}>
                  {player.daysWithoutVictory}
                </span>
                <span className="text-gray-400 font-mono text-xs mt-1">
                  {player.lastVictoryDate}
                </span>
              </>
            )}
          </div>
        </td>
      </tr>
    )
  }

  const renderPlayerCard = (player: PlayerWithVictoryData, index: number) => {
    return (
      <div
        key={player.id}
        className={`rounded-lg border border-gray-700 bg-gradient-to-br from-gray-900 to-gray-850 p-4 shadow-sm ${
          player.hasNeverWon ? 'ring-1 ring-orange-500/20' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
              {player.photoUrl ? (
                <Image
                  src={player.photoUrl}
                  alt={`${player.firstName} ${player.lastName}`}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-poker-red to-orange-500 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {player.firstName.charAt(0)}{player.lastName.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 font-mono">#{index + 1}</span>
                {index === 0 && !player.hasNeverWon && (
                  <Trophy className="w-4 h-4 text-poker-red" />
                )}
              </div>
              <p className="text-white font-semibold text-sm">
                {player.firstName} {player.lastName}
              </p>
            </div>
          </div>
          <div className="text-right">
            {player.hasNeverWon ? (
              <div className="flex flex-col items-end">
                <span className="text-gray-500 italic text-sm">N/A</span>
                <span className="text-gray-500 italic text-xs mt-1">Nunca</span>
              </div>
            ) : (
              <div className="flex flex-col items-end">
                <span className={`
                  text-lg font-bold
                  ${player.daysWithoutVictory > 100 ? 'text-red-400' : 
                    player.daysWithoutVictory > 60 ? 'text-orange-400' : 
                    player.daysWithoutVictory > 30 ? 'text-yellow-400' : 
                    'text-green-400'}
                `}>
                  {player.daysWithoutVictory}
                </span>
                <span className="text-gray-400 font-mono text-xs mt-1">
                  {player.lastVictoryDate}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <Card className="bg-gradient-to-b from-gray-800 to-gray-900 border-2 border-gray-700 rounded-lg overflow-hidden">
        <div className="bg-gray-800/50 px-4 py-3 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <CalendarX className="w-5 h-5 text-poker-red" />
            Días sin Ganar - Estadística Global
          </h3>
        </div>

        <div className="hidden sm:block overflow-x-auto overflow-y-visible bg-gradient-to-b from-gray-800 to-gray-900">
          <table className="w-full min-w-[600px] bg-gradient-to-b from-gray-800 to-gray-900">
            <thead className="bg-gray-700/50 sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 text-white font-semibold border-r border-gray-600 bg-gray-700/50">#</th>
                <th className="text-left px-4 py-3 text-white font-semibold border-r border-gray-600 bg-gray-700/50">Jugador</th>
                <th className="text-center px-4 py-3 text-white font-semibold bg-gray-700/50">Días sin Ganar</th>
              </tr>
            </thead>
            <tbody className="bg-gradient-to-b from-gray-800 to-gray-900">
              {players.map((player, index) => renderPlayerRow(player, index))}
            </tbody>
          </table>
        </div>

        <div className="sm:hidden bg-gradient-to-b from-gray-800 to-gray-900 p-3 space-y-3">
          {players.map((player, index) => renderPlayerCard(player, index))}
        </div>
      </Card>
    </div>
  )
}
