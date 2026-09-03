'use client'

import { useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import { ChevronLeft, Trophy, TrendingUp, TrendingDown, Minus, Settings } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveTournament } from '@/hooks/useActiveTournament'
import { useActiveGameDate } from '@/hooks/useActiveGameDate'
import { useTournamentRanking } from '@/hooks/useTournamentRanking'
import { usePlayerTournamentDetails } from '@/hooks/usePlayerTournamentDetails'
import { CPHeader } from '@/components/clean-poker/CPHeader'
import { CPBottomNav } from '@/components/clean-poker/CPBottomNav'
import { CPAppShell } from '@/components/clean-poker/CPAppShell'
import { HomeCard } from '@/components/clean-poker/HomeCard'
import { HomeAvatar } from '@/components/clean-poker/HomeAvatar'
import { PlayerEvolutionChart } from '@/components/clean-poker/PlayerEvolutionChart'

interface ChampionPlayer {
  id: string
}
interface ChampionData {
  player: ChampionPlayer | null
  championshipsCount: number
}
interface ChampionStatsResponse {
  success: boolean
  data?: { all: ChampionData[] }
}

interface Multa {
  id: number
  reason: string
  pointsPenalty: number
  chipsAmount: number | null
  moneyAmount: number | null
  paid: boolean
}

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

const CREAM_BG = '#F3E6D0'
const CREAM_TEXT = '#2A1F14'
const CREAM_MUTED = '#8A7860'

function TrendBadge({ positionsChanged }: { positionsChanged: number }) {
  if (positionsChanged > 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, color: '#2E7D32', fontSize: 11, fontWeight: 800 }}>
        <TrendingUp size={12} /> +{positionsChanged}
      </div>
    )
  }
  if (positionsChanged < 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, color: '#C62828', fontSize: 11, fontWeight: 800 }}>
        <TrendingDown size={12} /> {positionsChanged}
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, color: CREAM_MUTED, fontSize: 11, fontWeight: 700 }}>
      <Minus size={12} />
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ fontSize: 12, color: '#B5A996' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color: '#F5EFE6' }}>{value}</span>
    </div>
  )
}

