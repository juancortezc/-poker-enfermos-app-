'use client'

import useSWR from 'swr'
import Image from 'next/image'
import { scoreOf } from '@/lib/ranking-utils'
import type { PlayerRanking, PlayerPositionDelta } from '@/lib/ranking-utils'
import { HomeAvatar } from './HomeAvatar'
import { LinkCta } from './LinkCta'
import { Score } from './Score'
import { tile, overline, BENTO, SOBRE_COLOR } from './bento'
import { playerLabel, shortenFullName } from '@/lib/player-name'

interface EliminationDTO {
  id: number
  gameDateId: number
  position: number
  points: number
  eliminatedPlayer: { id: string; firstName: string; lastName: string; photoUrl?: string | null }
  eliminatorPlayer: { id: string; firstName: string; lastName: string; photoUrl?: string | null } | null
  eliminationTime: string
}

interface HomeUltimaFechaProps {
  user: { id: string }
  tournamentNumber: number
  rankings: PlayerRanking[]
  lastCompletedDate: { id: number; dateNumber: number }
  streaks?: { hot: PlayerPositionDelta[] }
  onOpenProfile: () => void
  onSeeAllResults: () => void
  onSeeResultsTab: () => void
  onSeeTabla: () => void
}

export function HomeUltimaFecha({
  user,
  tournamentNumber,
  rankings,
  lastCompletedDate,
  streaks,
  onOpenProfile,
  onSeeAllResults,
  onSeeResultsTab,
  onSeeTabla
}: HomeUltimaFechaProps) {
  const { data: eliminations } = useSWR<EliminationDTO[]>(
    `/api/eliminations/game-date/${lastCompletedDate.id}`,
    { revalidateOnFocus: false }
  )

  if (!eliminations || eliminations.length === 0 || rankings.length === 0) {
    return (
      <div style={{ ...tile('papel'), padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--cp-on-surface-variant)' }}>Cargando la última fecha...</div>
      </div>
    )
  }

  // La foto viene en la propia eliminacion; el ranking queda solo de respaldo.
  // Cruzar contra el ranking perdia a quien no es participante del torneo (un
  // invitado, por ejemplo), que terminaba mostrando iniciales en vez de foto.
  const rankingPhoto = new Map(rankings.map(r => [r.playerId, r.playerPhoto]))
  const photoOf = (player: { id: string; photoUrl?: string | null }) =>
    player.photoUrl ?? rankingPhoto.get(player.id) ?? undefined
  const photoByPlayerId = rankingPhoto

  const sorted = [...eliminations].sort((a, b) => a.position - b.position)
  const winner = sorted.find(e => e.position === 1)
  const podium = sorted.filter(e => e.position <= 3)

  // El Varón de la Noche: más eliminaciones esa fecha
  const killCounts = new Map<string, { name: string; count: number }>()
  sorted.forEach(e => {
    if (!e.eliminatorPlayer) return
    // El ganador se guarda como su propio eliminador (posicion 1). Sin este
    // filtro la tarjeta le regalaba +1 al campeon, y quedaba en desacuerdo con
    // las estadisticas y los premios, que si lo excluyen.
    if (e.position === 1) return
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

  // 7/2: los últimos 2 lugares de la tabla actual (no un dato de tendencia)
  const bottom2 = rankings.length >= 2
    ? [...rankings].sort((a, b) => b.position - a.position).slice(0, 2).reverse()
    : []

  const insightCards = [
    varonDeLaNoche && {
      key: 'varon',
      label: 'EL VARÓN DE LA NOCHE',
      color: 'var(--cp-primary-light)',
      name: varonDeLaNoche.name,
      detail: `${varonDeLaNoche.count} eliminaciones`,
      playerId: varonDeLaNoche.playerId
    },
    elMalazoElim && {
      key: 'malazo',
      label: 'EL MALAZO',
      color: 'var(--cp-malazo-text)',
      name: `${elMalazoElim.eliminatedPlayer.firstName} ${elMalazoElim.eliminatedPlayer.lastName}`,
      detail: 'primero eliminado',
      playerId: elMalazoElim.eliminatedPlayer.id
    },
    nocheParaOlvidar && {
      key: 'olvidar',
      label: 'NOCHE PARA OLVIDAR',
      color: 'var(--cp-negative)',
      name: nocheParaOlvidar.playerName,
      detail: `bajó ${Math.abs(nocheParaOlvidar.positionsChanged)} puestos en el Torneo`,
      playerId: nocheParaOlvidar.playerId
    },
    elQueMasSubio && {
      key: 'contento',
      label: 'EL MÁS CONTENTO',
      color: 'var(--cp-positive)',
      name: elQueMasSubio.playerName,
      detail: `+${elQueMasSubio.positionsChanged} posiciones`,
      playerId: elQueMasSubio.playerId
    }
  ].filter((c): c is NonNullable<typeof c> => Boolean(c))

  const tinta = 'var(--cp-on-surface)'
  const suave = 'var(--cp-on-surface-muted)'
  const tenue = 'var(--cp-on-surface-variant)'

  return (
    <div style={BENTO}>

      {/* ── EL CAMPEÓN DE LA NOCHE — el ancla negra ───────────────── */}
      {winner && (() => {
        const winnerPhoto = photoOf(winner.eliminatedPlayer)
        return (
          <section className="cp-rise" style={{ ...tile('negro'), animationDelay: '0ms', padding: 0, minHeight: 172 }}>
            {winnerPhoto && (
              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '48%' }}>
                <Image src={winnerPhoto} alt={winner.eliminatedPlayer.firstName} fill className="object-cover object-top" unoptimized />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, #17120F 0%, rgba(23,18,15,0.55) 30%, transparent 72%)' }} />
              </div>
            )}
            <div style={{ padding: 16, position: 'relative', zIndex: 1, maxWidth: winnerPhoto ? '58%' : '100%' }}>
              <div style={overline(SOBRE_COLOR.tenue)}>Fecha {lastCompletedDate.dateNumber}</div>
              <div className="cp-display" style={{ fontSize: 27, fontWeight: 900, color: '#FFF', lineHeight: 1.02, marginTop: 5 }}>
                ¡{playerLabel(winner.eliminatedPlayer).toUpperCase()}<br />GANÓ LA FECHA!
              </div>
              <button onClick={onSeeAllResults}
                style={{ marginTop: 13, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E53935', color: '#fff', padding: '9px 16px', borderRadius: 100, fontSize: 12.5, fontWeight: 800, letterSpacing: '0.03em', border: 'none', cursor: 'pointer' }}>
                VER RESULTADOS
              </button>
            </div>
            {!winnerPhoto && (
              <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}>
                <HomeAvatar playerId={winner.eliminatedPlayer.id} name={`${winner.eliminatedPlayer.firstName} ${winner.eliminatedPlayer.lastName}`} size={118} fontSize={34} />
              </div>
            )}
          </section>
        )
      })()}

      {/* ── TU NOCHE — bloque rojo ────────────────────────────────── */}
      {myRanking && myNightElim && (
        <section className="cp-rise" style={{ ...tile('papel', 1), animationDelay: '60ms', background: 'linear-gradient(150deg,#E53935,#B32623)', border: 'none', color: '#FFF', boxShadow: '0 12px 26px rgba(179,38,35,0.28)', gap: 3 }}>
          {myNightElim.position === 1 ? (
            <>
              <div style={overline(SOBRE_COLOR.suave)}>tu noche</div>
              <div className="cp-display" style={{ fontSize: 24, fontWeight: 900, marginTop: 2 }}>¡Ganaste!</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                <Score value={myNightElim.points} size={20} color="#FFF" />
                <span style={overline(SOBRE_COLOR.suave)}>pts</span>
              </div>
            </>
          ) : (
            <>
              <div style={overline(SOBRE_COLOR.suave)}>te eliminaron en</div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 1, marginTop: 1 }}>
                <span className="cp-score" style={{ fontSize: 20, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>#</span>
                <Score value={myNightElim.position} size={46} color="#FFF" style={{ lineHeight: 1 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <Score value={myNightElim.points} size={18} color="#FFF" />
                <span style={overline(SOBRE_COLOR.suave)}>pts</span>
              </div>
              {myNightElim.eliminatorPlayer && (
                <div style={{ fontSize: 11.5, color: SOBRE_COLOR.suave, marginTop: 3, lineHeight: 1.3 }}>
                  Te eliminó {playerLabel(myNightElim.eliminatorPlayer)}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* ── EN EL CAMPEONATO — bloque papel al lado ───────────────── */}
      {myRanking && myNightElim && (
        <section className="cp-rise" style={{ ...tile('papel', 1), animationDelay: '110ms', gap: 3 }}>
          <div style={overline()}>en el campeonato</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 1, marginTop: 1 }}>
            <span className="cp-score" style={{ fontSize: 20, color: 'var(--cp-primary)', lineHeight: 1.4 }}>#</span>
            <Score value={myRanking.position} size={46} color={tinta} style={{ lineHeight: 1 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <Score value={scoreOf(myRanking)} size={18} color={tinta} />
            <span style={overline()}>pts</span>
          </div>
          {gapToLeader !== null && (
            <div style={{ fontSize: 11.5, color: suave, marginTop: 3, lineHeight: 1.3 }}>
              {gapToLeader === 0 ? 'sos el líder' : `a ${gapToLeader} del líder`}
            </div>
          )}
          <LinkCta onClick={onOpenProfile} style={{ marginTop: 'auto', paddingTop: 6, color: 'var(--cp-primary-light)', fontSize: 11.5 }}>MI TORNEO →</LinkCta>
        </section>
      )}

      {/* ── PODIO DE LA FECHA — bloque oro ────────────────────────── */}
      {podium.length > 0 && (
        <section className="cp-rise" style={{ ...tile('oro'), animationDelay: '160ms' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={overline('#8A6508')}>podio fecha {lastCompletedDate.dateNumber}</span>
            <LinkCta onClick={onSeeResultsTab} style={{ color: '#C62828', fontSize: 11.5 }}>TODOS →</LinkCta>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 11 }}>
            {podium.map(e => {
              const metal = ['#8A6508', '#6E6A67', '#8B5E2F'][e.position - 1] ?? tenue
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flexShrink: 0 }}>
                    <HomeAvatar playerId={e.eliminatedPlayer.id} name={`${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName}`} photoUrl={photoOf(e.eliminatedPlayer)} size={62} fontSize={19} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: tinta }}>
                      {e.eliminatedPlayer.firstName} {e.eliminatedPlayer.lastName[0]}.
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: metal, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      {e.position === 1 ? 'campeón' : `${e.position}° puesto`}
                    </div>
                  </div>
                  <div className="cp-score" style={{ fontSize: 19, color: metal }}>{e.points}</div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── LO QUE DEJÓ LA NOCHE ──────────────────────────────────── */}
      {insightCards.length > 0 && (
        <section className="cp-rise" style={{ ...tile('papel'), animationDelay: '220ms' }}>
          <span style={overline()}>lo que dejó la noche</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12, marginTop: 12 }}>
            {insightCards.map(card => (
              <div key={card.key} style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                <div style={{ flexShrink: 0 }}>
                  <HomeAvatar playerId={card.playerId} name={card.name} photoUrl={photoByPlayerId.get(card.playerId)} size={56} fontSize={19} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800, color: card.color, letterSpacing: '0.1em', lineHeight: 1.25 }}>{card.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: tinta, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {shortenFullName(card.name)}
                  </div>
                  <div style={{ fontSize: 10.5, color: tenue, lineHeight: 1.25 }}>{card.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── EL PODIO DEL TORNEO ───────────────────────────────────── */}
      {rankings.length >= 3 && (
        <section className="cp-rise" style={{ ...tile('papel'), animationDelay: '270ms' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={overline()}>podio torneo {tournamentNumber}</span>
            <LinkCta onClick={onSeeTabla} style={{ color: 'var(--cp-primary-light)', fontSize: 11.5 }}>TABLA →</LinkCta>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 12, marginTop: 12 }}>
            {[rankings[1], rankings[0], rankings[2]].map(p => {
              const idx = rankings.indexOf(p)
              const metal = ['#8A6508', '#6E6A67', '#8B5E2F'][idx]
              const primero = idx === 0
              return (
                <div key={p.playerId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, marginBottom: primero ? 10 : 0, minWidth: 0 }}>
                  <div style={{ position: 'relative' }}>
                    <HomeAvatar playerId={p.playerId} name={p.playerName} photoUrl={p.playerPhoto} size={primero ? 92 : 70} fontSize={primero ? 25 : 19} />
                    <span className="cp-score" style={{ position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)', background: metal, color: '#FFF', fontSize: 11, minWidth: 20, height: 20, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{idx + 1}</span>
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: tinta, marginTop: 3 }}>{shortenFullName(p.playerName)}</div>
                  <div className="cp-score" style={{ fontSize: primero ? 17 : 14, color: metal }}>{scoreOf(p)}</div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── LOS MALAZOS — ROSA ────────────────────────────────────── */}
      {bottom2.length > 0 && (
        <section className="cp-rise" style={{ ...tile('rosa', 1), animationDelay: '320ms', gap: 10 }}>
          <span style={overline(SOBRE_COLOR.suave)}>malazos 7/2</span>
          {bottom2.map(p => (
            <div key={p.playerId} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div style={{ flexShrink: 0 }}>
                <HomeAvatar playerId={p.playerId} name={p.playerName} photoUrl={p.playerPhoto} size={45} fontSize={16} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shortenFullName(p.playerName)}</div>
                <div className="cp-score" style={{ fontSize: 14, color: '#FFF' }}>{scoreOf(p)}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── LOS CALIENTES — verde ─────────────────────────────────── */}
      {(streaks?.hot?.length ?? 0) > 0 && (
        <section className="cp-rise" style={{ ...tile('verde', 1), animationDelay: '360ms', gap: 10 }}>
          <span style={overline(SOBRE_COLOR.suave)}>calientes</span>
          {(streaks?.hot ?? []).slice(0, 2).map(p => (
            <div key={p.playerId} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <div style={{ flexShrink: 0 }}>
                <HomeAvatar playerId={p.playerId} name={p.playerName} photoUrl={p.playerPhoto} size={45} fontSize={16} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shortenFullName(p.playerName)}</div>
                <div className="cp-score" style={{ fontSize: 14, color: '#FFF' }}>+{p.positionsChanged}</div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

export default HomeUltimaFecha
