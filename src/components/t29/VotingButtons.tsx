'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { buildAuthHeaders } from '@/lib/client-auth'
import { toast } from 'react-toastify'

interface VotingButtonsProps {
  proposalId: number
  initialStats: {
    thumbsUp: number
    thumbsDown: number
    total: number
  }
  userVote?: 'thumbsUp' | 'thumbsDown' | null
  onVoteChange?: (newStats: { thumbsUp: number; thumbsDown: number; total: number }, userVote: 'thumbsUp' | 'thumbsDown' | null) => void
  disabled?: boolean
}

export function VotingButtons({ proposalId, initialStats, userVote, onVoteChange, disabled = false }: VotingButtonsProps) {
  const [stats, setStats] = useState(initialStats)
  const [currentUserVote, setCurrentUserVote] = useState<'thumbsUp' | 'thumbsDown' | null>(userVote || null)
  const [isVoting, setIsVoting] = useState(false)

  const handleVote = async (voteType: 'thumbsUp' | 'thumbsDown') => {
    if (isVoting || disabled) return

    try {
      setIsVoting(true)

      // If user is clicking the same vote type, remove their vote
      if (currentUserVote === voteType) {
        const response = await fetch(`/api/proposals/${proposalId}/votes`, {
          method: 'DELETE',
          headers: buildAuthHeaders()
        })

        if (!response.ok) {
          throw new Error('Error al eliminar voto')
        }

        const data = await response.json()
        setStats(data.stats)
        setCurrentUserVote(null)
        onVoteChange?.(data.stats, null)
      } else {
        // Add or change vote
        const response = await fetch(`/api/proposals/${proposalId}/votes`, {
          method: 'POST',
          headers: buildAuthHeaders({}, { includeJson: true }),
          body: JSON.stringify({ voteType })
        })

        if (!response.ok) {
          throw new Error('Error al votar')
        }

        const data = await response.json()
        setStats(data.stats)
        setCurrentUserVote(voteType)
        onVoteChange?.(data.stats, voteType)
      }
    } catch (error) {
      console.error('Error voting:', error)
      toast.error(error instanceof Error ? error.message : 'Error al votar')
    } finally {
      setIsVoting(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={() => handleVote('thumbsUp')}
        disabled={isVoting || disabled}
        className={`group flex items-center gap-1.5 text-sm font-semibold uppercase tracking-[0.2em] transition-colors ${
          currentUserVote === 'thumbsUp'
            ? 'text-[#7bdba5] drop-shadow'
            : 'text-[#d7c59a]/70 hover:text-[#7bdba5]'
        } ${isVoting || disabled ? 'cursor-not-allowed opacity-40' : ''}`}
      >
        <ThumbsUp className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
        <span className="text-xs font-medium text-[#d7c59a]/65 group-hover:text-inherit">
          {stats.thumbsUp}
        </span>
      </button>

      <button
        onClick={() => handleVote('thumbsDown')}
        disabled={isVoting || disabled}
        className={`group flex items-center gap-1.5 text-sm font-semibold uppercase tracking-[0.2em] transition-colors ${
          currentUserVote === 'thumbsDown'
            ? 'text-[#f38b7d] drop-shadow'
            : 'text-[#d7c59a]/70 hover:text-[#f38b7d]'
        } ${isVoting || disabled ? 'cursor-not-allowed opacity-40' : ''}`}
      >
        <ThumbsDown className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
        <span className="text-xs font-medium text-[#d7c59a]/65 group-hover:text-inherit">
          {stats.thumbsDown}
        </span>
      </button>
    </div>
  )
}
