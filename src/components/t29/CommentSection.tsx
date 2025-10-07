'use client'

import { useState, useEffect } from 'react'
import { MessageSquareText, Send } from 'lucide-react'
import { buildAuthHeaders } from '@/lib/client-auth'
import { toast } from 'react-toastify'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

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
}

interface CommentSectionProps {
  proposalId: number
  isExpanded: boolean
  onCommentCountChange?: (count: number) => void
  disabled?: boolean
}

export function CommentSection({ proposalId, isExpanded, onCommentCountChange, disabled = false }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const remainingChars = 500 - newComment.length

  // Fetch comments when expanded
  useEffect(() => {
    if (isExpanded) {
      fetchComments()
    }
  }, [isExpanded, proposalId])

  const fetchComments = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/proposals/${proposalId}/comments`, {
        headers: buildAuthHeaders()
      })

      if (!response.ok) {
        throw new Error('Error al cargar comentarios')
      }

      const data = await response.json()
      setComments(data.comments)
      onCommentCountChange?.(data.comments.length)
    } catch (error) {
      console.error('Error fetching comments:', error)
      toast.error('Error al cargar comentarios')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newComment.trim() || isSubmitting || disabled) return

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/proposals/${proposalId}/comments`, {
        method: 'POST',
        headers: buildAuthHeaders({}, { includeJson: true }),
        body: JSON.stringify({ content: newComment.trim() })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al enviar comentario')
      }

      const data = await response.json()
      setComments(prev => [data.comment, ...prev])
      setNewComment('')
      onCommentCountChange?.(comments.length + 1)
      toast.success('Comentario agregado')
    } catch (error) {
      console.error('Error submitting comment:', error)
      toast.error(error instanceof Error ? error.message : 'Error al enviar comentario')
    } finally {
      setIsSubmitting(false)
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
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isExpanded) return null

  return (
    <div className="border-t border-white/10 bg-white/5 px-5 py-4 space-y-4">
      {/* Comment Form */}
      {!disabled && (
        <form onSubmit={handleSubmitComment} className="space-y-3">
          <div className="flex items-center gap-2 text-white/70">
            <MessageSquareText className="w-4 h-4" />
            <span className="text-sm font-medium">Agregar comentario</span>
          </div>

          <div className="space-y-2">
            <Textarea
              value={newComment}
              onChange={(e) => {
                if (e.target.value.length <= 500) {
                  setNewComment(e.target.value)
                }
              }}
              placeholder="Escribe tu comentario..."
              rows={3}
              className="resize-none bg-white/10 border-white/20 text-white placeholder:text-white/50"
              maxLength={500}
            />

            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">
                {remainingChars} caracteres restantes
              </span>

              <Button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                className="bg-poker-red hover:bg-red-700 text-white px-4 py-2 text-sm"
              >
                {isSubmitting ? (
                  'Enviando...'
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      )}

      {disabled && (
        <div className="text-center text-white/50 py-3 border border-white/10 rounded-lg bg-white/5">
          <p className="text-sm">La votación ha sido cerrada para esta propuesta</p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center text-white/60 py-4">
            Cargando comentarios...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center text-white/60 py-4">
            Aún no hay comentarios. ¡Sé el primero!
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-white/5 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium text-sm">
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

              <p className="text-white/85 text-sm leading-relaxed whitespace-pre-line">
                {comment.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}