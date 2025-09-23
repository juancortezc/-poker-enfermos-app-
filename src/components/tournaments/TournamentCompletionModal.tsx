'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { X, Calendar, CheckCircle, Loader2 } from 'lucide-react'
import { buildAuthHeaders } from '@/lib/client-auth'

interface Tournament {
  id: number
  name: string
  number: number
}

interface TournamentCompletionModalProps {
  isOpen: boolean
  onClose: () => void
  tournament: Tournament
  onComplete: () => void
}

export default function TournamentCompletionModal({
  isOpen,
  onClose,
  tournament,
  onComplete
}: TournamentCompletionModalProps) {
  const { user } = useAuth()
  const [mode, setMode] = useState<'select' | 'modify_date' | 'complete'>('select')
  const [newEndDate, setNewEndDate] = useState<Date | undefined>(undefined)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleModifyDate = async () => {
    if (!newEndDate) {
      setError('Selecciona una fecha válida')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/tournaments/${tournament.id}/complete`, {
        method: 'POST',
        headers: buildAuthHeaders({}, { includeJson: true }),
        body: JSON.stringify({
          action: 'modify_date',
          endDate: newEndDate.toISOString()
        })
      })

      if (response.ok) {
        onComplete()
        onClose()
        resetModal()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al modificar fecha')
      }
    } catch (error) {
      console.error('Error modifying date:', error)
      setError('Error al modificar fecha')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteTournament = async () => {
    if (confirmText.toUpperCase() !== 'CONFIRMO') {
      setError('Debe escribir "CONFIRMO" para continuar')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/tournaments/${tournament.id}/complete`, {
        method: 'POST',
        headers: buildAuthHeaders({}, { includeJson: true }),
        body: JSON.stringify({
          action: 'complete_tournament'
        })
      })

      if (response.ok) {
        onComplete()
        onClose()
        resetModal()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Error al completar torneo')
      }
    } catch (error) {
      console.error('Error completing tournament:', error)
      setError('Error al completar torneo')
    } finally {
      setLoading(false)
    }
  }

  const resetModal = () => {
    setMode('select')
    setNewEndDate(undefined)
    setConfirmText('')
    setError('')
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-poker-card border border-white/20 rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {mode === 'select' && 'Fecha Final del Torneo'}
            {mode === 'modify_date' && 'Modificar Fecha Final'}
            {mode === 'complete' && 'Terminar Torneo'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-poker-muted hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        {mode === 'select' && (
          <div className="space-y-4">
            <p className="text-poker-muted text-sm mb-6">
              ¿Qué desea hacer con la fecha final del {tournament.name}?
            </p>
            
            <div className="space-y-3">
              <Button
                onClick={() => setMode('modify_date')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 justify-start"
              >
                <Calendar className="w-4 h-4 mr-3" />
                Modificar la Fecha Final
              </Button>
              
              <Button
                onClick={() => setMode('complete')}
                className="w-full bg-poker-red hover:bg-red-700 text-white py-3 justify-start"
              >
                <CheckCircle className="w-4 h-4 mr-3" />
                Terminar el Torneo
              </Button>
            </div>
          </div>
        )}

        {mode === 'modify_date' && (
          <div className="space-y-4">
            <p className="text-poker-muted text-sm mb-4">
              Selecciona la nueva fecha final para el torneo:
            </p>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-poker-text">
                Nueva Fecha Final
              </label>
              <DatePicker
                selected={newEndDate}
                onSelect={setNewEndDate}
                placeholder="Seleccionar fecha..."
                className="w-full"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setMode('select')}
                variant="outline"
                className="flex-1 border-white/20 text-poker-text hover:bg-white/5"
              >
                Regresar
              </Button>
              <Button
                onClick={handleModifyDate}
                disabled={!newEndDate || loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Modificando...
                  </>
                ) : (
                  'Modificar Fecha'
                )}
              </Button>
            </div>
          </div>
        )}

        {mode === 'complete' && (
          <div className="space-y-4">
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">
                <strong>¡Advertencia!</strong> Esta acción terminará el torneo definitivamente, 
                sin importar si se han completado todas las fechas programadas.
              </p>
            </div>
            
            <p className="text-poker-muted text-sm">
              Para confirmar que desea terminar el {tournament.name}, escriba <strong>CONFIRMO</strong>:
            </p>
            
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Escriba CONFIRMO"
              className="text-center text-lg font-bold bg-poker-dark/50 border-white/20 focus:border-poker-red"
              autoFocus
            />

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => setMode('select')}
                variant="outline"
                className="flex-1 border-white/20 text-poker-text hover:bg-white/5"
              >
                Regresar
              </Button>
              <Button
                onClick={handleCompleteTournament}
                disabled={confirmText.toUpperCase() !== 'CONFIRMO' || loading}
                className="flex-1 bg-poker-red hover:bg-red-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Terminando...
                  </>
                ) : (
                  'Terminar Torneo'
                )}
              </Button>
            </div>
          </div>
        )}

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
