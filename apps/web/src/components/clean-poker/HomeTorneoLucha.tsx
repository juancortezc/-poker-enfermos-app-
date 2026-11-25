'use client'

import Link from 'next/link'
import { Crown } from 'lucide-react'
import type { PlayerRanking } from '@poker/shared'
import { leaderPhrase, nightlyPosition, playedDateNumbers, rivalryPhrase, scoreOf, shortenFullName } from '@poker/shared'
import { CPPlayerCard } from './CPPlayerCard'
import { CPPlayerPhoto } from './CPPlayerPhoto'
import { DISPLAY_CONDENSADO, FUENTE_DISPLAY, heroCardWidth, heroTitleSize, MEDALLA, PhotoTile, SectionHead, SOBRE_NEGRO } from './HomeLucha'

interface HomeTorneoLuchaProps {
  /** Ordenado por posicion. */
  rankings: PlayerRanking[]
  tournamentNumber: number
  finished: boolean
  lastDateNumber?: number
  totalDates?: number
  loading?: boolean
  onSeeTabla: () => void
}

const CARD_WIDTH = 232
/**
 * Alto que el cinturon NO le da a la tarjeta: arriba 137 + barra 75 + respiro
 * 8 + padding 36 + rotulo 19 + cinturon 18 (se monta 28 sobre la tarjeta) +
 * titular ~90 + fila de cifras 56 + 5 huecos de 12 + 12 del giro. Ver
 * heroCardWidth.
 */
const CINTURON_RESERVADO = 503
const TILE_SIZES = '(min-width: 448px) 200px, calc((100vw - 52px) / 2)'
/** Mismo umbral que la tabla (CPRankingView): mesa final = top 9 de la noche. */
const MESA_FINAL = 9

/** Apodo si lo tiene; si no, "Juan C.". */
const nombre = (p: PlayerRanking) => p.playerAlias || shortenFullName(p.playerName)

/**
 * Inicio > Torneo, tema lucha libre (T31): el dueno del cinturon (lider), el
 * mano a mano #1 vs #2, la tabla (top 3) y los 7/2 del torneo (los dos ultimos
 * de la tabla).
 */
