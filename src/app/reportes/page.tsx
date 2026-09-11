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
import { CPPageSkeleton } from '@/components/clean-poker/CPPageSkeleton'
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
    return <CPPageSkeleton blocks={[120, 200, 200]} />
  }

  const userInitials = user.firstName && user.lastName ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'PE'
  const tournamentNumber = activeTournament?.number ?? 29
  const selectedTournament = tournaments?.find((t) => t.id === selectedId)

  return (
    <CPAppShell tone="light">
      <CPHeader tone="light"
        userInitials={userInitials}
        userPhotoUrl={user.photoUrl}
        tournamentNumber={tournamentNumber}
        isComision
        hasActiveGameDate={hasActiveGameDate}
      />

      <main className="pb-24 px-4 pt-4 space-y-4">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <FileSpreadsheet size={20} color="#E53935" />
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--cp-on-surface)', letterSpacing: '-0.01em' }}>Reportes</div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--cp-on-surface-variant)', marginTop: -8 }}>
          Descarga el reporte completo de un torneo en Excel: resultados por fecha, matriz de eliminaciones,
          premiación final y días sin ganar.
        </p>

        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--cp-on-surface-variant)', marginBottom: 8 }}>Torneo</p>
          <div
            className="relative flex items-center gap-2"
            style={{
              padding: '10px 12px',
              borderRadius: 14,
              background: '#382E2C',
              border: '1px solid rgba(255,255,255,0.09)'
            }}
          >
            <div style={{ flex: 1, fontSize: 14, fontWeight: 800, color: 'var(--cp-on-surface)' }}>
              {selectedTournament ? `Torneo ${selectedTournament.number} — ${selectedTournament.name}` : 'Selecciona un torneo'}
            </div>
            <ChevronDown size={16} style={{ color: 'var(--cp-on-surface-variant)', flexShrink: 0 }} />
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
            background: 'var(--cp-primary-light)',
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
            <p style={{ fontSize: 12, color: 'var(--cp-primary-light)' }}>{error}</p>
          </div>
        )}

        <HomeCard>
          <div style={{ padding: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--cp-on-surface)', letterSpacing: '0.04em', marginBottom: 8 }}>
              QUÉ INCLUYE EL REPORTE
            </p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                'Resultados por fecha jugada: posición, eliminado por, puntos.',
                'Matriz de eliminaciones: quién eliminó a quién y cuántas veces.',
                'Premiación final: Varón del Torneo, Podio Final, 7/2 Final, Padres e Hijos.',
                'Días sin ganar: última victoria de cada jugador, con la fecha de referencia usada para el cálculo.'
              ].map((text) => (
                <li key={text} style={{ fontSize: 13, color: 'var(--cp-on-surface-variant)', lineHeight: 1.4 }}>
                  · {text}
                </li>
              ))}
            </ul>
          </div>
        </HomeCard>
      </main>

      <CPBottomNav tone="light" />
    </CPAppShell>
  )
}
