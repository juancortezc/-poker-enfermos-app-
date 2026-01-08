'use client'

import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'

interface GameDate {
  id: string
  dateNumber: number
  scheduledDate: string
  status: 'pending' | 'in_progress' | 'completed'
}

interface Tournament {
  id: string
  number: number
  name: string
  gameDates: GameDate[]
}

export default function CalendarioTab() {
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchActiveTournament()
  }, [])

  const fetchActiveTournament = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tournaments/active')

      if (!response.ok) {
        throw new Error('Error al cargar torneo')
      }

      const result = await response.json()

      if (result.tournament) {
        setTournament(result.tournament)
      } else {
        setTournament(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    // Handle both ISO datetime and YYYY-MM-DD formats
    const dateOnly = dateString.split('T')[0]
    const date = new Date(dateOnly + 'T12:00:00')
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase(),
      weekday: date.toLocaleDateString('es-ES', { weekday: 'short' })
    }
  }

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase()
    switch (s) {
      case 'completed':
        return '#22c55e' // green
      case 'in_progress':
        return '#E53935' // red
      default:
        return 'var(--cp-on-surface-muted)'
    }
  }

  const getStatusText = (status: string) => {
    const s = status?.toLowerCase()
    switch (s) {
      case 'completed':
        return 'Jugada'
      case 'in_progress':
        return 'En juego'
      default:
        return 'Pendiente'
    }
  }

  const isActiveStatus = (status: string) => {
    return status?.toLowerCase() === 'in_progress'
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div style={{ color: 'var(--cp-on-surface-muted)' }}>Cargando calendario...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        <p style={{ color: '#E53935', fontSize: 'var(--cp-body-size)' }}>
          Error: {error}
        </p>
        <button
          onClick={fetchActiveTournament}
          className="mt-4 px-4 py-2 rounded-lg font-medium"
          style={{ background: '#E53935', color: 'white' }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (!tournament || !tournament.gameDates?.length) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        <Calendar className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--cp-on-surface-muted)' }} />
        <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-body-size)' }}>
          No hay calendario disponible
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tournament Header */}
      <div
        className="rounded-2xl p-4 text-center"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        <p
          className="text-xs uppercase tracking-wider mb-1"
          style={{ color: 'var(--cp-on-surface-muted)' }}
        >
          Torneo
        </p>
        <h2
          className="text-2xl font-bold"
          style={{ color: 'var(--cp-on-surface)' }}
        >
          #{tournament.number}
        </h2>
      </div>

      {/* Dates Grid */}
      <div className="grid grid-cols-3 gap-2">
        {(() => {
          const sortedDates = [...tournament.gameDates].sort((a, b) => a.dateNumber - b.dateNumber)
          // Find the first pending date (next to play)
          const nextPendingIndex = sortedDates.findIndex(d => {
            const s = d.status?.toLowerCase()
            return s !== 'completed'
          })

          return sortedDates.map((gameDate, index) => {
            const { day, month } = formatDate(gameDate.scheduledDate)
            const isCompleted = gameDate.status?.toLowerCase() === 'completed'
            const isNextDate = index === nextPendingIndex

            // Border: gray for completed, red for next date, default for others
            let borderStyle = '1px solid var(--cp-surface-border)'
            let bgStyle = 'var(--cp-surface)'
            let dateNumberColor = 'var(--cp-on-surface-muted)'

            if (isCompleted) {
              borderStyle = '2px solid #6b7280' // gray
            } else if (isNextDate) {
              borderStyle = '2px solid #E53935' // red
              bgStyle = 'rgba(229, 57, 53, 0.15)'
              dateNumberColor = '#E53935'
            }

            return (
              <div
                key={gameDate.id}
                className="rounded-xl p-3 text-center"
                style={{
                  background: bgStyle,
                  border: borderStyle,
                }}
              >
                {/* Date Number */}
                <p
                  className="text-xs font-medium mb-2"
                  style={{ color: dateNumberColor }}
                >
                  Fecha {gameDate.dateNumber}
                </p>

                {/* Day */}
                <p
                  className="text-2xl font-bold"
                  style={{ color: 'var(--cp-on-surface)' }}
                >
                  {day}
                </p>

                {/* Month */}
                <p
                  className="text-sm font-semibold"
                  style={{ color: '#f97316' }}
                >
                  {month}
                </p>
              </div>
            )
          })
        })()}
      </div>
    </div>
  )
}
