'use client'

import { useState } from 'react'
import Image from 'next/image'
import ParentChildDetailModal from './ParentChildDetailModal'

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
  tournamentId: number
}

export default function ParentChildCard({ relation, index, tournamentId }: ParentChildCardProps) {
  const { parentPlayer, childPlayer, eliminationCount } = relation
  const [isModalOpen, setIsModalOpen] = useState(false)

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

  const PlayerAvatar = ({ player }: { player: Player }) => (
    <div className="relative h-12 w-12 md:h-14 md:w-14">
      <Image
        src={getPlayerImage(player)}
        alt={getPlayerName(player)}
        fill
        sizes="(max-width: 768px) 48px, 64px"
        className="rounded-full border border-[#e0b66c]/35 object-cover shadow-[0_6px_16px_rgba(11,6,3,0.45)]"
      />
    </div>
  )

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`
          relative w-full rounded-[28px] border border-[#e0b66c]/18 bg-[rgba(26,17,13,0.92)]
          px-4 py-4 md:px-6 md:py-6 mb-4 text-left
          shadow-[0_18px_40px_rgba(11,6,3,0.5)] backdrop-blur-sm
          transition-all duration-300 hover:-translate-y-1 hover:border-[#e0b66c]/35 hover:shadow-[0_24px_60px_rgba(11,6,3,0.55)]
          focus:outline-none focus:ring-2 focus:ring-[#e0b66c]/50 focus:ring-offset-0
          animate-stagger animate-stagger-${index + 1}
        `}
      >
      <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_top,rgba(224,182,108,0.16),transparent_58%)]" />

      <div className="relative grid grid-cols-3 items-center gap-2 md:gap-6">
        <div className="text-center">
          <span className="text-[10px] uppercase tracking-[0.24em] text-[#d7c59a]/70">
            Padre
          </span>
          <div className="mt-2 flex flex-col items-center md:mt-3">
            <PlayerAvatar player={parentPlayer} />
            <div className="mt-2 text-sm font-semibold tracking-[0.08em] text-[#f3e6c5] md:text-base">
              {getPlayerName(parentPlayer)}
            </div>
          </div>
        </div>

        <div className="text-center">
          <div className="text-4xl font-bold text-[#f3e6c5] md:text-5xl">
            {eliminationCount}
          </div>
          <div className="mt-1 inline-block rounded-full border border-[#e0b66c]/45 bg-[linear-gradient(135deg,rgba(224,182,108,0.35),rgba(169,68,28,0.3))] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1f1410] shadow-[0_0_18px_rgba(224,182,108,0.35)] md:mt-2 md:px-4 md:text-xs">
            Eliminaciones
          </div>
        </div>

        <div className="text-center">
          <span className="text-[10px] uppercase tracking-[0.24em] text-[#d7c59a]/70">
            Hijo
          </span>
          <div className="mt-2 flex flex-col items-center md:mt-3">
            <PlayerAvatar player={childPlayer} />
            <div className="mt-2 text-sm font-semibold tracking-[0.08em] text-[#f3e6c5] md:text-base">
              {getPlayerName(childPlayer)}
            </div>
          </div>
        </div>
      </div>
      </button>

      <ParentChildDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tournamentId={tournamentId}
        relationId={relation.id}
      />
    </>
  )
}
