'use client'

import { Receipt, Hash, Coins, DollarSign } from 'lucide-react'
import useSWR from 'swr'
import { useActiveTournament } from '@/hooks/useActiveTournament'

interface Multa {
  id: number
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

export default function MultasTab() {
  const { tournament } = useActiveTournament({ refreshInterval: 300000 })

  const { data: multas, isLoading } = useSWR<Multa[]>(
    tournament?.id ? `/api/multas?tournamentId=${tournament.id}` : null,
    (url: string) => fetch(url).then(res => res.json() as Promise<Multa[]>)
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className="rounded-2xl p-4 text-center"
        style={{ background: 'var(--cp-surface)', border: '1px solid var(--cp-surface-border)' }}
      >
        <Receipt className="w-10 h-10 mx-auto mb-2" style={{ color: '#E53935' }} />
        <h2 className="text-lg font-bold" style={{ color: 'var(--cp-on-surface)' }}>
          Multas Registradas
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--cp-on-surface-muted)' }}>
          Torneo {tournament?.number ?? ''} — registro oficial de multas por incumplimiento
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--cp-surface-border)', borderTopColor: '#E53935' }}
          />
        </div>
      ) : !multas || multas.length === 0 ? (
        <div
          className="rounded-2xl p-6 text-center"
          style={{ background: 'var(--cp-surface)', border: '1px solid var(--cp-surface-border)' }}
        >
          <p style={{ fontSize: 'var(--cp-body-size)', color: 'var(--cp-on-surface-muted)' }}>
            No hay multas registradas en este torneo
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {multas.map((multa) => (
            <div
              key={multa.id}
              className="rounded-2xl px-4 py-3"
              style={{ background: 'var(--cp-surface)', border: '1px solid var(--cp-surface-border)' }}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold" style={{ fontSize: 'var(--cp-body-size)', color: 'var(--cp-on-surface)' }}>
                  {multa.player.firstName} {multa.player.lastName}
                </p>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    background: multa.paid ? 'rgba(22,163,74,0.15)' : 'rgba(229,57,53,0.15)',
                    color: multa.paid ? '#16a34a' : '#E53935',
                  }}
                >
                  {multa.paid ? 'Pagada' : 'Pendiente'}
                </span>
              </div>
              <p className="mt-1" style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-variant)' }}>
                {multa.reason}
              </p>
              <div className="flex items-center gap-4 mt-2">
                {multa.pointsPenalty > 0 && (
                  <span className="flex items-center gap-1" style={{ fontSize: '11px', color: '#E53935', fontWeight: 600 }}>
                    <Hash size={12} /> -{multa.pointsPenalty} pts
                  </span>
                )}
                {!!multa.chipsAmount && (
                  <span className="flex items-center gap-1" style={{ fontSize: '11px', color: 'var(--cp-on-surface-muted)' }}>
                    <Coins size={12} /> {multa.chipsAmount} fichas
                  </span>
                )}
                {!!multa.moneyAmount && (
                  <span className="flex items-center gap-1" style={{ fontSize: '11px', color: 'var(--cp-on-surface-muted)' }}>
                    <DollarSign size={12} /> {multa.moneyAmount}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
