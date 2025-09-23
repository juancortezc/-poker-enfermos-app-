'use client'

interface Player {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string
  isActive: boolean
}

interface ChampionData {
  player: Player
  championshipsCount: number
  tournamentNumbers: number[]
}

interface ChampionCardProps {
  champion: ChampionData
  rank: number
  isTopThree: boolean
}

export default function ChampionCard({ champion, rank, isTopThree }: ChampionCardProps) {
  const { player, championshipsCount, tournamentNumbers } = champion

  const formatTournamentNumbers = (numbers: number[]) => {
    if (numbers.length <= 5) {
      return `T${numbers.join(', T')}`
    }
    // Si hay muchos torneos, mostrar los primeros y "..."
    const first = numbers.slice(0, 4)
    return `T${first.join(', T')}, +${numbers.length - 4} más`
  }

  const getPlayerName = () => {
    return `${player.firstName} ${player.lastName}`
  }

  const cardSizeClass = isTopThree 
    ? 'h-48' // Cards grandes para top 3
    : 'h-36' // Cards pequeñas para el resto

  const getRankColor = () => {
    switch (rank) {
      case 1: return 'text-yellow-500 border-yellow-500/30'
      case 2: return 'text-gray-400 border-gray-400/30'
      case 3: return 'text-orange-500 border-orange-500/30'
      default: return 'text-poker-red border-poker-red/30'
    }
  }

  return (
    <div className={`
      bg-poker-card border-2 rounded-lg p-4 shadow-lg hover:shadow-xl transition-all duration-300
      ${cardSizeClass} ${getRankColor()}
      ${!player.isActive ? 'opacity-75' : ''}
    `}>
      <div className="flex flex-col h-full">
        {/* Header con ranking */}
        <div className="flex items-center justify-between mb-2">
          <div className={`
            text-sm font-bold px-2 py-1 rounded
            ${rank <= 3 ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20' : 'bg-poker-red/20'}
          `}>
            #{rank}
          </div>
          {!player.isActive && (
            <div className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
              Histórico
            </div>
          )}
        </div>

        {/* Nombre del jugador */}
        <div className="mb-2">
          <h3 className={`
            font-bold leading-tight
            ${isTopThree ? 'text-lg' : 'text-base'}
            ${rank <= 3 ? 'text-yellow-400' : 'text-white'}
          `}>
            {getPlayerName()}
          </h3>
        </div>

        {/* Cantidad de campeonatos */}
        <div className="mb-2 flex-grow">
          <div className={`
            text-center p-2 rounded-lg bg-black/30
            ${isTopThree ? 'text-2xl' : 'text-lg'}
          `}>
            <div className="font-bold text-poker-red">
              {championshipsCount}
            </div>
            <div className={`
              text-poker-muted
              ${isTopThree ? 'text-sm' : 'text-xs'}
            `}>
              {championshipsCount === 1 ? 'Campeonato' : 'Campeonatos'}
            </div>
          </div>
        </div>

        {/* Números de torneos */}
        <div className="mt-auto">
          <div className={`
            text-center px-2 py-1 bg-gray-800/50 rounded text-poker-muted
            ${isTopThree ? 'text-xs' : 'text-xs'}
          `}>
            {formatTournamentNumbers(tournamentNumbers)}
          </div>
        </div>
      </div>
    </div>
  )
}