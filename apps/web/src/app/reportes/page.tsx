'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Download, Loader2, FileSpreadsheet, ChevronDown } from 'lucide-react'
import { REPORT_SHEETS, type TournamentReportSummaryResponse } from '@poker/shared'
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

const LABEL: CSSProperties = {
  fontFamily: 'var(--cp-font-display)',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.08em',
  color: 'var(--cp-on-surface-muted)',
  textTransform: 'uppercase',
  margin: 0
}

/**
 * Reportes (solo Comision). Elige un torneo, mira el Resumen (los mismos
 * numeros de la hoja Resumen del Excel) y descarga el .xlsx con todas las
 * hojas. Por defecto, el torneo activo; si no hay, el mas reciente.
 */
export default function ReportesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { tournament: activeTournament, isLoading: tournamentLoading } = useActiveTournament({ refreshInterval: 300000 })
  const { hasActiveGameDate } = useActiveGameDate()

  const isComision = user?.role === 'Comision'
  const { data: tournamentList } = useSWR<TournamentOption[]>(isComision ? '/api/tournaments' : null, { revalidateOnFocus: false })
  const tournaments = useMemo(
    () => [...(tournamentList ?? [])].sort((a, b) => b.number - a.number),
    [tournamentList]
  )
  const [pickedId, setPickedId] = useState<number | null>(null)
  const selectedId = pickedId ?? activeTournament?.id ?? tournaments[0]?.id ?? null
  const selectedTournament = tournaments.find((t) => t.id === selectedId)

  const { data: report, error: summaryError, isLoading: summaryLoading } = useSWR<TournamentReportSummaryResponse>(
    isComision && selectedId ? `/api/stats/tournament-report/${selectedId}/summary` : null,
    { revalidateOnFocus: false }
  )

  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      const filename = match ? match[1] : `torneo-${selectedTournament?.number ?? selectedId}-reporte.xlsx`

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
  const tournamentNumber = activeTournament?.number ?? selectedTournament?.number ?? 0

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
          <FileSpreadsheet size={20} style={{ color: 'var(--cp-primary-on-light)' }} />
          <h1 style={{ margin: 0, fontFamily: 'var(--cp-font-display)', fontSize: 22, fontWeight: 800, color: 'var(--cp-on-surface)', letterSpacing: '-0.01em' }}>
            Reportes
          </h1>
        </div>
        <p style={{ fontSize: 13, color: 'var(--cp-on-surface-variant)', marginTop: -8 }}>
          El reporte de fin de torneo en Excel, listo para armar la presentación.
        </p>

        <div>
          <label htmlFor="reporte-torneo" style={{ ...LABEL, display: 'block', marginBottom: 8 }}>Torneo</label>
          <div
            className="relative flex items-center gap-2"
            style={{
              minHeight: 44,
              padding: '10px 12px',
              borderRadius: 5,
              background: 'var(--cp-surface-1)',
              border: '1px solid var(--cp-surface-border)'
            }}
          >
            <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--cp-on-surface)' }}>
              {selectedTournament
                ? `Torneo ${selectedTournament.number}${selectedTournament.status === 'ACTIVO' ? ' · activo' : ''}`
                : tournaments.length ? 'Selecciona un torneo' : 'Cargando torneos…'}
            </div>
            <ChevronDown size={16} style={{ color: 'var(--cp-on-surface-variant)', flexShrink: 0 }} />
            <select
              id="reporte-torneo"
              value={selectedId ?? ''}
              onChange={(e) => setPickedId(Number(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  Torneo {t.number}
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
            minHeight: 44,
            padding: '13px 16px',
            background: 'var(--cp-primary)',
            color: 'var(--cp-on-primary)',
            borderRadius: 5,
            fontFamily: 'var(--cp-font-display)',
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: '0.04em',
            opacity: !selectedId || downloading ? 0.7 : 1,
            border: 'none',
            cursor: !selectedId || downloading ? 'default' : 'pointer'
          }}
        >
          {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {downloading ? 'GENERANDO…' : 'DESCARGAR XLSX'}
        </button>

        {error && (
          <div role="alert" style={{ padding: 12, borderRadius: 5, background: 'var(--cp-surface-2)', border: '1px solid var(--cp-primary)' }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--cp-primary-on-light)' }}>{error}</p>
          </div>
        )}

        <HomeCard>
          <div style={{ padding: 16 }}>
            <p style={LABEL}>Resumen del torneo</p>
            {summaryLoading && (
              <p style={{ fontSize: 13, color: 'var(--cp-on-surface-muted)', marginTop: 10 }}>Calculando…</p>
            )}
            {summaryError && !summaryLoading && (
              <p style={{ fontSize: 13, color: 'var(--cp-primary-on-light)', marginTop: 10 }}>No se pudo cargar el resumen.</p>
            )}
            {report && (
              <dl style={{ margin: '10px 0 0', display: 'flex', flexDirection: 'column' }}>
                {report.rows.map((row, i) => (
                  <div
                    key={row.label}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      columnGap: 12,
                      padding: '9px 0',
                      borderTop: i === 0 ? 'none' : '1px solid var(--cp-surface-border)'
                    }}
                  >
                    <dt style={{ fontSize: 13, color: 'var(--cp-on-surface-variant)' }}>{row.label}</dt>
                    <dd
                      style={{
                        margin: 0,
                        textAlign: 'right',
                        fontFamily: 'var(--cp-font-display)',
                        fontWeight: 800,
                        fontSize: 15,
                        fontVariantNumeric: 'tabular-nums',
                        color: row.fillIn ? 'var(--cp-on-surface-muted)' : 'var(--cp-on-surface)'
                      }}
                    >
                      {row.fillIn ? 'Completar' : row.value ?? '—'}
                    </dd>
                    {row.detail && !row.fillIn && (
                      <dd style={{ gridColumn: '1 / -1', margin: '2px 0 0', fontSize: 12, color: 'var(--cp-on-surface-muted)', lineHeight: 1.4 }}>
                        {row.detail}
                      </dd>
                    )}
                  </div>
                ))}
              </dl>
            )}
          </div>
        </HomeCard>

        <HomeCard>
          <div style={{ padding: 16 }}>
            <p style={{ ...LABEL, marginBottom: 10 }}>
              Qué trae el Excel · {REPORT_SHEETS.length} hojas
            </p>
            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {REPORT_SHEETS.map((sheet, i) => (
                <li key={sheet.name} style={{ display: 'flex', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--cp-font-display)', fontWeight: 800, fontSize: 13, color: 'var(--cp-primary-on-light)', minWidth: 18 }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--cp-on-surface-variant)', lineHeight: 1.4 }}>
                    <strong style={{ color: 'var(--cp-on-surface)', fontWeight: 700 }}>{sheet.name}.</strong> {sheet.description}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </HomeCard>
      </main>

      <CPBottomNav tone="light" />
    </CPAppShell>
  )
}
