'use client'

import useSWR from 'swr'
import Image from 'next/image'
import type { PlayerRanking, PlayerPositionDelta } from '@/lib/ranking-utils'
import { HomeAvatar } from './HomeAvatar'
import { HomeCard } from './HomeCard'
import { LinkCta } from './LinkCta'
import { PodioTorneoCard } from './PodioTorneoCard'
import { StreaksCards } from './StreaksCards'

interface EliminationDTO {
  id: number
  gameDateId: number
  position: number
  points: number
  eliminatedPlayer: { id: string; firstName: string; lastName: string }
  eliminatorPlayer: { id: string; firstName: string; lastName: string } | null
  eliminationTime: string
}

interface HomeUltimaFechaProps {
  user: { id: string }
  tournamentNumber: number
  rankings: PlayerRanking[]
  lastCompletedDate: { id: number; dateNumber: number }
  streaks?: { hot: PlayerPositionDelta[]; cold: PlayerPositionDelta[] }
  onOpenProfile: () => void
  onSeeAllResults: () => void
  onSeeResultsTab: () => void
  onSeeFullTable: () => void
}

const scoreOf = (r: PlayerRanking) => r.finalScore ?? r.totalPoints

export function HomeUltimaFecha({
  user,
  tournamentNumber,
  rankings,
  lastCompletedDate,
  streaks,
  onOpenProfile,
  onSeeAllResults,
  onSeeResultsTab,
  onSeeFullTable
}: HomeUltimaFechaProps) {
  const { data: eliminations } = useSWR<EliminationDTO[]>(
    `/api/eliminations/game-date/${lastCompletedDate.id}`,
    { revalidateOnFocus: false }
  )

  if (!eliminations || eliminations.length === 0 || rankings.length === 0) {
    return (
      <HomeCard style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: '#7A6E62' }}>Cargando la última fecha...</div>
      </HomeCard>
    )
  }

  // Las eliminaciones no traen foto — se cruza con el ranking del torneo, que sí la tiene.
  const photoByPlayerId = new Map(rankings.map(r => [r.playerId, r.playerPhoto]))

  const sorted = [...eliminations].sort((a, b) => a.position - b.position)
  const winner = sorted.find(e => e.position === 1)
  const podium = sorted.filter(e => e.position <= 3)

  // El Varón de la Noche: más eliminaciones esa fecha
  const killCounts = new Map<string, { name: string; count: number }>()
  sorted.forEach(e => {
    if (!e.eliminatorPlayer) return
    const key = e.eliminatorPlayer.id
    const entry = killCounts.get(key) ?? { name: `${e.eliminatorPlayer.firstName} ${e.eliminatorPlayer.lastName}`, count: 0 }
    entry.count += 1
    killCounts.set(key, entry)
  })
  const varonDeLaNoche = Array.from(killCounts.entries())
    .map(([playerId, v]) => ({ playerId, ...v }))
    .sort((a, b) => b.count - a.count)[0]

  // El Malazo: primero eliminado (mayor position)
  const elMalazoElim = sorted[sorted.length - 1]

  // Noche para Olvidar / El que Más Subió: mayor caída / mayor subida en el torneo
  const fallers = rankings.filter(r => r.positionsChanged < 0)
  const risers = rankings.filter(r => r.positionsChanged > 0)
  const nocheParaOlvidar = fallers.length
    ? fallers.reduce((min, r) => (r.positionsChanged < min.positionsChanged ? r : min))
    : null
  const elQueMasSubio = risers.length
    ? risers.reduce((max, r) => (r.positionsChanged > max.positionsChanged ? r : max))
    : null

  const myNightElim = sorted.find(e => e.eliminatedPlayer.id === user.id)
  const myRanking = rankings.find(r => r.playerId === user.id)
  const leaderScore = rankings.length ? scoreOf(rankings[0]) : 0
  const gapToLeader = myRanking ? leaderScore - scoreOf(myRanking) : null

  const insightCards = [
    varonDeLaNoche && {
      key: 'varon',
      label: 'EL VARÓN DE LA NOCHE',
      color: '#4CAF50',
      name: varonDeLaNoche.name,
      detail: `${varonDeLaNoche.count} eliminaciones`,
      playerId: varonDeLaNoche.playerId
    },
    elMalazoElim && {
      key: 'malazo',
      label: 'EL MALAZO',
      color: '#E53935',
      name: `${elMalazoElim.eliminatedPlayer.firstName} ${elMalazoElim.eliminatedPlayer.lastName}`,
      detail: 'primero eliminado',
      playerId: elMalazoElim.eliminatedPlayer.id
    },
    nocheParaOlvidar && {
      key: 'olvidar',
      label: 'NOCHE PARA OLVIDAR',
      color: '#6FA3E0',
      name: nocheParaOlvidar.playerName,
      detail: `bajó ${Math.abs(nocheParaOlvidar.positionsChanged)} puestos en el Torneo`,
      playerId: nocheParaOlvidar.playerId
    },
    elQueMasSubio && {
      key: 'contento',
      label: 'EL MÁS CONTENTO',
      color: '#4CAF50',
      name: elQueMasSubio.playerName,
      detail: `+${elQueMasSubio.positionsChanged} posiciones`,
      playerId: elQueMasSubio.playerId
    }
  ].filter((c): c is NonNullable<typeof c> => Boolean(c))

  return (
    <>
      {/* WINNER HERO */}
      {winner && (() => {
        const winnerPhoto = photoByPlayerId.get(winner.eliminatedPlayer.id)
        return (
          <HomeCard style={{ padding: 0, position: 'relative', overflow: 'hidden', minHeight: 168 }}>
            {winnerPhoto && (
              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '46%' }}>
                <Image
                  src={winnerPhoto}
                  alt={winner.eliminatedPlayer.firstName}
                  fill
                  className="object-cover object-top"
                  unoptimized
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(42,41,43,0.45) 0%, transparent 16%)' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 68%, rgba(20,17,14,0.45) 100%)' }} />
              </div>
            )}
            <div style={{ padding: '18px 16px', position: 'relative', zIndex: 1, maxWidth: winnerPhoto ? '52%' : '100%' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#7A6E62', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
                Fecha {lastCompletedDate.dateNumber}
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#F5EFE6', lineHeight: 1.05, letterSpacing: '-0.01em' }}>
                ¡{winner.eliminatedPlayer.firstName.toUpperCase()}<br />GANÓ LA FECHA!
              </div>
              <button
                onClick={onSeeAllResults}
                style={{
                  marginTop: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#E53935',
                  color: '#fff',
                  padding: '9px 16px',
                  borderRadius: 100,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.03em',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                VER RESUMEN
              </button>
            </div>
            {!winnerPhoto && (
              <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}>
                <HomeAvatar
                  playerId={winner.eliminatedPlayer.id}
                  name={`${winner.eliminatedPlayer.firstName} ${winner.eliminatedPlayer.lastName}`}
                  size={88}
                  fontSize={26}
                />
              </div>
            )}
          </HomeCard>
        )
      })()}

      {/* PODIUM DE LA FECHA */}
      {podium.length > 0 && (
        <HomeCard style={{ padding: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#F5EFE6', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Podio Fecha {lastCompletedDate.dateNumber}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {podium.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <HomeAvatar
                  playerId={e.eliminatedPlayer.id}
                  name={`${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName}`}
                  photoUrl={photoByPlayerId.get(e.eliminatedPlayer.id)}
                  size={52}
                  fontSize={15}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#F5EFE6' }}>
                    {e.eliminatedPlayer.firstName} {e.eliminatedPlayer.lastName[0]}.
                  </div>
                  <div style={{ fontSize: 10, fontWeight: e.position === 1 ? 800 : 600, color: e.position === 1 ? '#E8C158' : '#A89A8C', letterSpacing: e.position === 1 ? '0.04em' : undefined }}>
                    {e.position === 1 ? 'CAMPEÓN' : `${e.position}° puesto`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: e.position === 1 ? '#E8C158' : '#F5EFE6' }}>{e.points}</div>
                  <div style={{ fontSize: 8, fontWeight: 700, color: '#7A6E62' }}>PTS</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <LinkCta onClick={onSeeResultsTab}>VER TODOS LOS RESULTADOS →</LinkCta>
          </div>
        </HomeCard>
      )}

      {/* PERSONAL STATS */}
      {myRanking && myNightElim && (
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, background: 'linear-gradient(160deg,#E53935,#B32623)', borderRadius: 16, padding: 14, color: '#fff' }}>
            {myNightElim.position === 1 ? (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.85 }}>{myNightElim.eliminatedPlayer.firstName}</div>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', marginTop: 2 }}>¡Ganaste!</div>
                <div style={{ fontSize: 11, fontWeight: 700, marginTop: 6 }}>{myNightElim.points} pts</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.85 }}>Te eliminaron en posición:</div>
                <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.02em', marginTop: 2 }}>#{myNightElim.position}</div>
                <div style={{ fontSize: 11, fontWeight: 700, marginTop: 6 }}>{myNightElim.points} pts</div>
                {myNightElim.eliminatorPlayer && (
                  <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.85, marginTop: 2 }}>
                    Te eliminó: {myNightElim.eliminatorPlayer.firstName} {myNightElim.eliminatorPlayer.lastName}
                  </div>
                )}
              </>
            )}
          </div>
          <HomeCard style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#A89A8C' }}>En el campeonato estás</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: '#F5EFE6', letterSpacing: '-0.02em', marginTop: 2 }}>#{myRanking.position}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#F5EFE6', marginTop: 2 }}>{scoreOf(myRanking)} puntos</div>
            {gapToLeader !== null && (
              <div style={{ fontSize: 9, color: '#7A6E62', marginTop: 6 }}>
                {gapToLeader === 0 ? 'eres el líder' : `a ${gapToLeader} ${gapToLeader === 1 ? 'punto' : 'puntos'} del líder`}
              </div>
            )}
            <LinkCta onClick={onOpenProfile} style={{ marginTop: 'auto', paddingTop: 8 }}>VER MI TORNEO →</LinkCta>
          </HomeCard>
        </div>
      )}

      {/* LO QUE DEJO LA NOCHE */}
      {insightCards.length > 0 && (
        <div>
          <div style={{ marginBottom: 10, padding: '0 2px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#F5EFE6', letterSpacing: '0.04em' }}>LO QUE DEJÓ LA NOCHE</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${insightCards.length}, minmax(0,1fr))`, gap: 8 }}>
            {insightCards.map(card => (
              <HomeCard key={card.key} style={{ padding: 8, textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <HomeAvatar playerId={card.playerId} name={card.name} photoUrl={photoByPlayerId.get(card.playerId)} size={64} fontSize={20} />
                </div>
                <div style={{ fontSize: 9, fontWeight: 800, color: card.color, marginTop: 6, minHeight: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1.3 }}>
                  {card.label}
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#F5EFE6', marginTop: 3, minHeight: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {card.name}
                </div>
                <div style={{ fontSize: 8, color: '#A89A8C', marginTop: 'auto', paddingTop: 2, lineHeight: 1.3 }}>{card.detail}</div>
              </HomeCard>
            ))}
          </div>
        </div>
      )}

      <PodioTorneoCard tournamentNumber={tournamentNumber} top3={rankings.slice(0, 3)} showNightContext onSeeAll={onSeeFullTable} />

      {streaks && <StreaksCards hot={streaks.hot} cold={streaks.cold} />}
    </>
  )
}

export default HomeUltimaFecha
