'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { buildAuthHeaders, getStoredAuthToken } from '@/lib/client-auth'

export default function CPCrearTorneoTab() {
  const router = useRouter()
  const [nextTournamentNumber, setNextTournamentNumber] = useState<number>(0)
  const [selectedNumber, setSelectedNumber] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (getStoredAuthToken()) {
      fetchNextTournamentNumber()
    }
  }, [])

  const fetchNextTournamentNumber = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tournaments/next-number', {
        headers: buildAuthHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        setNextTournamentNumber(data.nextNumber)
        setSelectedNumber(data.nextNumber)
      } else {
        setError('Error al obtener numero de torneo')
      }
    } catch (err) {
      console.error('Error fetching next tournament number:', err)
      setError('Error de conexion')
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = async () => {
    if (selectedNumber < 1 || selectedNumber > 999) {
      setError('El numero debe estar entre 1 y 999')
      return
    }

    setSubmitting(true)
    router.push(`/tournaments/new/configure?number=${selectedNumber}`)
  }

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
            Cargando...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Title */}
      <p
        className="text-center"
        style={{ fontSize: 'var(--cp-body-size)', color: 'var(--cp-on-surface-muted)' }}
      >
        Nuevo Torneo
      </p>

      {/* Tournament Number Input */}
      <div className="text-center">
        <label
          className="block mb-3"
          style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-muted)' }}
        >
          Numero del Torneo
        </label>

        <input
          type="number"
          value={selectedNumber}
          onChange={(e) => {
            setSelectedNumber(parseInt(e.target.value) || 0)
            setError('')
          }}
          className="w-full text-center text-4xl font-bold py-5 rounded-xl transition-all focus:outline-none"
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'var(--cp-on-surface)',
          }}
          min="1"
          max="999"
          autoFocus
        />

        {selectedNumber !== nextTournamentNumber && selectedNumber > 0 && (
          <p
            className="mt-2 flex items-center justify-center gap-1"
            style={{ fontSize: 'var(--cp-caption-size)', color: '#FFC107' }}
          >
            <AlertCircle size={12} />
            Sugerido: {nextTournamentNumber}
          </p>
        )}

        {error && (
          <p
            className="mt-2 flex items-center justify-center gap-1"
            style={{ fontSize: 'var(--cp-caption-size)', color: '#E53935' }}
          >
            <AlertCircle size={12} />
            {error}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-2">
        <button
          onClick={handleContinue}
          disabled={submitting || selectedNumber < 1}
          className="w-full py-3 rounded-full font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          style={{
            background: '#E53935',
            color: 'white',
          }}
        >
          {submitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Iniciando...
            </>
          ) : (
            'Continuar'
          )}
        </button>

        <button
          onClick={() => router.push('/tournaments')}
          className="w-full py-3 rounded-full font-medium transition-all"
          style={{
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: 'var(--cp-on-surface-muted)',
          }}
        >
          Ver Torneos Anteriores
        </button>
      </div>
    </div>
  )
}
