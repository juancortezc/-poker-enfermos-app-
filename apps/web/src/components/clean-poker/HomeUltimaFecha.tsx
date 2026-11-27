'use client'

import useSWR from 'swr'
import { Star } from 'lucide-react'
import type { PlayerRanking } from '@poker/shared'
import { nightWinnerPhrase, playerLabel, shortenFullName } from '@poker/shared'
import { CPPlayerCard } from './CPPlayerCard'
import { DISPLAY_CONDENSADO, FUENTE_DISPLAY, heroCardWidth, heroTitleSize, PhotoTile, Podium, SectionHead, SOBRE_NEGRO } from './HomeLucha'

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
  rankings: PlayerRanking[]
  lastCompletedDate: { id: number; dateNumber: number }
  /**
   * Solo si la fecha es de OTRO torneo (el anterior, mientras el activo no
   * jugo ninguna): el cartel dice de que torneo es, "T30 · FECHA 14".
   */
  tournamentNumber?: number
  onSeeAllResults: () => void
  onSeeResultsTab: () => void
}

/** Ancho maximo de la tarjeta del ganador en el cartel (2:3 → 348 de alto). */
const CARD_WIDTH = 232
/**
 * Alto que el cartel NO le da a la tarjeta: arriba del bloque 137 + barra
 * inferior 75 + respiro 8 + padding 36 + rotulo 19 + cinta 14 + titular ~80 +
 * fila de puntos 48 + 4 huecos de 12 + 12 del giro. Ver heroCardWidth.
 */
const CARTEL_RESERVADO = 495
/** Una columna del podio: el contenido mide como mucho 408 px (max-w-md menos el padding). */
const PODIUM_SIZES = '(min-width: 448px) 130px, calc((100vw - 60px) / 3)'
/** Media columna: los tiles 3:4 de dos en dos. */
const TILE_SIZES = '(min-width: 448px) 200px, calc((100vw - 52px) / 2)'

/**
 * Inicio > Ultima fecha, tema lucha libre (T31):
 * 1. Cartel "FUNCIÓN ESTELAR" con la tarjeta del ganador.
 * 2. El podio 2-1-3 con pedestales.
 * 3. Los 7/2 de la noche: los dos primeros eliminados, en rosa.
 * 4. Lo que dejo la noche: Varon, Malazo, la peor caida y la mejor subida.
 */
