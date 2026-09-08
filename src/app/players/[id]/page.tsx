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
import { averageNightlyPosition, averagePointsPerDate } from '@/lib/ranking-utils'
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
  const avgPosition = rankingData ? averageNightlyPosition(rankingData.rankings, playerId) : null
  const avgPoints = myRankingEntry ? averagePointsPerDate(myRankingEntry) : null

  const achievements = useMemo(() => {
    if (!details) return null
    const played = details.datePerformance.filter((d) => d.status === 'completed' && !d.isAbsent)

    // eliminationPosition: 1 = ganador, y sube mientras peor el resultado (más alto = eliminado más temprano).
    const isWinner = (d: (typeof played)[0]) => d.eliminationPosition === undefined || d.eliminationPosition === 1

    const victories = played.filter(isWinner).length

    const podiums = played.filter((d) => isWinner(d) || (d.eliminationPosition !== undefined && d.eliminationPosition <= 3)).length

    const MESA_FINAL_MAX = 9
    const mesaFinalCount = played.filter(
      (d) => isWinner(d) || (d.eliminationPosition !== undefined && d.eliminationPosition <= MESA_FINAL_MAX)
    ).length

    // Último lugar: ganó exactamente 1 punto esa fecha
    const lastPlaceCount = played.filter((d) => d.points === 1).length

    return { victories, podiums, mesaFinalCount, lastPlaceCount }
  }, [details])

  const rivals = useMemo(() => {
    if (!rankingData || !details) return { above: null, below: null }
    const myPos = details.currentStats.position
    const above = rankingData.rankings.find((r) => r.position === myPos - 1) ?? null
    const below = rankingData.rankings.find((r) => r.position === myPos + 1) ?? null
    return { above, below }
  }, [rankingData, details])

  const eliminatedDates = useMemo(() => {
    if (!details || !details.currentStats.eliminasActive) return []
    const n = details.datesToEliminate
    if (n <= 0) return []
    // Mismo criterio que calculateTournamentRanking: ordenar por puntos ascendente
    // (sort estable → en empate gana la fecha más antigua, igual que el servidor).
    const played = [...details.datePerformance]
      .filter((d) => d.status === 'completed')
      .sort((a, b) => a.dateNumber - b.dateNumber)
    return [...played].sort((a, b) => a.points - b.points).slice(0, n)
  }, [details])

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

        {/* RIVAL DIRECTO */}
        {(rivals.above || rivals.below) && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#F5EFE6', letterSpacing: '0.06em', marginBottom: 8 }}>
              {isOwnProfile ? 'TU RIVAL DIRECTO' : 'RIVAL CERCANO'}
            </div>
            <div className="space-y-2">
              {[
                { player: rivals.above, tag: 'ARRIBA' },
                { player: rivals.below, tag: 'ABAJO' }
              ]
                .filter((r): r is { player: NonNullable<typeof rivals.above>; tag: string } => !!r.player)
                .map(({ player, tag }) => (
                  <HomeCard key={player.playerId}>
                    <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <HomeAvatar playerId={player.playerId} name={player.playerName} photoUrl={player.playerPhoto} size={44} fontSize={15} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 8, fontWeight: 800, color: '#7A6E62', letterSpacing: '0.06em', background: 'rgba(255,255,255,0.06)', padding: '2px 5px', borderRadius: 4 }}>
                            {tag}
                          </span>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#F5EFE6' }}>{player.playerName}</div>
                        </div>
                        <div style={{ fontSize: 10, color: '#7A6E62', marginTop: 2 }}>#{player.position} en el torneo</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#F5EFE6' }}>
                          {Math.abs((currentStats.finalScore ?? currentStats.totalPoints) - (player.finalScore ?? player.totalPoints))} pts
                        </div>
                        <div style={{ fontSize: 9, color: '#7A6E62' }}>de diferencia</div>
                      </div>
                    </div>
                  </HomeCard>
                ))}
            </div>
          </div>
        )}

        {/* LOGROS */}
        {achievements && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#F5EFE6', letterSpacing: '0.06em', marginBottom: 8 }}>LOGROS</div>
            <HomeCard>
              <div className="grid grid-cols-4" style={{ padding: '10px 4px' }}>
                {[
                  { val: achievements.victories, label: achievements.victories === 1 ? 'victoria' : 'victorias' },
                  { val: achievements.podiums, label: achievements.podiums === 1 ? 'podio' : 'podios' },
                  { val: achievements.mesaFinalCount, label: achievements.mesaFinalCount === 1 ? 'mesa final' : 'mesas finales' },
                  { val: achievements.lastPlaceCount, label: achievements.lastPlaceCount === 1 ? 'último' : 'últimos' }
                ].map((kpi, i) => (
                  <div
                    key={i}
                    style={{
                      textAlign: 'center',
                      padding: '0 4px',
                      borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : undefined
                    }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#F5EFE6' }}>{kpi.val}</div>
                    <div style={{ fontSize: 8, color: '#8A7E70', marginTop: 1, lineHeight: 1.3 }}>{kpi.label}</div>
                  </div>
                ))}
              </div>
            </HomeCard>
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
              <StatRow label="Posición promedio" value={avgPosition !== null ? `#${Math.round(avgPosition)}` : '—'} />
              <StatRow label="Puntos promedio" value={avgPoints !== null ? `${Math.round(avgPoints)} pts` : '—'} />
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

        {/* FECHAS QUE ELIMINA */}
        {eliminatedDates.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#F5EFE6', letterSpacing: '0.06em', marginBottom: 8 }}>
              {isOwnProfile ? 'FECHAS QUE ELIMINAS' : 'FECHAS QUE ELIMINA'}
            </div>
            <div className="space-y-2">
              {eliminatedDates.map((d) => (
                <HomeCard key={d.dateNumber}>
                  <div style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ textAlign: 'center', flexShrink: 0, width: 34 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#7A6E62' }}>FECHA</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: '#F5EFE6' }}>{d.dateNumber}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 11, color: '#B5A996' }}>
                      {d.isAbsent ? 'Ausencia' : d.eliminationPosition ? `Posición #${d.eliminationPosition}` : 'Ganador'}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#E53935', flexShrink: 0 }}>-{d.points} pts</div>
                  </div>
                </HomeCard>
              ))}
              <HomeCard>
                <div style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#F5EFE6' }}>Total eliminado</span>
                  <span style={{ fontSize: 15, fontWeight: 900, color: '#E53935' }}>
                    -{eliminatedDates.reduce((sum, d) => sum + d.points, 0)} pts
                  </span>
                </div>
              </HomeCard>
            </div>
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
