'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Plus, Trash2, Save, RotateCcw, Clock } from 'lucide-react'
import { buildAuthHeaders } from '@/lib/client-auth'
import { toast } from 'react-toastify'

interface BlindLevel {
  level: number
  smallBlind: number
  bigBlind: number
  duration: number // minutos
}

interface CPBlindsTabProps {
  tournamentId?: number
}

// Default blind levels
const DEFAULT_BLIND_LEVELS: BlindLevel[] = [
  { level: 1, smallBlind: 50, bigBlind: 100, duration: 25 },
  { level: 2, smallBlind: 100, bigBlind: 200, duration: 25 },
  { level: 3, smallBlind: 150, bigBlind: 300, duration: 25 },
  { level: 4, smallBlind: 250, bigBlind: 500, duration: 25 },
  { level: 5, smallBlind: 400, bigBlind: 800, duration: 25 },
  { level: 6, smallBlind: 600, bigBlind: 1200, duration: 20 },
  { level: 7, smallBlind: 800, bigBlind: 1600, duration: 20 },
  { level: 8, smallBlind: 1000, bigBlind: 2000, duration: 20 },
  { level: 9, smallBlind: 1250, bigBlind: 2500, duration: 20 },
  { level: 10, smallBlind: 1500, bigBlind: 3000, duration: 20 },
  { level: 11, smallBlind: 2000, bigBlind: 4000, duration: 15 },
  { level: 12, smallBlind: 2500, bigBlind: 5000, duration: 0 }
]

