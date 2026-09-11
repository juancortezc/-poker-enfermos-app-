'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveTournament } from '@/hooks/useActiveTournament'
import { useActiveGameDate } from '@/hooks/useActiveGameDate'
import { CPHeader } from '@/components/clean-poker/CPHeader'
import { CPBottomNav } from '@/components/clean-poker/CPBottomNav'
import { CPAppShell } from '@/components/clean-poker/CPAppShell'
import { CPPageSkeleton } from '@/components/clean-poker/CPPageSkeleton'
import { HomeCard } from '@/components/clean-poker/HomeCard'
import { HomeAvatar } from '@/components/clean-poker/HomeAvatar'
import { LinkCta } from '@/components/clean-poker/LinkCta'

interface EliminationDTO {
  id: number
  position: number
  points: number
  eliminatedPlayer: { id: string; firstName: string; lastName: string; photoUrl?: string | null; role?: string }
  eliminatorPlayer: { id: string; firstName: string; lastName: string } | null
}

const isGuest = (player: { role?: string }) => player.role === 'Invitado'
const pointsLabel = (e: EliminationDTO) => (isGuest(e.eliminatedPlayer) ? '—' : `${e.points} pts`)
interface DatesGameDate {
  id: number
  dateNumber: number
  scheduledDate: string
  status: string
  eliminations: EliminationDTO[]
}

type TabId = 'posiciones' | 'eliminaciones'
const TABS: { id: TabId; label: string }[] = [
  { id: 'posiciones', label: 'Posiciones' },
  { id: 'eliminaciones', label: 'Eliminaciones' }
]

export default function FechaPage() {
  return (
    <Suspense fallback={null}>
      <FechaPageInner />
    </Suspense>
  )
}

function FechaPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const { tournament: activeTournament, isLoading: tournamentLoading } = useActiveTournament({ refreshInterval: 300000 })
  const { hasActiveGameDate } = useActiveGameDate()
  const tournamentId = activeTournament?.id ?? 0

  const { data: dates } = useSWR<DatesGameDate[]>(
    tournamentId ? `/api/tournaments/${tournamentId}/dates` : null,
    { revalidateOnFocus: false }
  )

  const sortedDates = useMemo(() => (dates ? [...dates].sort((a, b) => a.dateNumber - b.dateNumber) : []), [dates])
  const lastCompleted = useMemo(() => [...sortedDates].reverse().find((d) => d.status === 'completed'), [sortedDates])

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [tab, setTab] = useState<TabId>('posiciones')

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'posiciones' || tabParam === 'eliminaciones') {
      setTab(tabParam)
    }
  }, [searchParams])

  const selectedDate = sortedDates.find((d) => d.id === selectedId) ?? lastCompleted ?? sortedDates[0] ?? null

  const isLoading = authLoading || tournamentLoading || !user || !dates

  if (isLoading) {
    return <CPPageSkeleton blocks={[64, 44, 400]} />
  }

  const userInitials = user.firstName && user.lastName ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'PE'
  const tournamentNumber = activeTournament?.number ?? 29
  const isComision = user.role === 'Comision'

  const eliminations = selectedDate?.eliminations ?? []
  const isCompleted = selectedDate?.status === 'completed'
  const results = [...eliminations].sort((a, b) => a.position - b.position)
  const eliminationEvents = [...eliminations].filter((e) => e.position !== 1).sort((a, b) => b.position - a.position)

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
          <div style={{ fontSize: 24, fontWeight: 900, color: '#F5EFE6', letterSpacing: '-0.01em' }}>FECHA</div>
          <div style={{ fontSize: 12, color: '#9A8F8B', marginTop: 2 }}>Torneo {tournamentNumber}</div>
        </div>

        {/* Selector de fecha */}
        {sortedDates.length > 0 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            {sortedDates.map((d) => {
              const isSelected = selectedDate?.id === d.id
              const isDone = d.status === 'completed'
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  style={{
                    flexShrink: 0,
                    minWidth: 42,
                    padding: '8px 4px',
                    borderRadius: 10,
                    textAlign: 'center',
                    background: isSelected ? '#E53935' : isDone ? 'rgba(255,255,255,0.06)' : 'transparent',
                    border: isSelected ? '1px solid #E53935' : '1px solid rgba(255,255,255,0.10)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? '#fff' : '#9A8F8B' }}>F</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: isSelected ? '#fff' : isDone ? '#F5EFE6' : '#5A5048' }}>
                    {d.dateNumber}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {!selectedDate && (
          <HomeCard>
            <div style={{ padding: 20, textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: '#9A8F8B' }}>Todavía no hay fechas registradas.</p>
            </div>
          </HomeCard>
        )}

        {selectedDate && !isCompleted && (
          <HomeCard>
            <div style={{ padding: 20, textAlign: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#F5EFE6' }}>Fecha {selectedDate.dateNumber} todavía no se ha jugado</p>
              <p style={{ fontSize: 13, color: '#9A8F8B', marginTop: 4 }}>
                {new Date(selectedDate.scheduledDate).toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <div style={{ marginTop: 12 }}>
                <LinkCta onClick={() => router.push('/calendario')}>VER CALENDARIO COMPLETO →</LinkCta>
              </div>
            </div>
          </HomeCard>
        )}

        {selectedDate && isCompleted && (
          <>
            {/* Sub-tabs */}
            <div style={{ display: 'flex', gap: 6 }}>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    flex: 1,
                    padding: '9px 4px',
                    borderRadius: 100,
                    fontSize: 13,
                    fontWeight: 700,
                    background: tab === t.id ? '#E53935' : 'rgba(255,255,255,0.06)',
                    color: tab === t.id ? '#fff' : '#9A8F8B',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'posiciones' && (
              <div className="space-y-1.5">
                {results.map((e) => {
                  // Una lista de veinte filas iguales no cuenta nada. El podio y
                  // los malazos son lo que se mira primero, asi que se marcan:
                  // metal arriba, rosa en los dos ultimos.
                  const MEDAL = ['#E8C158', '#C9C6C2', '#C08A54']
                  const medal = e.position <= 3 ? MEDAL[e.position - 1] : null
                  const esMalazo = e.position > results.length - 2
                  const acento = medal ?? (esMalazo ? 'var(--cp-malazo-text)' : null)
                  return (
                  <HomeCard key={e.id} style={acento ? { borderColor: acento, borderWidth: 1 } : undefined}>
                    <div style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
                      {acento && (
                        <span aria-hidden style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 2, background: acento }} />
                      )}
                      <div style={{ width: 22, textAlign: 'center', fontSize: 13, fontWeight: 900, color: acento ?? '#9A8F8B' }}>
                        #{e.position}
                      </div>
                      <HomeAvatar playerId={e.eliminatedPlayer.id} name={e.eliminatedPlayer.firstName} photoUrl={e.eliminatedPlayer.photoUrl} size={32} fontSize={12} />
                      <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: '#F5EFE6' }}>
                        {e.eliminatedPlayer.firstName} {e.eliminatedPlayer.lastName}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: acento ?? '#F5EFE6' }}>{pointsLabel(e)}</div>
                    </div>
                  </HomeCard>
                  )
                })}
              </div>
            )}

            {tab === 'eliminaciones' && (
              <div className="space-y-1.5">
                {eliminationEvents.length === 0 && (
                  <p style={{ fontSize: 12, color: '#9A8F8B', textAlign: 'center', padding: 16 }}>No hay eliminaciones registradas.</p>
                )}
                {eliminationEvents.map((e) => (
                  <HomeCard key={e.id}>
                    <div style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 22, textAlign: 'center', fontSize: 13, fontWeight: 800, color: '#9A8F8B' }}>#{e.position}</div>
                      <HomeAvatar playerId={e.eliminatedPlayer.id} name={e.eliminatedPlayer.firstName} photoUrl={e.eliminatedPlayer.photoUrl} size={30} fontSize={11} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#F5EFE6' }}>
                          {e.eliminatedPlayer.firstName} {e.eliminatedPlayer.lastName}
                        </div>
                        {e.eliminatorPlayer && (
                          <div style={{ fontSize: 12, color: '#9A8F8B' }}>
                            eliminado por {e.eliminatorPlayer.firstName} {e.eliminatorPlayer.lastName}
                          </div>
                        )}
                      </div>
                    </div>
                  </HomeCard>
                ))}
              </div>
            )}
          </>
        )}

        <button
          onClick={() => router.push('/calendario')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '12px',
            borderRadius: 100,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#9A8F8B',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          VER CALENDARIO COMPLETO <ChevronRight size={13} />
        </button>
      </main>

      <CPBottomNav />
    </CPAppShell>
  )
}