export default function PlayerProfilePage() {
  const params = useParams<{ id: string }>()
  const playerId = params.id
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { tournament, isLoading: tournamentLoading } = useActiveTournament({ refreshInterval: 300000 })
  const { hasActiveGameDate } = useActiveGameDate()
  const tournamentId = tournament?.id ?? 0

  const { details, loading: detailsLoading } = usePlayerTournamentDetails(playerId, tournamentId)
  const { ranking: rankingData } = useTournamentRanking(tournamentId, { refreshInterval: 30000, revalidateOnFocus: false })

  const { data: championStats } = useSWR<ChampionStatsResponse>('/api/tournaments/champions-stats', { revalidateOnFocus: false })
  const { data: multas } = useSWR<Multa[]>(
    tournamentId && playerId ? `/api/multas?tournamentId=${tournamentId}&playerId=${playerId}` : null,
    { revalidateOnFocus: false }
  )
  const { data: dates } = useSWR<DatesGameDate[]>(
    tournamentId ? `/api/tournaments/${tournamentId}/dates` : null,
    { revalidateOnFocus: false }
  )

  const playerChampionships = championStats?.data?.all?.find((c) => c.player?.id === playerId)
  const myRankingEntry = rankingData?.rankings.find((r) => r.playerId === playerId)

  const achievements = useMemo(() => {
    if (!details) return null
    const played = details.datePerformance.filter((d) => d.status === 'completed' && !d.isAbsent)

    const podiums = played.filter(
      (d) => d.eliminationPosition === undefined || (d.eliminationPosition !== undefined && d.eliminationPosition <= 3)
    ).length

    let bestScore = 0
    let bestScoreDate = 0
    for (const d of played) {
      if (d.points > bestScore) {
        bestScore = d.points
        bestScoreDate = d.dateNumber
      }
    }

    const MESA_FINAL_MIN = 12
    const isMesaFinal = (d: (typeof played)[0]) =>
      d.eliminationPosition === undefined || (d.eliminationPosition !== undefined && d.eliminationPosition >= MESA_FINAL_MIN)

    const sortedCompleted = [...details.datePerformance].filter((d) => d.status === 'completed').sort((a, b) => a.dateNumber - b.dateNumber)
    let maxMesaStreak = 0
    let curMesaStreak = 0
    for (const d of sortedCompleted) {
      if (!d.isAbsent && isMesaFinal(d)) {
        curMesaStreak++
        maxMesaStreak = Math.max(maxMesaStreak, curMesaStreak)
      } else {
        curMesaStreak = 0
      }
    }

    const sortedEvo = [...details.rankingEvolution].sort((a, b) => a.dateNumber - b.dateNumber)
    let bestRise = 0
    for (let i = 1; i < sortedEvo.length; i++) {
      const rise = sortedEvo[i - 1].position - sortedEvo[i].position
      if (rise > bestRise) bestRise = rise
    }

    return { podiums, bestScore, bestScoreDate, mesaFinalStreak: maxMesaStreak, bestRise }
  }, [details])

  const rival = useMemo(() => {
    if (!rankingData || !details) return null
    const myPos = details.currentStats.position
    const above = rankingData.rankings.find((r) => r.position === myPos - 1)
    const below = rankingData.rankings.find((r) => r.position === myPos + 1)
    return above ?? below ?? null
  }, [rankingData, details])

  const lastThreeDates = useMemo(() => {
    if (!dates) return []
    return [...dates]
      .filter((d) => d.status === 'completed')
      .sort((a, b) => b.dateNumber - a.dateNumber)
      .slice(0, 3)
  }, [dates])

  const isLoading = authLoading || tournamentLoading || !user || detailsLoading || !details

  if (isLoading) {
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

  const isOwnProfile = user.id === playerId
  const { player, currentStats } = details
  const userInitials = user.firstName && user.lastName ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'PE'
  const tournamentNumber = tournament?.number ?? 29
  const isComision = user.role === 'Comision'

  const totalCompletedDates = details.datePerformance.filter((d) => d.status === 'completed').length
  const absences = details.datePerformance.filter((d) => d.status === 'completed' && d.isAbsent).length

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
        <button
          onClick={() => router.back()}
          style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 700, color: '#A89A8C', letterSpacing: '0.04em', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <ChevronLeft size={14} /> VOLVER
        </button>

        {/* HERO */}
        <div style={{ background: CREAM_BG, borderRadius: 18, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <HomeAvatar playerId={player.id} name={`${player.firstName} ${player.lastName}`} photoUrl={player.photoUrl} size={84} fontSize={28} />
              <div
                style={{
                  position: 'absolute',
                  bottom: -6,
                  left: -6,
                  minWidth: 26,
                  height: 26,
                  padding: '0 6px',
                  borderRadius: 8,
                  background: '#E53935',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 900,
                  border: `2px solid ${CREAM_BG}`
                }}
              >
                #{currentStats.position}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 19, fontWeight: 900, color: CREAM_TEXT, lineHeight: 1.15 }}>
                {player.firstName} {player.lastName}
              </div>
              {player.aliases.length > 0 && (
                <div style={{ fontSize: 12, color: '#B5442C', fontWeight: 700, marginTop: 2 }}>&ldquo;{player.aliases[0]}&rdquo;</div>
              )}
              {(playerChampionships?.championshipsCount ?? 0) > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                  <Trophy size={12} color="#8A6A2E" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#8A6A2E' }}>
                    {playerChampionships!.championshipsCount}x campeón
                  </span>
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: CREAM_MUTED, letterSpacing: '0.06em' }}>
                {isOwnProfile ? 'TU POSICIÓN' : 'POSICIÓN'}
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: CREAM_TEXT, lineHeight: 1 }}>#{currentStats.position}</div>
              {myRankingEntry && <TrendBadge positionsChanged={myRankingEntry.positionsChanged} />}
            </div>
          </div>

          <div style={{ display: 'flex', borderTop: '1px solid rgba(0,0,0,0.08)', marginTop: 14, paddingTop: 12 }}>
            {[
              { label: 'FINAL', val: currentStats.finalScore ?? currentStats.totalPoints },
              { label: 'TOTAL', val: currentStats.totalPoints },
              { label: 'FECHAS', val: `${totalCompletedDates - absences}/${totalCompletedDates}` }
            ].map(({ label, val }) => (
              <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: CREAM_MUTED, letterSpacing: '0.1em', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: CREAM_TEXT }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* LOGROS */}
        {achievements && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#F5EFE6', letterSpacing: '0.06em', marginBottom: 8 }}>LOGROS</div>
            <div className="grid grid-cols-2 gap-2">
              <HomeCard>
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 20 }}>🏆</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#F5EFE6', marginTop: 4 }}>{achievements.podiums}</div>
                  <div style={{ fontSize: 9, color: '#8A7E70', marginTop: 1 }}>{achievements.podiums === 1 ? 'podio' : 'podios'}</div>
                </div>
              </HomeCard>
              <HomeCard>
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 20 }}>🔥</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#F5EFE6', marginTop: 4 }}>{achievements.mesaFinalStreak}</div>
                  <div style={{ fontSize: 9, color: '#8A7E70', marginTop: 1 }}>racha mesas finales</div>
                </div>
              </HomeCard>
              <HomeCard>
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 20 }}>⚡</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#F5EFE6', marginTop: 4 }}>
                    {achievements.bestRise > 0 ? `+${achievements.bestRise}` : '—'}
                  </div>
                  <div style={{ fontSize: 9, color: '#8A7E70', marginTop: 1 }}>mejor subida</div>
                </div>
              </HomeCard>
              <HomeCard>
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 20 }}>🎯</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#F5EFE6', marginTop: 4 }}>{achievements.bestScore}</div>
                  <div style={{ fontSize: 9, color: '#8A7E70', marginTop: 1 }}>
                    {achievements.bestScoreDate > 0 ? `pts · F${achievements.bestScoreDate}` : 'pts'}
                  </div>
                </div>
              </HomeCard>
            </div>
          </div>
        )}

        {/* EVOLUCION */}
        {details.rankingEvolution.length > 1 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#F5EFE6', letterSpacing: '0.06em', marginBottom: 8 }}>
              {isOwnProfile ? 'MI EVOLUCIÓN EN EL TORNEO' : 'EVOLUCIÓN EN EL TORNEO'}
            </div>
            <HomeCard>
              <div style={{ padding: 12 }}>
                <PlayerEvolutionChart evolution={details.rankingEvolution} />
              </div>
            </HomeCard>
          </div>
        )}

        {/* RESUMEN */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#F5EFE6', letterSpacing: '0.06em', marginBottom: 8 }}>
            RESUMEN DE {isOwnProfile ? 'TU' : 'SU'} TORNEO
          </div>
          <HomeCard>
            <div style={{ padding: '4px 14px' }}>
              <StatRow label="Mejor resultado" value={details.bestResult} />
              <StatRow label="Fechas jugadas" value={`${totalCompletedDates - absences}/${totalCompletedDates}`} />
              <StatRow label="Ausencias" value={absences} />
              <div style={{ padding: '9px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#B5A996' }}>Puntuación final</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#F5EFE6' }}>{currentStats.finalScore ?? currentStats.totalPoints}</span>
                </div>
              </div>
            </div>
          </HomeCard>
        </div>

        {/* ULTIMAS FECHAS */}
        {lastThreeDates.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#F5EFE6', letterSpacing: '0.06em', marginBottom: 8 }}>
              {isOwnProfile ? 'TUS ÚLTIMAS FECHAS' : 'ÚLTIMAS FECHAS'}
            </div>
            <div className="space-y-2">
              {lastThreeDates.map((d) => {
                const myElim = d.eliminations.find((e) => e.eliminatedPlayer.id === playerId)
                const winner = d.eliminations.find((e) => e.position === 1)
                const participated = !!myElim || winner?.eliminatedPlayer.id === playerId
                return (
                  <HomeCard key={d.id}>
                    <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ textAlign: 'center', flexShrink: 0, width: 34 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#7A6E62' }}>FECHA</div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: '#F5EFE6' }}>{d.dateNumber}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {winner && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <HomeAvatar playerId={winner.eliminatedPlayer.id} name={winner.eliminatedPlayer.firstName} photoUrl={winner.eliminatedPlayer.photoUrl} size={26} fontSize={10} />
                            <div style={{ fontSize: 11, color: '#B5A996' }}>
                              Ganó <span style={{ color: '#F5EFE6', fontWeight: 700 }}>{winner.eliminatedPlayer.firstName}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {participated ? (
                          <>
                            <div style={{ fontSize: 9, color: '#7A6E62', fontWeight: 700 }}>
                              {!myElim ? '¡GANÓ!' : `#${myElim.position}`}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#F5EFE6' }}>{myElim?.points ?? winner?.points ?? ''} pts</div>
                          </>
                        ) : (
                          <div style={{ fontSize: 10, color: '#7A6E62' }}>No participó</div>
                        )}
                      </div>
                    </div>
                  </HomeCard>
                )
              })}
            </div>
          </div>
        )}

        {/* RIVAL DIRECTO */}
        {rival && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#F5EFE6', letterSpacing: '0.06em', marginBottom: 8 }}>
              {isOwnProfile ? 'TU RIVAL DIRECTO' : 'RIVAL CERCANO'}
            </div>
            <HomeCard>
              <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <HomeAvatar playerId={rival.playerId} name={rival.playerName} photoUrl={rival.playerPhoto} size={44} fontSize={15} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#F5EFE6' }}>{rival.playerName}</div>
                  <div style={{ fontSize: 10, color: '#7A6E62' }}>#{rival.position} en el torneo</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#F5EFE6' }}>
                    {Math.abs((currentStats.finalScore ?? currentStats.totalPoints) - (rival.finalScore ?? rival.totalPoints))} pts
                  </div>
                  <div style={{ fontSize: 9, color: '#7A6E62' }}>de diferencia</div>
                </div>
              </div>
            </HomeCard>
          </div>
        )}

        {/* MULTAS */}
        {multas && multas.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#F5EFE6', letterSpacing: '0.06em', marginBottom: 8 }}>MULTAS</div>
            <div className="space-y-1.5">
              {multas.map((multa) => (
                <div
                  key={multa.id}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 12, background: 'rgba(229,57,53,0.10)', border: '1px solid rgba(229,57,53,0.22)' }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#F5EFE6', fontWeight: 700 }}>{multa.reason}</div>
                    <div style={{ fontSize: 10, color: '#B5A996' }}>
                      {multa.pointsPenalty > 0 && `-${multa.pointsPenalty} pts`}
                      {!!multa.chipsAmount && `${multa.pointsPenalty > 0 ? ' · ' : ''}${multa.chipsAmount} fichas`}
                      {!!multa.moneyAmount && `${multa.pointsPenalty > 0 || multa.chipsAmount ? ' · ' : ''}$${multa.moneyAmount}`}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: multa.paid ? '#4CAF50' : '#E53935', flexShrink: 0 }}>
                    {multa.paid ? 'PAGADA' : 'PENDIENTE'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EDITAR PERFIL */}
        {isOwnProfile && (
          <button
            onClick={() => router.push('/perfil')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '13px',
              borderRadius: 100,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#F5EFE6',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Settings size={14} /> EDITAR PERFIL
          </button>
        )}
      </main>

      <CPBottomNav />
    </CPAppShell>
  )
}
