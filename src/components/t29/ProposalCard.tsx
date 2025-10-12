'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageSquareText } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { VotingButtons } from './VotingButtons'
import { CommentSection } from './CommentSection'
import { buildAuthHeaders } from '@/lib/client-auth'
import { useAuth } from '@/contexts/AuthContext'

interface Proposal {
  id: number
  title: string
  objective: string
  situation: string
  proposal: string
  imageUrl?: string | null
}

interface ProposalCardProps {
  proposal: Proposal
  isExpanded: boolean
  onToggle: () => void
  votingClosed?: boolean
}

export function ProposalCard({ proposal, isExpanded, onToggle, votingClosed = false }: ProposalCardProps) {
  const { user } = useAuth()
  const [voteStats, setVoteStats] = useState({ thumbsUp: 0, thumbsDown: 0, total: 0 })
  const [userVote, setUserVote] = useState<'thumbsUp' | 'thumbsDown' | null>(null)
  const [commentCount, setCommentCount] = useState(0)
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  const fetchVoteStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/proposals/${proposal.id}/votes`, {
        headers: buildAuthHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        setVoteStats(data.stats)

        // Check if current user has voted
        const userVoteRecord = data.votes.find((vote: { player: { id: string }; voteType: string }) => vote.player.id === user?.id)
        setUserVote(userVoteRecord?.voteType || null)
      }
    } catch (error) {
      console.error('Error fetching vote stats:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }, [proposal.id, user?.id])

  const fetchCommentCount = useCallback(async () => {
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
  }, [proposal.id])

  useEffect(() => {
    fetchVoteStats()
    fetchCommentCount()
  }, [proposal.id, fetchVoteStats, fetchCommentCount])

  const handleVoteChange = (newStats: typeof voteStats, newUserVote: 'thumbsUp' | 'thumbsDown' | null) => {
    setVoteStats(newStats)
    setUserVote(newUserVote)
  }

  const handleCommentCountChange = (count: number) => {
    setCommentCount(count)
  }

  return (
    <Card className="noir-card overflow-hidden border border-[#e0b66c]/15 bg-[rgba(24,14,10,0.9)] transition-all duration-500 hover:-translate-y-1 hover:border-[#e0b66c]/45 hover:shadow-[0_28px_70px_rgba(11,6,3,0.6)]">
      {/* Header */}
      <div className="border-b border-[#e0b66c]/12 px-5 py-4 bg-[radial-gradient(circle_at_top,_rgba(224,182,108,0.12),_transparent_70%)]">
        <h3 className="mb-2 line-clamp-2 font-heading text-lg uppercase tracking-[0.2em] text-[#f3e6c5]">
          {proposal.title}
        </h3>

        {/* Stats Row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            {/* Comment Count */}
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-[#d7c59a]/75">
              <MessageSquareText className="h-4 w-4 text-[#e0b66c]" />
              <span className="text-[#f3e6c5]">{commentCount}</span>
              <span className="text-[#d7c59a]/55">Comentarios</span>
            </div>

            {/* Vote Stats */}
            {!isLoadingStats && (
              <VotingButtons
                proposalId={proposal.id}
                initialStats={voteStats}
                userVote={userVote}
                onVoteChange={handleVoteChange}
                disabled={votingClosed}
              />
            )}
          </div>

          {/* Expand Button */}
          <button
            onClick={onToggle}
            className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] transition-all ${
              isExpanded
                ? 'bg-[linear-gradient(135deg,rgba(224,182,108,0.9),rgba(169,68,28,0.85))] text-[#1f1410] shadow-[0_18px_40px_rgba(224,182,108,0.28)]'
                : 'border border-[#e0b66c]/25 text-[#d7c59a]/80 hover:border-[#e0b66c]/45 hover:text-[#f3e6c5]'
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
          <div className="space-y-4 border-b border-[#e0b66c]/12 px-5 pb-5 pt-4">
            {/* Objetivo */}
            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-[0.26em] text-[#e0b66c]">
                Objetivo
              </h4>
              <p className="text-sm leading-relaxed text-[#f3e6c5]/85">
                {proposal.objective}
              </p>
            </div>

            {/* Situación a modificar */}
            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-[0.26em] text-[#e0b66c]">
                Situación a modificar
              </h4>
              <p className="whitespace-pre-line text-sm leading-relaxed text-[#f3e6c5]/85">
                {proposal.situation}
              </p>
            </div>

            {/* Propuesta */}
            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-[0.26em] text-[#e0b66c]">
                Propuesta
              </h4>
              <p className="whitespace-pre-line text-sm leading-relaxed text-[#f3e6c5]/85">
                {proposal.proposal}
              </p>
            </div>

            {/* Image Display */}
            {proposal.imageUrl && (
              <div className="mt-4">
                <img
                  src={proposal.imageUrl}
                  alt="Imagen de la propuesta"
                  className="h-auto w-full cursor-pointer rounded-lg border border-[#e0b66c]/20 transition-all hover:border-[#e0b66c]/40"
                  style={{ maxHeight: '400px', objectFit: 'contain' }}
                  onClick={() => {
                    // Open image in new tab for full view
                    window.open(proposal.imageUrl, '_blank')
                  }}
                />
                <p className="mt-2 text-center text-xs tracking-[0.2em] text-[#d7c59a]/60">
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
            disabled={votingClosed}
          />
        </>
      )}
    </Card>
  )
}
