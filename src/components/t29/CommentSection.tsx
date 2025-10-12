'use client'

import { useState, useEffect } from 'react'
import { MessageSquareText, Send } from 'lucide-react'
import { buildAuthHeaders } from '@/lib/client-auth'
import { toast } from 'react-toastify'
import { Textarea } from '@/components/ui/textarea'
import { NoirButton } from '@/components/noir/NoirButton'

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

const roleStyles: Record<string, string> = {
  Comision: 'border border-[#e0b66c]/35 bg-[#e0b66c]/15 text-[#e0b66c]',
  Enfermo: 'border border-[#d7c59a]/30 bg-[#2a1a14]/80 text-[#d7c59a]',
  Invitado: 'border border-[#c9783f]/35 bg-[#c9783f]/22 text-[#f3e6c5]',
  default: 'border border-[#d7c59a]/25 bg-[#2a1a14]/70 text-[#d7c59a]'
}

export function CommentSection({
  proposalId,
  isExpanded,
  onCommentCountChange,
  disabled = false
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const remainingChars = 500 - newComment.length

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

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })

  if (!isExpanded) return null

  return (
    <div className="space-y-4 border-t border-[#e0b66c]/18 bg-[rgba(31,20,16,0.62)] px-5 py-4">
      {!disabled && (
        <form onSubmit={handleSubmitComment} className="space-y-3">
          <div className="flex items-center gap-2 text-[#d7c59a]/75">
            <MessageSquareText className="h-4 w-4 text-[#e0b66c]" />
            <span className="text-sm font-medium uppercase tracking-[0.2em]">
              Agregar comentario
            </span>
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
              className="resize-none border border-[#e0b66c]/22 bg-[rgba(42,26,20,0.78)] text-[#f3e6c5] placeholder:text-[#d7c59a]/60 focus:border-[#e0b66c]/45 focus:ring-[#e0b66c]/20"
              maxLength={500}
            />

            <div className="flex items-center justify-between">
              <span className="text-xs text-[#d7c59a]/60">
                {remainingChars} caracteres restantes
              </span>

              <NoirButton
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                className="gap-2 px-4 py-2 text-[11px]"
              >
                {isSubmitting ? (
                  'Enviando...'
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar
                  </>
                )}
              </NoirButton>
            </div>
          </div>
        </form>
      )}

      {disabled && (
        <div className="rounded-lg border border-[#e0b66c]/18 bg-[rgba(31,20,16,0.6)] py-3 text-center text-sm text-[#d7c59a]/70">
          La votación ha sido cerrada para esta propuesta
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? (
          <div className="py-4 text-center text-[#d7c59a]/70">
            Cargando comentarios...
          </div>
        ) : comments.length === 0 ? (
          <div className="py-4 text-center text-[#d7c59a]/70">
            Aún no hay comentarios. ¡Sé el primero!
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="space-y-2 rounded-lg border border-[#e0b66c]/18 bg-[rgba(31,20,16,0.72)] p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#f3e6c5]">
                    {comment.player.firstName} {comment.player.lastName}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      roleStyles[comment.player.role] ?? roleStyles.default
                    }`}
                  >
                    {comment.player.role}
                  </span>
                </div>
                <span className="text-xs text-[#d7c59a]/55">
                  {formatDate(comment.createdAt)}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-[#f3e6c5]/85">
                {comment.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
