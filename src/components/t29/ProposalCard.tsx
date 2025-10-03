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
}

export function ProposalCard({ proposal, isExpanded, onToggle }: ProposalCardProps) {
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
    <Card className="overflow-hidden border border-white/12 bg-gradient-to-br from-[#1b1d2f] via-[#181a2c] to-[#121321] backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:border-poker-red/60 hover:shadow-[0_24px_60px_rgba(255,93,143,0.25)] shadow-[0_18px_40px_rgba(11,12,32,0.45)]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-white/8 via-transparent to-transparent">
        <h3 className="text-white text-lg font-semibold tracking-tight mb-2 line-clamp-2">
          {proposal.title}
        </h3>

        {/* Stats Row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            {/* Comment Count */}
            <div className="flex items-center gap-2 text-xs font-medium text-white/60 tracking-wide uppercase">
              <MessageSquareText className="w-4 h-4 text-poker-red" />
              <span className="text-white">{commentCount}</span>
              <span className="text-white/40">Comentarios</span>
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
            className={`px-4 py-2 rounded-full text-xs font-semibold tracking-[0.2em] transition-all uppercase ${
              isExpanded
                ? 'bg-gradient-to-r from-poker-red/85 to-poker-red text-white shadow-[0_14px_30px_rgba(255,93,143,0.3)]'
                : 'border border-white/15 text-white/70 hover:text-white hover:border-white/35'
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
          <div className="px-5 pb-5 pt-4 border-b border-white/10 space-y-4">
            {/* Objetivo */}
            <div>
              <h4 className="text-xs font-semibold tracking-[0.24em] text-poker-red/80 uppercase mb-1.5">Objetivo</h4>
              <p className="text-sm text-white/75 leading-relaxed">
                {proposal.objective}
              </p>
            </div>

            {/* Situación a modificar */}
            <div>
              <h4 className="text-xs font-semibold tracking-[0.24em] text-poker-red/80 uppercase mb-1.5">Situación a Modificar</h4>
              <p className="text-sm text-white/75 leading-relaxed whitespace-pre-line">
                {proposal.situation}
              </p>
            </div>

            {/* Propuesta */}
            <div>
              <h4 className="text-xs font-semibold tracking-[0.24em] text-poker-red/80 uppercase mb-1.5">Propuesta</h4>
              <p className="text-sm text-white/75 leading-relaxed whitespace-pre-line">
                {proposal.proposal}
              </p>
            </div>

            {/* Image Display */}
            {proposal.imageUrl && (
              <div className="mt-4">
                <img
                  src={proposal.imageUrl}
                  alt="Imagen de la propuesta"
                  className="w-full h-auto rounded-lg border border-white/15 cursor-pointer hover:border-white/35 transition-all"
                  style={{ maxHeight: '400px', objectFit: 'contain' }}
                  onClick={() => {
                    // Open image in new tab for full view
                    window.open(proposal.imageUrl, '_blank')
                  }}
                />
                <p className="text-xs text-white/45 mt-2 text-center tracking-wide">
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