export function HomeTorneoLucha({ rankings, tournamentNumber, finished, lastDateNumber, totalDates, loading, onSeeTabla }: HomeTorneoLuchaProps) {
  if (rankings.length === 0) {
    if (loading) {
      return (
        <div aria-busy="true" aria-label="Cargando el torneo" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="animate-pulse" style={{ height: 560, borderRadius: 20, background: 'var(--cp-surface-3)' }} />
          <div className="animate-pulse" style={{ height: 240, borderRadius: 18, background: 'var(--cp-surface-2)' }} />
        </div>
      )
    }
    return (
      <div style={{ padding: 24, textAlign: 'center', borderRadius: 18, background: 'var(--cp-surface-1)', border: '1px solid var(--cp-surface-border)' }}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--cp-on-surface-muted)' }}>Todavía no hay tabla del torneo {tournamentNumber}.</p>
      </div>
    )
  }

  const [leader, second] = rankings
  const top3 = rankings.slice(0, 3)
  const sieteDos = rankings.length >= 4 ? rankings.slice(-2) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26, minWidth: 0 }}>
      <Cinturon
        leader={leader}
        rankings={rankings}
        finished={finished}
        tournamentNumber={tournamentNumber}
        lastDateNumber={lastDateNumber}
        totalDates={totalDates}
      />

      {second && (
        <section className="cp-rise" aria-labelledby="h-mano" style={{ display: 'flex', flexDirection: 'column', gap: 14, animationDelay: '80ms' }}>
          <SectionHead id="h-mano" title="MANO A MANO" />
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {[leader, second].map((p, k) => (
              <PhotoTile
                key={p.playerId}
                playerId={p.playerId}
                name={nombre(p)}
                src={p.playerPhoto}
                tag={`#${p.position}`}
                tagBg={k === 0 ? SOBRE_NEGRO.oro : SOBRE_NEGRO.plata}
                tagColor={SOBRE_NEGRO.tinta}
                align={k === 0 ? 'left' : 'right'}
                sizes={TILE_SIZES}
              >
                <span style={{ fontFamily: FUENTE_DISPLAY, fontWeight: 900, fontSize: 26, lineHeight: 1.1, color: SOBRE_NEGRO.texto }}>
                  {scoreOf(p)}
                </span>
              </PhotoTile>
            ))}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                left: '50%',
                top: '38%',
                transform: 'translate(-50%, -50%) rotate(-8deg)',
                width: 68,
                height: 68,
                borderRadius: 34,
                background: SOBRE_NEGRO.rojo,
                border: '4px solid var(--cp-surface-0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: SOBRE_NEGRO.sobreRojo,
                fontFamily: FUENTE_DISPLAY,
                fontWeight: 900,
                fontStyle: 'italic',
                fontSize: 28,
                boxShadow: 'var(--cp-elevation-2)',
                pointerEvents: 'none',
              }}
            >
              VS
            </div>
          </div>
          <p
            style={{
              margin: 0,
              textAlign: 'center',
              fontFamily: FUENTE_DISPLAY,
              fontWeight: 900,
              fontStretch: '75%',
              fontVariationSettings: "'wdth' 75",
              fontSize: 22,
              letterSpacing: '0.04em',
              color: 'var(--cp-primary-light)',
            }}
          >
            {rivalryPhrase(scoreOf(leader) - scoreOf(second))}
          </p>
        </section>
      )}

      <section className="cp-rise" aria-labelledby="h-tabla" style={{ display: 'flex', flexDirection: 'column', gap: 10, animationDelay: '140ms' }}>
        <SectionHead id="h-tabla" title="LA TABLA" action={{ label: 'COMPLETA', onClick: onSeeTabla }} />
        <ol
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            background: 'var(--cp-surface-1)',
            border: '1px solid var(--cp-surface-border)',
            borderRadius: 18,
            overflow: 'hidden',
          }}
        >
          {top3.map((p, i) => (
            <li key={p.playerId} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--cp-surface-2)' }}>
              <Link
                href={`/players/${p.playerId}`}
                aria-label={`${p.position}º ${p.playerName}, ${scoreOf(p)} puntos`}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', textDecoration: 'none' }}
              >
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    flexShrink: 0,
                    background: MEDALLA[i],
                    color: SOBRE_NEGRO.tinta,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: FUENTE_DISPLAY,
                    fontWeight: 900,
                    fontSize: 14,
                  }}
                >
                  {p.position}
                </span>
                <CPPlayerPhoto src={p.playerPhoto} name={p.playerName} size={56} radius={10} />
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--cp-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.playerName}
                  </span>
                  {p.playerAlias && <span style={{ fontSize: 13, color: 'var(--cp-on-surface-variant)' }}>{p.playerAlias}</span>}
                </span>
                <span style={{ fontFamily: FUENTE_DISPLAY, fontWeight: 900, fontSize: 22, color: 'var(--cp-on-surface)' }}>{scoreOf(p)}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {sieteDos.length === 2 && (
        <section className="cp-rise" aria-labelledby="h-72-torneo" style={{ display: 'flex', flexDirection: 'column', gap: 14, animationDelay: '200ms' }}>
          <SectionHead id="h-72-torneo" title="LOS 7/2 DEL TORNEO" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            {sieteDos.map(p => (
              <PhotoTile
                key={p.playerId}
                playerId={p.playerId}
                name={nombre(p)}
                src={p.playerPhoto}
                tag="7/2"
                tagBg={SOBRE_NEGRO.rosa}
                tagColor={SOBRE_NEGRO.tinta}
                accent={SOBRE_NEGRO.rosa}
                detail={`#${p.position} · ${scoreOf(p)} pts`}
                sizes={TILE_SIZES}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

interface CinturonProps {
  leader: PlayerRanking
  rankings: PlayerRanking[]
  finished: boolean
  tournamentNumber: number
  lastDateNumber?: number
  totalDates?: number
}

/** "DUEÑO DEL CINTURÓN": el lider con su tarjeta, el cinturon de oro y su frase. */
function Cinturon({ leader, rankings, finished, tournamentNumber, lastDateNumber, totalDates }: CinturonProps) {
  const played = playedDateNumbers(rankings)
  const fecha = lastDateNumber ?? played[played.length - 1]
  // Lider nuevo = no era #1 antes de la ultima fecha.
  const leaderChanged = leader.positionsChanged > 0
  const [l1, l2] = leaderPhrase(nombre(leader), fecha ?? 0, leaderChanged)
  const size = heroTitleSize([l1, l2], 36)

  const mesasFinales = played.filter(
    d => (leader.pointsByDate[d] ?? 0) > 0 && (nightlyPosition(rankings, d, leader.playerId) ?? 999) <= MESA_FINAL
  ).length
  const podios = leader.firstPlaces + leader.secondPlaces + leader.thirdPlaces

  const rotulo = finished
    ? `CAMPEÓN · TORNEO ${tournamentNumber}`
    : fecha
      ? `DUEÑO DEL CINTURÓN · FECHA ${fecha}${totalDates ? ` DE ${totalDates}` : ''}`
      : 'DUEÑO DEL CINTURÓN'

  return (
    <section
      className="cp-rise"
      aria-labelledby="h-cinturon"
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 20,
        background: SOBRE_NEGRO.fondo,
        backgroundImage: `radial-gradient(circle at 50% 30%, color-mix(in srgb, ${SOBRE_NEGRO.oro} 22%, transparent) 0, transparent 60%)`,
        color: SOBRE_NEGRO.texto,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: FUENTE_DISPLAY,
          fontWeight: 800,
          fontSize: 12,
          letterSpacing: '0.14em',
          color: SOBRE_NEGRO.oro,
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        <Crown size={16} fill={SOBRE_NEGRO.oro} stroke="none" aria-hidden />
        {rotulo}
      </div>

      <div style={{ transform: 'rotate(3deg)' }}>
        <CPPlayerCard
          photoUrl={leader.playerPhoto}
          name={leader.playerName}
          width={heroCardWidth(CINTURON_RESERVADO)}
          sizes={`${CARD_WIDTH}px`}
          zoomable
          style={{ boxShadow: `0 18px 40px color-mix(in srgb, ${SOBRE_NEGRO.fondo} 60%, transparent), 0 0 0 3px ${SOBRE_NEGRO.oro}` }}
        />
      </div>

      <div
        style={{
          marginTop: -28,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 'min(300px, 100%)',
          height: 46,
          borderRadius: 23,
          background: SOBRE_NEGRO.oro,
          color: SOBRE_NEGRO.tinta,
          boxShadow: `0 8px 18px color-mix(in srgb, ${SOBRE_NEGRO.fondo} 55%, transparent), inset 0 0 0 3px ${SOBRE_NEGRO.oroOscuro}`,
          pointerEvents: 'none',
        }}
      >
        <span style={{ fontFamily: FUENTE_DISPLAY, fontWeight: 900, fontSize: 26, letterSpacing: '0.03em', color: SOBRE_NEGRO.tinta }}>
          #1 · {scoreOf(leader)} PTS
        </span>
      </div>

      <h2 id="h-cinturon" style={{ ...DISPLAY_CONDENSADO, margin: '4px 0 0', textAlign: 'center', fontSize: size, color: SOBRE_NEGRO.texto, whiteSpace: 'nowrap' }}>
        {l1}
        <br />
        <span style={{ color: SOBRE_NEGRO.oro }}>{l2}</span>
      </h2>

      <div
        style={{
          display: 'grid',
          // MESAS FINALES es el rotulo largo: a 360 px no entra en un tercio.
          gridTemplateColumns: '1.3fr 1fr 1fr',
          width: '100%',
          borderTop: `1px solid ${SOBRE_NEGRO.linea}`,
          paddingTop: 10,
          textAlign: 'center',
        }}
      >
        {[
          { v: mesasFinales, l: 'MESAS FINALES' },
          { v: podios, l: 'PODIOS' },
          { v: leader.firstPlaces, l: leader.firstPlaces === 1 ? 'VICTORIA' : 'VICTORIAS' },
        ].map((m, k) => (
          <div
            key={m.l}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              borderLeft: k === 0 ? 'none' : `1px solid ${SOBRE_NEGRO.linea}`,
              padding: '0 4px',
              minWidth: 0,
            }}
          >
            <span style={{ fontFamily: FUENTE_DISPLAY, fontWeight: 900, fontSize: 22, lineHeight: 1.1, color: SOBRE_NEGRO.texto }}>{m.v}</span>
            <span style={{ fontSize: 12, color: SOBRE_NEGRO.textoSuave, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>{m.l}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default HomeTorneoLucha
