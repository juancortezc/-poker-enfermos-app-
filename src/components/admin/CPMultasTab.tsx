'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Receipt, Hash, Coins, DollarSign, CheckCircle2, Circle } from 'lucide-react'
import { buildAuthHeaders } from '@/lib/client-auth'
import CPMultaForm from './CPMultaForm'

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
  createdAt: string
  player: {
    id: string
    firstName: string
    lastName: string
    photoUrl?: string
  }
}

interface CPMultasTabProps {
  tournamentId?: number
}

export default function CPMultasTab({ tournamentId }: CPMultasTabProps) {
  const [multas, setMultas] = useState<Multa[]>([])
  const [players, setPlayers] = useState<TournamentPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingMulta, setEditingMulta] = useState<Multa | null>(null)

  const fetchMultas = useCallback(async () => {
    if (!tournamentId) return
    try {
      setLoading(true)
      const response = await fetch(`/api/multas?tournamentId=${tournamentId}`, {
        headers: buildAuthHeaders()
      })
      if (response.ok) {
        setMultas(await response.json())
      }
    } catch (error) {
      console.error('Error fetching multas:', error)
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  const fetchPlayers = useCallback(async () => {
    if (!tournamentId) return
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/ranking`)
      if (response.ok) {
        const data = await response.json()
        setPlayers(data.rankings.map((r: { playerId: string; playerName: string }) => ({
          playerId: r.playerId,
          playerName: r.playerName,
        })))
      }
    } catch (error) {
      console.error('Error fetching tournament players:', error)
    }
  }, [tournamentId])

  useEffect(() => {
    fetchMultas()
    fetchPlayers()
  }, [fetchMultas, fetchPlayers])

  const handleAddMulta = () => {
    setEditingMulta(null)
    setShowForm(true)
  }

  const handleEditMulta = (multa: Multa) => {
    setEditingMulta(multa)
    setShowForm(true)
  }

  const handleMultaSaved = () => {
    fetchMultas()
    setShowForm(false)
    setEditingMulta(null)
  }

  if (!tournamentId) {
    return (
      <div className="py-8 text-center">
        <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-body-size)' }}>
          No hay torneo activo
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: 'var(--cp-surface-border)', borderTopColor: '#E53935' }}
          />
          <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-caption-size)' }}>
            Cargando multas...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      <button
        onClick={handleAddMulta}
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95"
        style={{ background: '#E53935' }}
      >
        <Plus size={20} style={{ color: 'white' }} />
      </button>

      {/* List */}
      {multas.length === 0 ? (
        <div className="py-8 text-center">
          <Receipt size={32} className="mx-auto mb-3" style={{ color: 'var(--cp-on-surface-muted)' }} />
          <p style={{ color: 'var(--cp-on-surface)', fontSize: 'var(--cp-body-size)' }}>
            No hay multas registradas
          </p>
          <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-caption-size)' }}>
            Toca + para agregar
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {multas.map((multa) => (
            <button
              key={multa.id}
              onClick={() => handleEditMulta(multa)}
              className="w-full rounded-xl px-3 py-2.5 flex items-center gap-3 text-left transition-all duration-200"
              style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate" style={{ fontSize: 'var(--cp-body-size)', color: 'var(--cp-on-surface)' }}>
                  {multa.player.firstName} {multa.player.lastName}
                </p>
                <p className="truncate" style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-muted)' }}>
                  {multa.reason}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  {multa.pointsPenalty > 0 && (
                    <span className="flex items-center gap-1" style={{ fontSize: '11px', color: '#E53935' }}>
                      <Hash size={11} /> -{multa.pointsPenalty} pts
                    </span>
                  )}
                  {!!multa.chipsAmount && (
                    <span className="flex items-center gap-1" style={{ fontSize: '11px', color: 'var(--cp-on-surface-muted)' }}>
                      <Coins size={11} /> {multa.chipsAmount}
                    </span>
                  )}
                  {!!multa.moneyAmount && (
                    <span className="flex items-center gap-1" style={{ fontSize: '11px', color: 'var(--cp-on-surface-muted)' }}>
                      <DollarSign size={11} /> {multa.moneyAmount}
                    </span>
                  )}
                </div>
              </div>

              {multa.paid ? (
                <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
              ) : (
                <Circle size={18} style={{ color: 'var(--cp-on-surface-muted)' }} />
              )}
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <CPMultaForm
          multa={editingMulta}
          tournamentId={tournamentId}
          players={players}
          isOpen={showForm}
          onClose={() => {
            setShowForm(false)
            setEditingMulta(null)
          }}
          onSave={handleMultaSaved}
        />
      )}
    </div>
  )
}
