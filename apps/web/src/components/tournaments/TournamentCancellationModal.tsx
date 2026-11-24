'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, AlertTriangle, Loader2 } from 'lucide-react'
import { buildAuthHeaders } from '@/lib/client-auth'

interface Tournament {
  id: number
  name: string
  number: number
  status: string
}

interface TournamentCancellationModalProps {
  isOpen: boolean
  onClose: () => void
  tournament: Tournament | null
  onCancel: () => void
}

export default function TournamentCancellationModal({
  isOpen,
  onClose,
  tournament,
  onCancel
}: TournamentCancellationModalProps) {
  const { user } = useAuth()
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !tournament) return null

  const handleCancel = async () => {
    const expectedText = tournament.status === 'ACTIVO' ? 'CANCELAR TORNEO ACTIVO' : 'CANCELAR TORNEO'
    
    if (confirmText.toUpperCase() !== expectedText) {
      setError(`Debe escribir "${expectedText}" para continuar`)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/tournaments/${tournament.id}`, {
        method: 'DELETE',
        headers: buildAuthHeaders({}, { includeJson: true })
      })

      if (response.ok) {
        onCancel()
        handleClose()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al cancelar torneo')
      }
    } catch (error) {
      console.error('Error canceling tournament:', error)
      setError('Error al cancelar torneo')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setConfirmText('')
    setError('')
    onClose()
  }

  const isActiveTournament = tournament.status === 'ACTIVO'
  const expectedConfirmText = isActiveTournament ? 'CANCELAR TORNEO ACTIVO' : 'CANCELAR TORNEO'
  const isConfirmTextValid = confirmText.toUpperCase() === expectedConfirmText

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-poker-card border border-white/20 rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Cancelar Torneo
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-poker-muted hover:text-white p-1"
            disabled={loading}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm">
              <strong>¡ADVERTENCIA!</strong> Esta acción eliminará completamente el{' '}
              <strong>{tournament.name}</strong>
              {isActiveTournament && (
                <span className="block mt-2">
                  Este es un torneo ACTIVO. Su cancelación afectará todas las fechas y datos asociados.
                </span>
              )}
            </p>
          </div>

          <div className="text-poker-muted text-sm">
            <p className="mb-2">La cancelación eliminará permanentemente:</p>
            <ul className="list-disc list-inside space-y-1 pl-4">
              <li>Todos los datos del torneo</li>
              <li>Fechas programadas y completadas</li>
              <li>Participantes y rankings</li>
              <li>Estructura de blinds configurada</li>
            </ul>
          </div>
          
          <p className="text-poker-muted text-sm">
            Para confirmar la cancelación, escriba:{' '}
            <strong className="text-red-400">{expectedConfirmText}</strong>
          </p>
          
          <Input
            value={confirmText}
            onChange={(e) => {
              setConfirmText(e.target.value)
              setError('')
            }}
            placeholder={`Escriba "${expectedConfirmText}"`}
            className="text-center text-sm font-bold bg-poker-dark/50 border-white/20 focus:border-red-500"
            autoFocus
            disabled={loading}
          />

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1 border-white/20 text-poker-text hover:bg-white/5"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCancel}
              disabled={!isConfirmTextValid || loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Confirmar Cancelación
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
