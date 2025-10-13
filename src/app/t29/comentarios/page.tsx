'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import LoadingState from '@/components/ui/LoadingState'
import { buildAuthHeaders } from '@/lib/client-auth'
import { Card } from '@/components/ui/card'
import { ArrowLeft, MessageSquareText, Lightbulb } from 'lucide-react'
import Link from 'next/link'

interface Proposal {
  id: number
  title: string
}

interface Comment {
  id: number
  content: string
  createdAt: string
  player: {
    id: string
    firstName: string
    lastName: string
    role: string
  }
  proposal: {
    id: number
    title: string
  }
}

interface GroupedComments {
  [proposalId: number]: {
    proposal: {
      id: number
      title: string
    }
    comments: Comment[]
  }
}

export default function ComentariosPage() {
  const { user, loading } = useAuth()
  const [groupedComments, setGroupedComments] = useState<GroupedComments>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading) {
      fetchAllComments()
    }
  }, [loading])

  const fetchAllComments = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // First, get all active proposals (public endpoint)
      const proposalsResponse = await fetch('/api/proposals-v2/public')

      if (!proposalsResponse.ok) {
        throw new Error('Error al cargar propuestas')
      }

      const { proposals } = await proposalsResponse.json()

      // Then, fetch comments for each proposal (only if user is authenticated)
      const commentPromises = proposals.map(async (proposal: Proposal) => {
        if (!user) {
          return {
            proposalId: proposal.id,
            proposal: {
              id: proposal.id,
              title: proposal.title
            },
            comments: []
          }
        }

        const commentsResponse = await fetch(`/api/proposals/${proposal.id}/comments`, {
          headers: buildAuthHeaders()
        })

        if (commentsResponse.ok) {
          const { comments } = await commentsResponse.json()
          return {
            proposalId: proposal.id,
            proposal: {
              id: proposal.id,
              title: proposal.title
            },
            comments: comments.map((comment: Comment) => ({
              ...comment,
              proposal: {
                id: proposal.id,
                title: proposal.title
              }
            }))
          }
        }
        return {
          proposalId: proposal.id,
          proposal: {
            id: proposal.id,
            title: proposal.title
          },
          comments: []
        }
      })

      const results = await Promise.all(commentPromises)

      // Group comments by proposal
      const grouped: GroupedComments = {}
      results.forEach((result) => {
        if (result && result.comments.length > 0) {
          grouped[result.proposalId] = {
            proposal: result.proposal,
            comments: result.comments
          }
        }
      })

      setGroupedComments(grouped)
    } catch (error) {
      console.error('Error fetching comments:', error)
      setError(error instanceof Error ? error.message : 'Error al cargar comentarios')
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Comision':
        return 'bg-poker-red text-white'
      case 'Enfermo':
        return 'bg-gray-600 text-white'
      case 'Invitado':
        return 'bg-orange-600 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return <LoadingState />
  }

  const totalComments = Object.values(groupedComments).reduce(
    (total, group) => total + group.comments.length,
    0
  )

  return (
    <div className="pb-24 space-y-6">
      {/* Header */}
      <header className="flex items-center gap-4">
        <Link
          href="/t29"
          className="flex items-center text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          <span>Volver</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-poker-red/20 text-poker-red">
            <MessageSquareText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Todos los Comentarios</h1>
            <p className="text-sm text-white/60">
              {totalComments} comentario{totalComments !== 1 ? 's' : ''} en total
            </p>
          </div>
        </div>
      </header>

      {/* Loading State */}
      {isLoading && (
        <Card className="admin-card p-8 text-center text-white/60">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-poker-red mx-auto mb-4"></div>
          Cargando comentarios...
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="admin-card p-8 text-center text-poker-red">
          {error}
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && totalComments === 0 && (
        <Card className="admin-card p-8 text-center text-white/60">
          <MessageSquareText className="w-12 h-12 mx-auto mb-4 text-white/30" />
          <h3 className="text-lg font-semibold mb-2 text-white">Sin comentarios</h3>
          <p className="text-white/60">
            Aún no hay comentarios en las propuestas. ¡Sé el primero en comentar!
          </p>
        </Card>
      )}

      {/* Comments by Proposal */}
      {!isLoading && !error && totalComments > 0 && (
        <div className="space-y-6">
          {Object.values(groupedComments).map((group) => (
            <Card key={group.proposal.id} className="admin-card overflow-hidden">
              {/* Proposal Header */}
              <div className="bg-gradient-to-r from-poker-red/20 to-poker-red/10 p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Lightbulb className="w-5 h-5 text-poker-red" />
                  <div>
                    <h3 className="text-white font-semibold text-lg">
                      {group.proposal.title}
                    </h3>
                    <p className="text-white/60 text-sm">
                      {group.comments.length} comentario{group.comments.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Comments List */}
              <div className="p-5 space-y-4">
                {group.comments.map((comment: Comment) => (
                  <div key={comment.id} className="bg-white/5 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {comment.player.firstName} {comment.player.lastName}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadgeColor(comment.player.role)}`}>
                          {comment.player.role}
                        </span>
                      </div>
                      <span className="text-xs text-white/50">
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>

                    <p className="text-white/85 leading-relaxed whitespace-pre-line">
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}