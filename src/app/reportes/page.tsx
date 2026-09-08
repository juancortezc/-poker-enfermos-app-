'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Download, Loader2, FileSpreadsheet, ChevronDown } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveTournament } from '@/hooks/useActiveTournament'
import { useActiveGameDate } from '@/hooks/useActiveGameDate'
import { CPHeader } from '@/components/clean-poker/CPHeader'
import { CPBottomNav } from '@/components/clean-poker/CPBottomNav'
import { CPAppShell } from '@/components/clean-poker/CPAppShell'
import { HomeCard } from '@/components/clean-poker/HomeCard'
import { buildAuthHeaders } from '@/lib/client-auth'

interface TournamentOption {
  id: number
  number: number
  name: string
  status: string
}

export default function ReportesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { tournament: activeTournament, isLoading: tournamentLoading } = useActiveTournament({ refreshInterval: 300000 })
  const { hasActiveGameDate } = useActiveGameDate()

  const { data: tournaments } = useSWR<TournamentOption[]>('/api/tournaments', { revalidateOnFocus: false })
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (selectedId === null && activeTournament?.id) {
      setSelectedId(activeTournament.id)
    }
  }, [activeTournament?.id, selectedId])

  useEffect(() => {
    if (!authLoading && user && user.role !== 'Comision') {
      router.replace('/mas')
    }
  }, [user, authLoading, router])

  const handleDownload = async () => {
    if (!selectedId) return
    setDownloading(true)
    setError(null)
    try {
      const res = await fetch(`/api/stats/tournament-report/${selectedId}`, {
        headers: buildAuthHeaders()
      })
      if (!res.ok) {
        throw new Error('No se pudo generar el reporte')
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = disposition.match(/filename="(.+)"/)
      const filename = match ? match[1] : `torneo-${selectedId}-reporte.xlsx`

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      setError('No se pudo generar el reporte. Intenta de nuevo.')
    } finally {
      setDownloading(false)
    }
  }

  const isLoading = authLoading || tournamentLoading || !user

  if (isLoading || user.role !== 'Comision') {
    return (
      <CPAppShell>
        <div className="min-h-screen flex items-center justify-center">
          <div
            className="w-10 h-10 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--cp-surface-border)', borderTopColor: 'var(--cp-primary)' }}
          />
        </div>
      </CPAppShell>
    )
  }

  const userInitials = user.firstName && user.lastName ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'PE'
  const tournamentNumber = activeTournament?.number ?? 29
  const selectedTournament = tournaments?.find((t) => t.id === selectedId)

  return (
    <CPAppShell>
      <CPHeader
        userInitials={userInitials}
        userPhotoUrl={user.photoUrl}
        tournamentNumber={tournamentNumber}
        isComision
        hasActiveGameDate={hasActiveGameDate}
      />

      <main className="pb-24 px-4 pt-4 space-y-4">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <FileSpreadsheet size={20} color="#E53935" />
          <div style={{ fontSize: 22, fontWeight: 900, color: '#F5EFE6', letterSpacing: '-0.01em' }}>Reportes</div>
        </div>
        <p style={{ fontSize: 12, color: '#7A6E62', marginTop: -8 }}>
          Descarga el reporte completo de un torneo en Excel: resultados por fecha, matriz de eliminaciones,
          premiación final y días sin ganar.
        </p>

        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#7A6E62', marginBottom: 8 }}>Torneo</p>
          <div
            className="relative flex items-center gap-2"
            style={{
              padding: '10px 12px',
              borderRadius: 14,
              background: '#2A292B',
              border: '1px solid rgba(255,255,255,0.09)'
            }}
          >
            <div style={{ flex: 1, fontSize: 14, fontWeight: 800, color: '#F5EFE6' }}>
              {selectedTournament ? `Torneo ${selectedTournament.number} — ${selectedTournament.name}` : 'Selecciona un torneo'}
            </div>
            <ChevronDown size={16} style={{ color: '#7A6E62', flexShrink: 0 }} />
            <select
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(Number(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            >
              {(tournaments ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  Torneo {t.number} — {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={!selectedId || downloading}
          className="w-full flex items-center justify-center gap-2"
          style={{
            padding: '13px 16px',
            background: '#E53935',
            color: '#fff',
            borderRadius: 100,
            fontSize: 13,
            fontWeight: 800,
            opacity: !selectedId || downloading ? 0.7 : 1,
            border: 'none',
            cursor: !selectedId || downloading ? 'default' : 'pointer'
          }}
        >
          {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {downloading ? 'GENERANDO...' : 'DESCARGAR XLSX'}
        </button>

        {error && (
          <div style={{ padding: 12, borderRadius: 12, background: 'rgba(229,57,53,0.10)', border: '1px solid rgba(229,57,53,0.28)' }}>
            <p style={{ fontSize: 12, color: '#E53935' }}>{error}</p>
          </div>
        )}

        <HomeCard>
          <div style={{ padding: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#F5EFE6', letterSpacing: '0.04em', marginBottom: 8 }}>
              QUÉ INCLUYE EL REPORTE
            </p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                'Resultados por fecha jugada: posición, eliminado por, puntos.',
                'Matriz de eliminaciones: quién eliminó a quién y cuántas veces.',
                'Premiación final: Varón del Torneo, Podio Final, 7/2 Final, Padres e Hijos.',
                'Días sin ganar: última victoria de cada jugador, con la fecha de referencia usada para el cálculo.'
              ].map((text) => (
                <li key={text} style={{ fontSize: 11, color: '#B5A996', lineHeight: 1.4 }}>
                  · {text}
                </li>
              ))}
            </ul>
          </div>
        </HomeCard>
      </main>

      <CPBottomNav />
    </CPAppShell>
  )
}
