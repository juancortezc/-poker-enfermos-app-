'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, ChevronDown, User, FileText, Hash, Coins, DollarSign } from 'lucide-react'
import { buildAuthHeaders } from '@/lib/client-auth'

interface TournamentPlayer {
  playerId: string
  playerName: string
}

interface Multa {
  id: number
  tournamentId: number
  playerId: string
  reason: string
  pointsPenalty: number
  chipsAmount: number | null
  moneyAmount: number | null
  paid: boolean
  player: {
    id: string
    firstName: string
    lastName: string
  }
}

interface CPMultaFormProps {
  multa?: Multa | null
  tournamentId: number
  players: TournamentPlayer[]
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

interface FormData {
  playerId: string
  reason: string
  pointsPenalty: string
  chipsAmount: string
  moneyAmount: string
  paid: boolean
}

const EMPTY_FORM: FormData = {
  playerId: '',
  reason: '',
  pointsPenalty: '',
  chipsAmount: '',
  moneyAmount: '',
  paid: false,
}

export default function CPMultaForm({ multa, tournamentId, players, isOpen, onClose, onSave }: CPMultaFormProps) {
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (multa) {
      setFormData({
        playerId: multa.playerId,
        reason: multa.reason,
        pointsPenalty: multa.pointsPenalty ? String(multa.pointsPenalty) : '',
        chipsAmount: multa.chipsAmount !== null ? String(multa.chipsAmount) : '',
        moneyAmount: multa.moneyAmount !== null ? String(multa.moneyAmount) : '',
        paid: multa.paid,
      })
    } else {
      setFormData(EMPTY_FORM)
    }
  }, [multa])

  const updateFormData = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!formData.playerId) {
        throw new Error('Selecciona un jugador')
      }
      if (!formData.reason.trim()) {
        throw new Error('La razón es obligatoria')
      }
      if (!formData.pointsPenalty && !formData.chipsAmount && !formData.moneyAmount) {
        throw new Error('Ingresa al menos puntos, fichas o dinero')
      }

      const submitData = {
        tournamentId,
        playerId: formData.playerId,
        reason: formData.reason.trim(),
        pointsPenalty: formData.pointsPenalty || 0,
        chipsAmount: formData.chipsAmount || null,
        moneyAmount: formData.moneyAmount || null,
        paid: formData.paid,
      }

      const url = multa ? `/api/multas/${multa.id}` : '/api/multas'
      const method = multa ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: buildAuthHeaders({}, { includeJson: true }),
        body: JSON.stringify(submitData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al guardar multa')
      }

      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!multa) return
    if (!confirm('¿Eliminar esta multa?')) return
    setLoading(true)
    try {
      const response = await fetch(`/api/multas/${multa.id}`, {
        method: 'DELETE',
        headers: buildAuthHeaders()
      })
      if (!response.ok) {
        throw new Error('Error al eliminar multa')
      }
      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const inputBaseStyle = {
    background: 'var(--cp-background)',
    border: '1px solid var(--cp-surface-border)',
    color: 'var(--cp-on-surface)',
    fontSize: 'var(--cp-body-size)',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.8)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl flex flex-col"
        style={{
          background: 'var(--cp-background)',
          maxHeight: 'calc(90vh - 80px)',
          marginBottom: '70px',
        }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 px-4 py-4 flex items-center justify-between"
          style={{
            background: 'var(--cp-background)',
            borderBottom: '1px solid var(--cp-surface-border)',
          }}
        >
          <h2 className="font-semibold" style={{ fontSize: '18px', color: 'var(--cp-on-surface)' }}>
            {multa ? 'Editar Multa' : 'Nueva Multa'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-colors hover:bg-white/10"
            style={{ color: 'var(--cp-on-surface-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 flex-1 overflow-y-auto">
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: 'var(--cp-surface)', border: '1px solid var(--cp-surface-border)' }}
          >
            {/* Jugador */}
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--cp-on-surface-muted)' }} />
              <div className="relative flex-1">
                <select
                  value={formData.playerId}
                  onChange={(e) => updateFormData('playerId', e.target.value)}
                  required
                  className="w-full px-3 py-2.5 pr-10 appearance-none"
                  style={{ ...inputBaseStyle, borderRadius: '4px' }}
                >
                  <option value="">Jugador *</option>
                  {players.map((p) => (
                    <option key={p.playerId} value={p.playerId}>{p.playerName}</option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--cp-on-surface-muted)' }}
                />
              </div>
            </div>

            {/* Razón */}
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--cp-on-surface-muted)' }} />
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => updateFormData('reason', e.target.value)}
                placeholder="Razón *"
                required
                className="flex-1 px-3 py-2.5"
                style={{ ...inputBaseStyle, borderRadius: '4px' }}
              />
            </div>

            {/* Puntos */}
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--cp-on-surface-muted)' }} />
              <input
                type="number"
                min={0}
                value={formData.pointsPenalty}
                onChange={(e) => updateFormData('pointsPenalty', e.target.value)}
                placeholder="Puntos a descontar del ranking"
                className="flex-1 px-3 py-2.5"
                style={{ ...inputBaseStyle, borderRadius: '4px' }}
              />
            </div>

            {/* Fichas */}
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--cp-on-surface-muted)' }} />
              <input
                type="number"
                min={0}
                value={formData.chipsAmount}
                onChange={(e) => updateFormData('chipsAmount', e.target.value)}
                placeholder="Fichas (informativo)"
                className="flex-1 px-3 py-2.5"
                style={{ ...inputBaseStyle, borderRadius: '4px' }}
              />
            </div>

            {/* Dinero */}
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--cp-on-surface-muted)' }} />
              <input
                type="number"
                min={0}
                step="0.01"
                value={formData.moneyAmount}
                onChange={(e) => updateFormData('moneyAmount', e.target.value)}
                placeholder="Dinero (informativo)"
                className="flex-1 px-3 py-2.5"
                style={{ ...inputBaseStyle, borderRadius: '4px' }}
              />
            </div>

            {/* Pagada */}
            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.paid}
                onChange={(e) => updateFormData('paid', e.target.checked)}
              />
              <span style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-muted)' }}>
                Multa pagada / saldada
              </span>
            </label>
          </div>

          {error && (
            <div
              className="rounded-xl p-4 text-center"
              style={{ background: 'rgba(229, 57, 53, 0.1)', border: '1px solid rgba(229, 57, 53, 0.3)' }}
            >
              <p style={{ color: '#E53935', fontSize: 'var(--cp-caption-size)' }}>{error}</p>
            </div>
          )}
        </form>

        {/* Buttons */}
        <div
          className="flex-shrink-0 px-4 py-4 flex gap-3"
          style={{ background: 'var(--cp-background)', borderTop: '1px solid var(--cp-surface-border)' }}
        >
          {multa && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="py-3 px-4 font-medium transition-all"
              style={{ background: 'rgba(229, 57, 53, 0.1)', color: '#E53935', borderRadius: '8px' }}
            >
              Eliminar
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 font-medium transition-all"
            style={{
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
              color: 'var(--cp-on-surface-muted)',
              borderRadius: '8px',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ background: '#E53935', color: 'white', borderRadius: '8px' }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Guardando...
              </>
            ) : (
              multa ? 'Actualizar' : 'Crear'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
