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

  const getPlayerImage = (player: Player) => {
    if (player.photoUrl) {
      return player.photoUrl
    }
    // Default placeholder image
    return '/icons/user-circle.svg'
  }

  const getPlayerName = (player: Player) => {
    return `${player.firstName} ${player.lastName}`
  }

  return (
    <Card className={`
      admin-card p-4 mb-4
      animate-stagger animate-stagger-${index + 1}
      transition-all duration-300 hover:scale-105
    `}>
      {/* Header con "PADRE" */}
      <div className="text-center mb-4">
        <h3 className="text-sm font-bold text-poker-red uppercase tracking-wide">
          PADRE
        </h3>
      </div>

      {/* Padre */}
      <div className="flex flex-col items-center mb-4">
        <div className="relative w-16 h-16 mb-2">
          <Image
            src={getPlayerImage(parentPlayer)}
            alt={getPlayerName(parentPlayer)}
            fill
            className="rounded-full object-cover border-2 border-poker-red"
          />
        </div>
        <span className="text-white font-semibold text-center text-sm">
          {getPlayerName(parentPlayer)}
        </span>
      </div>

      {/* Flecha y eliminaciones */}
      <div className="flex items-center justify-center mb-4">
        <div className="text-center">
          <div className="text-2xl mb-1">↓</div>
          <div className="bg-poker-red text-white px-3 py-1 rounded-full text-sm font-bold">
            {eliminationCount} ELIMINACIONES
          </div>
        </div>
      </div>

      {/* Hijo */}
      <div className="flex flex-col items-center mb-4">
        <div className="relative w-16 h-16 mb-2">
          <Image
            src={getPlayerImage(childPlayer)}
            alt={getPlayerName(childPlayer)}
            fill
            className="rounded-full object-cover border-2 border-gray-400"
          />
        </div>
        <span className="text-white font-semibold text-center text-sm">
          {getPlayerName(childPlayer)}
        </span>
      </div>

      {/* Footer con "HIJO" */}
      <div className="text-center">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">
          HIJO
        </h3>
      </div>
    </Card>
  )
}