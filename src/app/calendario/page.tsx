'use client'

import useSWR from 'swr'
import { Trophy, Clock, CalendarPlus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveTournament } from '@/hooks/useActiveTournament'
import { useActiveGameDate } from '@/hooks/useActiveGameDate'
import { CPHeader } from '@/components/clean-poker/CPHeader'
import { CPBottomNav } from '@/components/clean-poker/CPBottomNav'
import { CPAppShell } from '@/components/clean-poker/CPAppShell'
import { FechaTimelineItem } from '@/components/clean-poker/FechaTimelineItem'
import { downloadSeasonIcs } from '@/lib/ics'
import { isBirthdayNearDate } from '@/lib/birthday-utils'

interface EliminationDTO {
  id: number
  position: number
  points: number
  eliminatedPlayer: { id: string; firstName: string; lastName: string; photoUrl?: string | null }
  eliminatorPlayer: { id: string; firstName: string; lastName: string } | null
}

interface DatesGameDate {
  id: number
  dateNumber: number
  scheduledDate: string
  status: string
  eliminations: EliminationDTO[]
}

interface PlayerLite {
  id: string
  firstName: string
  lastName: string
  birthDate: string | null
}

export default function FechaPage() {
  const { user, loading: authLoading } = useAuth()
  const {
    tournament: activeTournament,
    isLoading: tournamentLoading,
    nextDate,
    seasonEndDate,
  } = useActiveTournament({ refreshInterval: 300000 })
  const { hasActiveGameDate } = useActiveGameDate()

  const { data: dates } = useSWR<DatesGameDate[]>(
    activeTournament?.id ? `/api/tournaments/${activeTournament.id}/dates` : null,
    { revalidateOnFocus: false }
  )
  const { data: players } = useSWR<PlayerLite[]>('/api/players', { revalidateOnFocus: false })

  if (authLoading || tournamentLoading || !user) {
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

  const userInitials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'PE'
  const tournamentNumber = activeTournament?.number ?? 29
  const isComision = user.role === 'Comision'

  const sortedDates = dates ? [...dates].sort((a, b) => a.dateNumber - b.dateNumber) : []
  const completedCount = sortedDates.filter((d) => d.status === 'completed').length
  const totalCount = activeTournament?.totalDates ?? sortedDates.length
  const remaining = Math.max(0, totalCount - completedCount)
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const nextDaysUntil = nextDate?.scheduledDate
    ? Math.max(0, Math.ceil((new Date(nextDate.scheduledDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  const birthdayForDate = (scheduledDate: string): string | null => {
    if (!players) return null
    const match = players.find((p) => isBirthdayNearDate(p.birthDate, new Date(scheduledDate)))
    return match ? `${match.firstName} ${match.lastName}` : null
  }

  const handleDownloadIcs = () => {
    const futureDates = sortedDates.filter((d) => d.status === 'pending' || d.status === 'CREATED')
    if (futureDates.length === 0) return
    downloadSeasonIcs(
      futureDates.map((d) => ({
        uid: `gamedate-${d.id}`,
        title: `Poker Enfermos - Fecha ${d.dateNumber}`,
        start: d.scheduledDate
      })),
      `poker-enfermos-torneo-${tournamentNumber}.ics`
    )
  }

  return (
    <CPAppShell>
      <CPHeader
        userInitials={userInitials}
        userPhotoUrl={user.photoUrl}
        tournamentNumber={tournamentNumber}
        isComision={isComision}
        hasActiveGameDate={hasActiveGameDate}
      />

      <main className="pb-24 px-4 pt-4 space-y-4">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#F5EFE6', letterSpacing: '-0.01em' }}>CALENDARIO</div>
          <div style={{ fontSize: 12, color: '#A89A8C', marginTop: 2 }}>Todas las fechas del Torneo {tournamentNumber}</div>
        </div>

        {/* PRÓXIMA FECHA HERO */}
        {nextDate && (
          <div
            style={{
              background: '#F3E6D0',
              borderRadius: 18,
              padding: 18,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                display: 'inline-block',
                background: '#E53935',
                color: '#fff',
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.04em',
                padding: '4px 10px',
                borderRadius: 100,
                marginBottom: 8
              }}
            >
              PRÓXIMA FECHA
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#8A7860' }}>FECHA {nextDate.dateNumber}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#2A1F14', lineHeight: 1.05 }}>
              {new Date(nextDate.scheduledDate ?? '').toLocaleDateString('es-EC', { day: 'numeric', month: 'short' }).toUpperCase()}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: '#E53935', fontSize: 12, fontWeight: 700 }}>
              <Clock size={14} />
              FALTAN {nextDaysUntil} {nextDaysUntil === 1 ? 'DÍA' : 'DÍAS'}
            </div>
          </div>
        )}

        {/* TEMPORADA STATS */}
        <div
          style={{
            background: '#17140F',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: 14
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Trophy size={14} color="#D8A84E" />
            <div style={{ fontSize: 10, fontWeight: 800, color: '#D8A84E', letterSpacing: '0.08em' }}>TEMPORADA</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#F5EFE6' }}>{completedCount}</div>
              <div style={{ fontSize: 9, color: '#7A6E62' }}>JUGADAS</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#F5EFE6' }}>{remaining}</div>
              <div style={{ fontSize: 9, color: '#7A6E62' }}>POR JUGAR</div>
            </div>
          </div>
          <div style={{ marginTop: 10, height: 6, borderRadius: 100, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: '#E53935', borderRadius: 100 }} />
          </div>
          {seasonEndDate && (
            <div style={{ marginTop: 10, fontSize: 10, color: '#A89A8C' }}>
              Final: {new Date(seasonEndDate).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          )}
        </div>

        {/* LINEA DE TIEMPO */}
        {sortedDates.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#F5EFE6', letterSpacing: '0.06em', marginBottom: 10 }}>
              LÍNEA DE TIEMPO DEL TORNEO
            </div>
            {sortedDates.map((d, index) => (
              <FechaTimelineItem
                key={d.id}
                dateNumber={d.dateNumber}
                scheduledDate={d.scheduledDate}
                status={d.status}
                eliminations={d.eliminations}
                isNext={nextDate?.id === d.id}
                isLast={index === sortedDates.length - 1}
                currentUserId={user.id}
                birthdayPlayerName={d.status !== 'completed' ? birthdayForDate(d.scheduledDate) : null}
              />
            ))}
          </div>
        )}

        {/* AGREGAR AL CALENDARIO */}
        <div
          style={{
            background: '#2A292B',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 16,
            padding: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}
        >
          <CalendarPlus size={20} color="#E53935" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#F5EFE6' }}>Agrega las fechas a tu calendario</div>
            <div style={{ fontSize: 10, color: '#7A6E62' }}>No te pierdas ninguna fecha del torneo.</div>
          </div>
          <button
            onClick={handleDownloadIcs}
            style={{
              background: '#E53935',
              color: '#fff',
              fontSize: 11,
              fontWeight: 800,
              padding: '9px 14px',
              borderRadius: 100,
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            AGREGAR
          </button>
        </div>
      </main>

      <CPBottomNav />
    </CPAppShell>
  )
}