export function HomeUltimaFecha({ rankings, lastCompletedDate, tournamentNumber, onSeeAllResults, onSeeResultsTab }: HomeUltimaFechaProps) {
  const { data: eliminations, error } = useSWR<EliminationDTO[]>(
    `/api/eliminations/game-date/${lastCompletedDate.id}`,
    { revalidateOnFocus: false }
  )

  if (error) {
    return <Aviso texto="No se pudo cargar la última fecha." />
  }
  if (!eliminations) {
    return (
      <div aria-busy="true" aria-label="Cargando la última fecha" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="animate-pulse" style={{ height: 560, borderRadius: 20, background: 'var(--cp-surface-3)' }} />
        <div className="animate-pulse" style={{ height: 240, borderRadius: 18, background: 'var(--cp-surface-2)' }} />
      </div>
    )
  }
  if (eliminations.length === 0) {
    return <Aviso texto={`La fecha ${lastCompletedDate.dateNumber} todavía no tiene resultados.`} />
  }

  // La foto viene en la propia eliminacion; el ranking queda de respaldo (un
  // invitado no esta en el ranking y aun asi tiene foto).
  const byId = new Map(rankings.map(r => [r.playerId, r]))
  const photoOf = (p: { id: string; photoUrl?: string | null }) => p.photoUrl ?? byId.get(p.id)?.playerPhoto ?? null
  /** Apodo si lo tiene; si no, "Juan C.". */
  const nombre = (p: { id: string; firstName: string; lastName: string }) => byId.get(p.id)?.playerAlias || playerLabel(p)

  const sorted = [...eliminations].sort((a, b) => a.position - b.position)
  const winner = sorted.find(e => e.position === 1)
  const podium = sorted.filter(e => e.position <= 3)

  // 7/2 de la noche: los dos primeros eliminados (los dos ultimos puestos), el
  // mismo criterio que /api/stats/date-awards.
  const sieteDos = sorted.length >= 2 ? sorted.slice(-2).reverse() : []

  // El Varon: mas eliminaciones esa noche. El ganador se guarda como su propio
  // eliminador (posicion 1); no cuenta.
  const kills = new Map<string, { player: EliminationDTO['eliminatedPlayer']; count: number }>()
  sorted.forEach(e => {
    if (!e.eliminatorPlayer || e.position === 1) return
    const entry = kills.get(e.eliminatorPlayer.id) ?? { player: e.eliminatorPlayer, count: 0 }
    entry.count += 1
    kills.set(e.eliminatorPlayer.id, entry)
  })
  const varon = [...kills.values()].sort((a, b) => b.count - a.count)[0]
  const malazo = sorted[sorted.length - 1]

  const fallers = rankings.filter(r => r.positionsChanged < 0)
  const risers = rankings.filter(r => r.positionsChanged > 0)
  const olvidar = fallers.length ? fallers.reduce((m, r) => (r.positionsChanged < m.positionsChanged ? r : m)) : null
  const contento = risers.length ? risers.reduce((m, r) => (r.positionsChanged > m.positionsChanged ? r : m)) : null

  const celebraciones = [
    varon && {
      key: 'varon',
      tag: 'EL VARÓN',
      bg: SOBRE_NEGRO.rojo,
      color: SOBRE_NEGRO.sobreRojo,
      playerId: varon.player.id,
      name: nombre(varon.player),
      src: photoOf(varon.player),
      detail: `${varon.count} ${varon.count === 1 ? 'eliminación' : 'eliminaciones'}`,
    },
    malazo && {
      key: 'malazo',
      tag: 'EL MALAZO',
      bg: SOBRE_NEGRO.rosa,
      color: SOBRE_NEGRO.tinta,
      playerId: malazo.eliminatedPlayer.id,
      name: nombre(malazo.eliminatedPlayer),
      src: photoOf(malazo.eliminatedPlayer),
      detail: 'primer eliminado',
    },
    olvidar && {
      key: 'olvidar',
      tag: 'NOCHE PARA OLVIDAR',
      bg: SOBRE_NEGRO.negativo,
      color: SOBRE_NEGRO.tinta,
      playerId: olvidar.playerId,
      name: olvidar.playerAlias || shortenFullName(olvidar.playerName),
      src: olvidar.playerPhoto,
      detail: `bajó ${Math.abs(olvidar.positionsChanged)} en la tabla`,
    },
    contento && {
      key: 'contento',
      tag: 'EL MÁS CONTENTO',
      bg: SOBRE_NEGRO.positivo,
      color: SOBRE_NEGRO.tinta,
      playerId: contento.playerId,
      name: contento.playerAlias || shortenFullName(contento.playerName),
      src: contento.playerPhoto,
      detail: `subió ${contento.positionsChanged} en la tabla`,
    },
  ].filter((c): c is NonNullable<typeof c> => Boolean(c))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      {winner && (
        <Cartel
          winner={winner}
          name={nombre(winner.eliminatedPlayer)}
          photoUrl={photoOf(winner.eliminatedPlayer)}
          wins={byId.get(winner.eliminatedPlayer.id)?.firstPlaces}
          dateNumber={lastCompletedDate.dateNumber}
          tournamentNumber={tournamentNumber}
          onSeeResults={onSeeAllResults}
        />
      )}

      {podium.length > 0 && (
        <section className="cp-rise" style={{ display: 'flex', flexDirection: 'column', gap: 14, animationDelay: '80ms' }} aria-labelledby="h-podio">
          <SectionHead id="h-podio" title="EL PODIO" action={{ label: 'TODOS', onClick: onSeeResultsTab }} />
          <Podium
            sizes={PODIUM_SIZES}
            players={podium.map(e => ({
              playerId: e.eliminatedPlayer.id,
              name: nombre(e.eliminatedPlayer),
              src: photoOf(e.eliminatedPlayer),
              points: e.points,
            }))}
          />
        </section>
      )}

      {sieteDos.length === 2 && (
        <section className="cp-rise" style={{ display: 'flex', flexDirection: 'column', gap: 14, animationDelay: '140ms' }} aria-labelledby="h-72-noche">
          <SectionHead id="h-72-noche" title="LOS 7/2 DE LA NOCHE" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            {sieteDos.map((e, k) => (
              <PhotoTile
                key={e.id}
                playerId={e.eliminatedPlayer.id}
                name={nombre(e.eliminatedPlayer)}
                src={photoOf(e.eliminatedPlayer)}
                tag="7/2"
                tagBg={SOBRE_NEGRO.rosa}
                tagColor={SOBRE_NEGRO.tinta}
                accent={SOBRE_NEGRO.rosa}
                detail={`#${e.position} · ${k === 0 ? 'primer' : 'segundo'} eliminado`}
                sizes={TILE_SIZES}
              />
            ))}
          </div>
        </section>
      )}

      {celebraciones.length > 0 && (
        <section className="cp-rise" style={{ display: 'flex', flexDirection: 'column', gap: 14, animationDelay: '200ms' }} aria-labelledby="h-dejo">
          <SectionHead id="h-dejo" title="LO QUE DEJÓ LA NOCHE" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            {celebraciones.map(c => (
              <PhotoTile
                key={c.key}
                playerId={c.playerId}
                name={c.name}
                src={c.src}
                tag={c.tag}
                tagBg={c.bg}
                tagColor={c.color}
                detail={c.detail}
                sizes={TILE_SIZES}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

interface CartelProps {
  winner: EliminationDTO
  name: string
  photoUrl: string | null
  wins?: number
  dateNumber: number
  tournamentNumber?: number
  onSeeResults: () => void
}

/** "FUNCIÓN ESTELAR": el ganador de la noche, como cartel de lucha libre. */
function Cartel({ winner, name, photoUrl, wins, dateNumber, tournamentNumber, onSeeResults }: CartelProps) {
  const [l1, l2] = nightWinnerPhrase(name, dateNumber, wins)
  const size = heroTitleSize([l1, l2], 40)
  const fullName = `${winner.eliminatedPlayer.firstName} ${winner.eliminatedPlayer.lastName}`
  const cuerda = `color-mix(in srgb, ${SOBRE_NEGRO.rojo} 55%, transparent)`

  return (
    <section
      className="cp-rise"
      aria-labelledby="h-cartel"
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 20,
        background: SOBRE_NEGRO.fondo,
        backgroundImage: `repeating-linear-gradient(135deg, color-mix(in srgb, ${SOBRE_NEGRO.rojo} 16%, transparent) 0 14px, transparent 14px 28px)`,
        color: SOBRE_NEGRO.texto,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Las tres cuerdas del ring, detras de la tarjeta. */}
      {[150, 200, 250].map(top => (
        <span key={top} aria-hidden style={{ position: 'absolute', left: 0, right: 0, top, height: 3, background: cuerda }} />
      ))}

      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: FUENTE_DISPLAY,
          fontWeight: 800,
          fontSize: 12,
          letterSpacing: '0.16em',
          whiteSpace: 'nowrap',
          color: SOBRE_NEGRO.oro,
        }}
      >
        <Star size={12} fill={SOBRE_NEGRO.oro} stroke="none" aria-hidden />
        FUNCIÓN ESTELAR · {tournamentNumber ? `T${tournamentNumber} · ` : ''}FECHA {dateNumber}
        <Star size={12} fill={SOBRE_NEGRO.oro} stroke="none" aria-hidden />
      </div>

      <div style={{ position: 'relative', transform: 'rotate(-3deg)' }}>
        <CPPlayerCard
          photoUrl={photoUrl}
          name={fullName}
          width={heroCardWidth(CARTEL_RESERVADO)}
          sizes={`${CARD_WIDTH}px`}
          priority
          zoomable
          style={{ boxShadow: `0 18px 40px color-mix(in srgb, ${SOBRE_NEGRO.fondo} 60%, transparent), 0 0 0 3px ${SOBRE_NEGRO.oro}` }}
        />
      </div>
      <div
        aria-hidden
        style={{
          position: 'relative',
          marginTop: -10,
          transform: 'rotate(-3deg)',
          background: SOBRE_NEGRO.oro,
          color: SOBRE_NEGRO.tinta,
          padding: '6px 16px',
          borderRadius: 5,
          fontFamily: FUENTE_DISPLAY,
          fontWeight: 900,
          fontSize: 14,
          letterSpacing: '0.2em',
          boxShadow: `0 6px 14px color-mix(in srgb, ${SOBRE_NEGRO.fondo} 50%, transparent)`,
          pointerEvents: 'none',
        }}
      >
        CAMPEÓN DE LA NOCHE
      </div>

      <h2
        id="h-cartel"
        style={{ ...DISPLAY_CONDENSADO, position: 'relative', margin: '4px 0 0', textAlign: 'center', fontSize: size, color: SOBRE_NEGRO.texto, whiteSpace: 'nowrap' }}
      >
        {l1}
        <br />
        <span style={{ color: SOBRE_NEGRO.rojoTexto }}>{l2}</span>
      </h2>

      {/* Puntos a la izquierda y el boton a la derecha, en una fila: asi el
          cartel entra entero en la primera pantalla. */}
      <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontFamily: FUENTE_DISPLAY, fontWeight: 900 }}>
        <span style={{ fontFamily: FUENTE_DISPLAY, fontWeight: 900, fontSize: 36, color: SOBRE_NEGRO.oro, lineHeight: 1 }}>{winner.points}</span>
        <span style={{ fontSize: 13, letterSpacing: '0.08em', color: SOBRE_NEGRO.textoSuave }}>PUNTOS</span>
      </div>

      <button
        type="button"
        onClick={onSeeResults}
        style={{
          position: 'relative',
          minHeight: 48,
          padding: '0 14px',
          flexShrink: 0,
          whiteSpace: 'nowrap',
          borderRadius: 5,
          background: SOBRE_NEGRO.rojo,
          color: SOBRE_NEGRO.sobreRojo,
          border: 'none',
          cursor: 'pointer',
          fontFamily: FUENTE_DISPLAY,
          fontWeight: 800,
          fontSize: 14,
          letterSpacing: '0.04em',
        }}
      >
        VER RESULTADOS
      </button>
      </div>
    </section>
  )
}

function Aviso({ texto }: { texto: string }) {
  return (
    <div style={{ padding: 24, textAlign: 'center', borderRadius: 18, background: 'var(--cp-surface-1)', border: '1px solid var(--cp-surface-border)' }}>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--cp-on-surface-muted)' }}>{texto}</p>
    </div>
  )
}

export default HomeUltimaFecha