export default function CPBlindsTab({ tournamentId }: CPBlindsTabProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [blindLevels, setBlindLevels] = useState<BlindLevel[]>([])
  const [originalBlinds, setOriginalBlinds] = useState<BlindLevel[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [tournamentNumber, setTournamentNumber] = useState<number | null>(null)

  // Cargar blinds del torneo
  useEffect(() => {
    const fetchBlinds = async () => {
      if (!tournamentId) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/tournaments/${tournamentId}`, {
          headers: buildAuthHeaders()
        })

        if (res.ok) {
          const tournament = await res.json()
          const levels = tournament.blindLevels || []
          setBlindLevels(levels)
          setOriginalBlinds(levels)
          setTournamentNumber(tournament.number)
        }
      } catch (err) {
        console.error('Error fetching blinds:', err)
        toast.error('Error al cargar estructura de blinds')
      } finally {
        setLoading(false)
      }
    }

    fetchBlinds()
  }, [tournamentId])

  // Detectar cambios
  useEffect(() => {
    const changed = JSON.stringify(blindLevels) !== JSON.stringify(originalBlinds)
    setHasChanges(changed)
  }, [blindLevels, originalBlinds])

  // Actualizar un nivel
  const updateLevel = useCallback((index: number, field: keyof BlindLevel, value: number) => {
    setBlindLevels(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }, [])

  // Agregar nivel
  const addLevel = useCallback(() => {
    setBlindLevels(prev => {
      const lastLevel = prev[prev.length - 1]
      const newLevel: BlindLevel = {
        level: (lastLevel?.level || 0) + 1,
        smallBlind: lastLevel ? Math.round(lastLevel.smallBlind * 1.5) : 50,
        bigBlind: lastLevel ? Math.round(lastLevel.bigBlind * 1.5) : 100,
        duration: lastLevel?.duration || 20
      }
      return [...prev, newLevel]
    })
  }, [])

  // Eliminar nivel
  const removeLevel = useCallback((index: number) => {
    setBlindLevels(prev => {
      const updated = prev.filter((_, i) => i !== index)
      // Renumerar niveles
      return updated.map((bl, i) => ({ ...bl, level: i + 1 }))
    })
  }, [])

  // Resetear a defaults
  const resetToDefaults = useCallback(() => {
    setBlindLevels(DEFAULT_BLIND_LEVELS)
  }, [])

  // Descartar cambios
  const discardChanges = useCallback(() => {
    setBlindLevels(originalBlinds)
  }, [originalBlinds])

  // Guardar cambios
  const saveChanges = useCallback(async () => {
    if (!tournamentId) return

    setSaving(true)
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`, {
        method: 'PUT',
        headers: buildAuthHeaders({}, { includeJson: true }),
        body: JSON.stringify({ blindLevels })
      })

      if (res.ok) {
        setOriginalBlinds(blindLevels)
        setHasChanges(false)
        toast.success('Estructura de blinds actualizada')
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Error al guardar')
      }
    } catch (err) {
      console.error('Error saving blinds:', err)
      toast.error(err instanceof Error ? err.message : 'Error al guardar blinds')
    } finally {
      setSaving(false)
    }
  }, [tournamentId, blindLevels])

  // Calcular tiempo total
  const totalMinutes = blindLevels.reduce((acc, bl) => acc + bl.duration, 0)
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
            style={{
              borderColor: 'var(--cp-surface-border)',
              borderTopColor: '#E53935'
            }}
          />
          <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-caption-size)' }}>
            Cargando blinds...
          </p>
        </div>
      </div>
    )
  }

  if (!tournamentId) {
    return (
      <div
        className="p-6 text-center"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
          borderRadius: '4px'
        }}
      >
        <Clock size={32} className="mx-auto mb-3" style={{ color: 'var(--cp-on-surface-muted)' }} />
        <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-body-size)' }}>
          No hay torneo activo
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
          borderRadius: '4px'
        }}
      >
        <div>
          <p style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-muted)' }}>
            Estructura de Blinds
          </p>
          <p style={{ fontSize: 'var(--cp-body-size)', color: 'var(--cp-on-surface)' }}>
            Torneo {tournamentNumber} - {blindLevels.length} niveles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={14} style={{ color: 'var(--cp-on-surface-muted)' }} />
          <span style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-muted)' }}>
            {hours}h {mins}m
          </span>
        </div>
      </div>

      {/* Blinds Table */}
      <div
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
          borderRadius: '4px',
          overflow: 'hidden'
        }}
      >
        {/* Table Header */}
        <div
          className="grid grid-cols-5 gap-2 p-2 text-center"
          style={{
            background: 'var(--cp-background)',
            borderBottom: '1px solid var(--cp-surface-border)'
          }}
        >
          <p style={{ fontSize: '10px', color: 'var(--cp-on-surface-muted)' }}>Nivel</p>
          <p style={{ fontSize: '10px', color: 'var(--cp-on-surface-muted)' }}>SB</p>
          <p style={{ fontSize: '10px', color: 'var(--cp-on-surface-muted)' }}>BB</p>
          <p style={{ fontSize: '10px', color: 'var(--cp-on-surface-muted)' }}>Min</p>
          <p style={{ fontSize: '10px', color: 'var(--cp-on-surface-muted)' }}></p>
        </div>

        {/* Table Body */}
        <div className="max-h-[400px] overflow-y-auto">
          {blindLevels.map((blind, index) => (
            <div
              key={index}
              className="grid grid-cols-5 gap-2 p-2 items-center"
              style={{
                borderBottom: index < blindLevels.length - 1 ? '1px solid var(--cp-surface-border)' : 'none'
              }}
            >
              {/* Level */}
              <div
                className="text-center font-bold py-1"
                style={{
                  background: 'var(--cp-background)',
                  borderRadius: '4px',
                  color: 'var(--cp-on-surface)',
                  fontSize: 'var(--cp-body-size)'
                }}
              >
                {blind.level}
              </div>

              {/* Small Blind */}
              <input
                type="number"
                value={blind.smallBlind}
                onChange={(e) => updateLevel(index, 'smallBlind', parseInt(e.target.value) || 0)}
                className="text-center text-sm p-1 focus:outline-none focus:ring-1 focus:ring-red-500"
                style={{
                  background: 'var(--cp-background)',
                  border: '1px solid var(--cp-surface-border)',
                  borderRadius: '4px',
                  color: 'var(--cp-on-surface)',
                  width: '100%'
                }}
              />

              {/* Big Blind */}
              <input
                type="number"
                value={blind.bigBlind}
                onChange={(e) => updateLevel(index, 'bigBlind', parseInt(e.target.value) || 0)}
                className="text-center text-sm p-1 focus:outline-none focus:ring-1 focus:ring-red-500"
                style={{
                  background: 'var(--cp-background)',
                  border: '1px solid var(--cp-surface-border)',
                  borderRadius: '4px',
                  color: 'var(--cp-on-surface)',
                  width: '100%'
                }}
              />

              {/* Duration */}
              <input
                type="number"
                value={blind.duration}
                onChange={(e) => updateLevel(index, 'duration', parseInt(e.target.value) || 0)}
                className="text-center text-sm p-1 focus:outline-none focus:ring-1 focus:ring-red-500"
                style={{
                  background: 'var(--cp-background)',
                  border: '1px solid var(--cp-surface-border)',
                  borderRadius: '4px',
                  color: blind.duration === 0 ? '#FFC107' : 'var(--cp-on-surface)',
                  width: '100%'
                }}
                placeholder="0=sin limite"
              />

              {/* Delete */}
              <button
                onClick={() => removeLevel(index)}
                className="p-1.5 mx-auto transition-all hover:bg-red-500/20 rounded"
                disabled={blindLevels.length <= 1}
                style={{
                  opacity: blindLevels.length <= 1 ? 0.3 : 1
                }}
              >
                <Trash2 size={14} style={{ color: '#ef4444' }} />
              </button>
            </div>
          ))}
        </div>

        {/* Add Level Button */}
        <button
          onClick={addLevel}
          className="w-full p-2 flex items-center justify-center gap-2 transition-all hover:bg-white/5"
          style={{
            borderTop: '1px solid var(--cp-surface-border)',
            color: 'var(--cp-on-surface-muted)',
            fontSize: 'var(--cp-caption-size)'
          }}
        >
          <Plus size={14} />
          Agregar nivel
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={resetToDefaults}
          className="flex-1 py-2 font-medium transition-all flex items-center justify-center gap-2"
          style={{
            background: 'transparent',
            border: '1px solid var(--cp-surface-border)',
            borderRadius: '4px',
            color: 'var(--cp-on-surface-muted)',
            fontSize: 'var(--cp-caption-size)'
          }}
        >
          <RotateCcw size={14} />
          Defaults
        </button>

        {hasChanges && (
          <button
            onClick={discardChanges}
            className="flex-1 py-2 font-medium transition-all"
            style={{
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
              borderRadius: '4px',
              color: 'var(--cp-on-surface)',
              fontSize: 'var(--cp-caption-size)'
            }}
          >
            Descartar
          </button>
        )}

        <button
          onClick={saveChanges}
          disabled={!hasChanges || saving}
          className="flex-1 py-2 font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          style={{
            background: hasChanges ? '#E53935' : 'var(--cp-surface)',
            borderRadius: '4px',
            color: hasChanges ? 'white' : 'var(--cp-on-surface-muted)',
            fontSize: 'var(--cp-caption-size)'
          }}
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          Guardar
        </button>
      </div>

      {/* Info */}
      <p
        className="text-center"
        style={{
          fontSize: 'var(--cp-caption-size)',
          color: 'var(--cp-on-surface-muted)'
        }}
      >
        Duracion 0 = sin limite de tiempo (nivel final)
      </p>
    </div>
  )
}
