'use client'

import { Card } from '@/components/ui/card'

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

  // Componente para el avatar alienígena
  const AlienAvatar = () => (
    <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-8 h-8 md:w-12 md:h-12 text-black">
        <path
          d="M50 20c-16.5 0-30 13.5-30 30 0 8.3 3.4 15.8 8.9 21.2L50 85l21.1-13.8c5.5-5.4 8.9-12.9 8.9-21.2 0-16.5-13.5-30-30-30z"
          fill="currentColor"
        />
        <circle cx="40" cy="45" r="4" fill="white" />
        <circle cx="60" cy="45" r="4" fill="white" />
      </svg>
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
            <AlienAvatar />
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
          <div className="bg-poker-red text-white px-2 md:px-4 py-1 md:py-2 rounded-md text-xs md:text-sm font-bold tracking-wide">
            ELIMINACIONES
          </div>
        </div>

        {/* Columna Hijo */}
        <div className="text-center">
          <div className="text-white text-xs md:text-sm font-medium mb-2 md:mb-3 tracking-wide">
            Hijo
          </div>
          <div className="flex flex-col items-center">
            <AlienAvatar />
            <div className="text-white font-bold text-sm md:text-lg mt-1 md:mt-2 tracking-wide">
              {getPlayerName(childPlayer)}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}