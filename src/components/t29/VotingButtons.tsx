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
}

export function VotingButtons({ proposalId, initialStats, userVote, onVoteChange }: VotingButtonsProps) {
  const [stats, setStats] = useState(initialStats)
  const [currentUserVote, setCurrentUserVote] = useState<'thumbsUp' | 'thumbsDown' | null>(userVote || null)
  const [isVoting, setIsVoting] = useState(false)

  const handleVote = async (voteType: 'thumbsUp' | 'thumbsDown') => {
    if (isVoting) return

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
        disabled={isVoting}
        className={`group flex items-center gap-1.5 text-sm font-semibold tracking-wide transition-colors ${
          currentUserVote === 'thumbsUp'
            ? 'text-emerald-300 drop-shadow'
            : 'text-white/60 hover:text-emerald-200'
        } ${isVoting ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        <ThumbsUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
        <span className="text-xs font-medium text-white/60 group-hover:text-inherit">
          {stats.thumbsUp}
        </span>
      </button>

      <button
        onClick={() => handleVote('thumbsDown')}
        disabled={isVoting}
        className={`group flex items-center gap-1.5 text-sm font-semibold tracking-wide transition-colors ${
          currentUserVote === 'thumbsDown'
            ? 'text-rose-300 drop-shadow'
            : 'text-white/60 hover:text-rose-300'
        } ${isVoting ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        <ThumbsDown className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
        <span className="text-xs font-medium text-white/60 group-hover:text-inherit">
          {stats.thumbsDown}
        </span>
      </button>
    </div>
  )
}
