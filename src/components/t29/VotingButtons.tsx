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
    <div className="flex items-center gap-3">
      <button
        onClick={() => handleVote('thumbsUp')}
        disabled={isVoting}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          currentUserVote === 'thumbsUp'
            ? 'bg-green-500 text-white'
            : 'bg-white/10 text-white/70 hover:bg-green-500/20 hover:text-green-400'
        } ${isVoting ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <ThumbsUp className="w-4 h-4" />
        <span>{stats.thumbsUp}</span>
      </button>

      <button
        onClick={() => handleVote('thumbsDown')}
        disabled={isVoting}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          currentUserVote === 'thumbsDown'
            ? 'bg-red-500 text-white'
            : 'bg-white/10 text-white/70 hover:bg-red-500/20 hover:text-red-400'
        } ${isVoting ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <ThumbsDown className="w-4 h-4" />
        <span>{stats.thumbsDown}</span>
      </button>
    </div>
  )
}