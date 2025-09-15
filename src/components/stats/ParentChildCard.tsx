'use client'

import { Card } from '@/components/ui/card'
import Image from 'next/image'

interface Player {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string | null
  role: string
}

interface ParentChildRelation {
  id: number
  eliminationCount: number
  firstElimination: string
  lastElimination: string
  parentPlayer: Player
  childPlayer: Player
}

interface ParentChildCardProps {
  relation: ParentChildRelation
  index: number
}

export default function ParentChildCard({ relation, index }: ParentChildCardProps) {
  const { parentPlayer, childPlayer, eliminationCount } = relation

  const getPlayerName = (player: Player) => {
    return player.firstName.toUpperCase()
  }

  const getPlayerImage = (player: Player) => {
    if (player.photoUrl) {
      return player.photoUrl
    }
    // Default placeholder image
    return '/icons/user-circle.svg'
  }

  // Componente para el avatar con foto real
  const PlayerAvatar = ({ player }: { player: Player }) => (
    <div className="relative w-12 h-12 md:w-16 md:h-16">
      <Image
        src={getPlayerImage(player)}
        alt={getPlayerName(player)}
        fill
        className="rounded-full object-cover border-2 border-white"
      />
    </div>
  )

  return (
    <div className={`
      bg-gray-800 border-2 border-poker-red rounded-lg p-4 md:p-6 mb-4
      animate-stagger animate-stagger-${index + 1}
      transition-all duration-300
    `}>
      {/* Layout horizontal: Padre | Eliminaciones | Hijo */}
      <div className="grid grid-cols-3 items-center gap-2 md:gap-6">
        
        {/* Columna Padre */}
        <div className="text-center">
          <div className="text-white text-xs md:text-sm font-medium mb-2 md:mb-3 tracking-wide">
            Padre
          </div>
          <div className="flex flex-col items-center">
            <PlayerAvatar player={parentPlayer} />
            <div className="text-white font-bold text-sm md:text-lg mt-1 md:mt-2 tracking-wide">
              {getPlayerName(parentPlayer)}
            </div>
          </div>
        </div>

        {/* Columna Central - Eliminaciones */}
        <div className="text-center">
          <div className="text-white text-4xl md:text-6xl font-bold mb-1 md:mb-2">
            {eliminationCount}
          </div>
          <div className="bg-poker-red text-white px-1 md:px-3 py-1 md:py-2 rounded-md text-[10px] md:text-xs font-bold tracking-wide">
            ELIMINACIONES
          </div>
        </div>

        {/* Columna Hijo */}
        <div className="text-center">
          <div className="text-white text-xs md:text-sm font-medium mb-2 md:mb-3 tracking-wide">
            Hijo
          </div>
          <div className="flex flex-col items-center">
            <PlayerAvatar player={childPlayer} />
            <div className="text-white font-bold text-sm md:text-lg mt-1 md:mt-2 tracking-wide">
              {getPlayerName(childPlayer)}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}