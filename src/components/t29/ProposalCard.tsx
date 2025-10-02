'use client'

import { useState, useEffect } from 'react'
import { MessageSquareText } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { VotingButtons } from './VotingButtons'
import { CommentSection } from './CommentSection'
import { buildAuthHeaders } from '@/lib/client-auth'
import { useAuth } from '@/contexts/AuthContext'

interface Proposal {
  id: number
  title: string
  content: string
  imageUrl?: string | null
}

interface ProposalCardProps {
  proposal: Proposal
  isExpanded: boolean
  onToggle: () => void
}

export function ProposalCard({ proposal, isExpanded, onToggle }: ProposalCardProps) {
  const { user } = useAuth()
  const [voteStats, setVoteStats] = useState({ thumbsUp: 0, thumbsDown: 0, total: 0 })
  const [userVote, setUserVote] = useState<'thumbsUp' | 'thumbsDown' | null>(null)
  const [commentCount, setCommentCount] = useState(0)
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  useEffect(() => {
    fetchVoteStats()
    fetchCommentCount()
  }, [proposal.id])

  const fetchVoteStats = async () => {
    try {
      const response = await fetch(`/api/proposals/${proposal.id}/votes`, {
        headers: buildAuthHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        setVoteStats(data.stats)

        // Check if current user has voted
        const userVoteRecord = data.votes.find((vote: any) => vote.player.id === user?.id)
        setUserVote(userVoteRecord?.voteType || null)
      }
    } catch (error) {
      console.error('Error fetching vote stats:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const fetchCommentCount = async () => {
    try {
      const response = await fetch(`/api/proposals/${proposal.id}/comments`, {
        headers: buildAuthHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        setCommentCount(data.comments.length)
      }
    } catch (error) {
      console.error('Error fetching comment count:', error)
    }
  }


  const handleVoteChange = (newStats: typeof voteStats, newUserVote: 'thumbsUp' | 'thumbsDown' | null) => {
    setVoteStats(newStats)
    setUserVote(newUserVote)
  }

  const handleCommentCountChange = (count: number) => {
    setCommentCount(count)
  }

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-poker-card to-poker-card/80 border border-white/20 hover:border-poker-red/50 transition-all duration-300 hover:shadow-lg hover:shadow-poker-red/20">
      {/* Baseball Card Header */}
      <div className="bg-gradient-to-r from-poker-red/20 to-poker-red/10 p-4 border-b border-white/10">
        <h3 className="text-white font-bold text-lg mb-3 line-clamp-2">
          {proposal.title}
        </h3>

        {/* Stats Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Comment Count */}
            <div className="flex items-center gap-1 text-white/70">
              <MessageSquareText className="w-4 h-4" />
              <span className="text-sm font-medium">{commentCount}</span>
            </div>

            {/* Vote Stats */}
            {!isLoadingStats && (
              <VotingButtons
                proposalId={proposal.id}
                initialStats={voteStats}
                userVote={userVote}
                onVoteChange={handleVoteChange}
              />
            )}
          </div>

          {/* Expand Button */}
          <button
            onClick={onToggle}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isExpanded
                ? 'bg-poker-red text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {isExpanded ? 'Cerrar' : 'Detalles'}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <>
          {/* Proposal Content */}
          <div className="p-5 border-b border-white/10 space-y-4">
            <p className="text-white/85 leading-relaxed whitespace-pre-line">
              {proposal.content}
            </p>

            {/* Image Display */}
            {proposal.imageUrl && (
              <div className="mt-4">
                <img
                  src={proposal.imageUrl}
                  alt="Imagen de la propuesta"
                  className="w-full h-auto rounded-lg border border-white/20 cursor-pointer hover:border-white/40 transition-colors"
                  style={{ maxHeight: '400px', objectFit: 'contain' }}
                  onClick={() => {
                    // Open image in new tab for full view
                    window.open(proposal.imageUrl, '_blank')
                  }}
                />
                <p className="text-xs text-white/50 mt-2 text-center">
                  Click para ver en tamaño completo
                </p>
              </div>
            )}
          </div>

          {/* Comments Section */}
          <CommentSection
            proposalId={proposal.id}
            isExpanded={isExpanded}
            onCommentCountChange={handleCommentCountChange}
          />
        </>
      )}
    </Card>
  )
}