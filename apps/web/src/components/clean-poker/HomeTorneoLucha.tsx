'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Image from 'next/image'
import Link from 'next/link'
import { Crown } from 'lucide-react'
import { tournamentSieteDos, type PlayerRanking } from '@poker/shared'
import {
  leaderPhrase,
  nightlyPosition,
  playedDateNumbers,
  playerCardUrl,
  playerLabel,
  rivalryPhrase,
  scoreOf,
  shortenFullName,
} from '@poker/shared'
import { CPPlayerCard } from './CPPlayerCard'
import { CPPhotoViewer } from './CPPhotoViewer'
import {
  DISPLAY_CONDENSADO,
  FUENTE_DISPLAY,
  heroCardWidth,
  heroTitleSize,
  MEDALLA,
  SectionHead,
  SOBRE_NEGRO,
} from './HomeLucha'

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

/**
 * Alto de la pantalla que NO es del campeon: arriba del bloque (cabecera y
 * pestanas, ~137 px), la barra inferior (~75) y un respiro (8). El bloque toma
 * el resto, con tope de 556 (el diseno): entra entero en 390x844 y 360x740.
 */
const CAMPEON_ALTO = 'clamp(420px, calc(100dvh - 220px), 556px)'
/** Ancho del bloque a sangre: la columna (max-w-md) menos el padding de la pagina. */
const FULL_SIZES = '(min-width: 448px) 408px, calc(100vw - 40px)'
/** Lo que el bloque de torneo finalizado no le da a la tarjeta (ver heroCardWidth). */
const FINALIZADO_RESERVADO = 471
const CONTENDIENTE_ANCHO = 150
const SIETE_DOS_SIZES = '(min-width: 448px) 170px, calc((100vw - 92px) / 2)'
/** Mismo umbral que la tabla (CPRankingView): mesa final = top 9 de la noche. */
const MESA_FINAL = 9

/** Apodo si lo tiene; si no, "Juan C.". */
const nombre = (p: PlayerRanking) => p.playerAlias || shortenFullName(p.playerName)

/** Oscurece hacia el negro del cartel: `velo(55)` = negro al 55 %. */
const velo = (pct: number) => `color-mix(in srgb, ${SOBRE_NEGRO.fondo} ${pct}%, transparent)`

/**
 * Inicio > Torneo, "la cartelera" (T31, lucha libre):
 * 1. El campeon a sangre: foto del lider a todo el bloque, cinturon de oro.
 * 2. La cartelera: #1 vs #2 en un solo poster cortado en diagonal.
 * 3. Los contendientes: tarjetas del #2 al #5 en fila deslizable.
 * 4. Los 7/2 del torneo: los dos ultimos de la tabla, en el bloque rosa.
 * Con el torneo FINALIZADO, 1 y 2 se reemplazan por la tarjeta del campeon.
 */
export function HomeTorneoLucha({ rankings, tournamentNumber, finished, lastDateNumber, totalDates, loading, onSeeTabla }: HomeTorneoLuchaProps) {
  if (rankings.length === 0) {
    if (loading) {
      return (
        <div aria-busy="true" aria-label="Cargando el torneo" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="animate-pulse" style={{ height: 520, borderRadius: 20, background: 'var(--cp-surface-3)' }} />
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
  const contendientes = rankings.slice(1, 5)
  // El 7 (penultimo) y el 2 (ultimo) de la tabla: misma regla que el reporte.
  const ultimos = tournamentSieteDos(rankings)
  const sieteDos = ultimos ? [ultimos.siete, ultimos.dos] : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, minWidth: 0 }}>
      {finished ? (
        <TorneoFinalizado rankings={rankings} tournamentNumber={tournamentNumber} />
      ) : (
        <>
          <Campeon
            leader={leader}
            rankings={rankings}
            tournamentNumber={tournamentNumber}
            lastDateNumber={lastDateNumber}
            totalDates={totalDates}
          />
          {second && <Cartelera leader={leader} second={second} />}
        </>
      )}

      {contendientes.length > 0 && (
        <section className="cp-rise" aria-labelledby="h-contendientes" style={{ display: 'flex', flexDirection: 'column', gap: 12, animationDelay: '140ms' }}>
          <SectionHead id="h-contendientes" title="LOS CONTENDIENTES" action={{ label: 'TABLA', onClick: onSeeTabla }} />
          <ul
            aria-label="Del segundo al quinto de la tabla"
            style={{
              listStyle: 'none',
              display: 'flex',
              gap: 12,
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              // Sin esto el snap pega la primera tarjeta al borde e ignora el padding.
              scrollPaddingInline: 20,
              // A sangre hasta el borde de la pantalla, alineado con el resto.
              margin: '0 -20px',
              padding: '4px 20px 10px',
            }}
          >
            {contendientes.map(p => {
              const ring = p.position === 2 ? SOBRE_NEGRO.plata : p.position === 3 ? SOBRE_NEGRO.bronce : null
              return (
                <li key={p.playerId} style={{ flex: `0 0 ${CONTENDIENTE_ANCHO}px`, scrollSnapAlign: 'start' }}>
                  <Link
                    href={`/players/${p.playerId}`}
                    className="cp-foto-link"
                    aria-label={`${p.position}º ${p.playerName}, ${scoreOf(p)} puntos. Ver su perfil`}
                    style={{ display: 'flex', flexDirection: 'column', gap: 6, textDecoration: 'none', borderRadius: 10 }}
                  >
                    <CPPlayerCard
                      photoUrl={p.playerPhoto}
                      name={p.playerName}
                      width={CONTENDIENTE_ANCHO}
                      sizes={`${CONTENDIENTE_ANCHO}px`}
                      style={{
                        borderRadius: 10,
                        boxShadow: ring
                          ? `0 0 0 3px ${ring}, var(--cp-elevation-2)`
                          : 'var(--cp-elevation-2)',
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          position: 'absolute',
                          left: 8,
                          bottom: 34,
                          fontFamily: FUENTE_DISPLAY,
                          fontWeight: 900,
                          fontStyle: 'italic',
                          fontSize: 52,
                          lineHeight: 1,
                          color: SOBRE_NEGRO.sobreRojo,
                          textShadow: `0 3px 10px ${velo(70)}`,
                        }}
                      >
                        {p.position}
                      </span>
                    </CPPlayerCard>
                    <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--cp-on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {nombre(p)}
                      </span>
                      <span style={{ fontFamily: FUENTE_DISPLAY, fontWeight: 900, fontSize: 18, color: 'var(--cp-on-surface)' }}>{scoreOf(p)}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {sieteDos.length === 2 && (
        <section
          className="cp-rise"
          aria-labelledby="h-72-torneo"
          style={{
            animationDelay: '200ms',
            borderRadius: 20,
            overflow: 'hidden',
            background: SOBRE_NEGRO.rosa,
            padding: '18px 16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <h2
              id="h-72-torneo"
              style={{
                margin: 0,
                fontFamily: FUENTE_DISPLAY,
                fontWeight: 900,
                fontVariationSettings: "'wdth' 75",
                fontSize: 26,
                letterSpacing: '0.04em',
                lineHeight: 1,
                color: SOBRE_NEGRO.tinta,
              }}
            >
              LOS 7/2 DEL TORNEO
            </h2>
            <span style={{ fontFamily: FUENTE_DISPLAY, fontWeight: 900, fontSize: 12, letterSpacing: '0.12em', color: SOBRE_NEGRO.tinta, whiteSpace: 'nowrap' }}>
              ZONA DE CASTIGO
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, padding: '4px 6px 0' }}>
            {sieteDos.map((p, k) => (
              <Link
                key={p.playerId}
                href={`/players/${p.playerId}`}
                className="cp-foto-link"
                aria-label={`7/2: ${p.position}º ${p.playerName}, ${scoreOf(p)} puntos. Ver su perfil`}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textDecoration: 'none', minWidth: 0 }}
              >
                <div style={{ width: '100%', transform: `rotate(${k === 0 ? -4 : 4}deg)` }}>
                  <CPPlayerCard
                    photoUrl={p.playerPhoto}
                    name={p.playerName}
                    sizes={SIETE_DOS_SIZES}
                    style={{ borderRadius: 10, boxShadow: `0 0 0 3px ${SOBRE_NEGRO.tinta}, 0 10px 20px color-mix(in srgb, ${SOBRE_NEGRO.tinta} 35%, transparent)` }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: FUENTE_DISPLAY,
                    fontWeight: 900,
                    fontSize: 16,
                    lineHeight: 1.2,
                    color: SOBRE_NEGRO.tinta,
                    textAlign: 'center',
                    maxWidth: '100%',
                    overflowWrap: 'anywhere',
                  }}
                >
                  #{p.position} {nombre(p)} · {scoreOf(p)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/* ─────────────────────────── 1. EL CAMPEÓN A SANGRE ─────────────────────────── */

interface CampeonProps {
  leader: PlayerRanking
  rankings: PlayerRanking[]
  tournamentNumber: number
  lastDateNumber?: number
  totalDates?: number
}

function Campeon({ leader, rankings, tournamentNumber, lastDateNumber, totalDates }: CampeonProps) {
  const [open, setOpen] = useState(false)
  const played = playedDateNumbers(rankings)
  const fecha = lastDateNumber ?? played[played.length - 1]
  // Lider nuevo = no era #1 antes de la ultima fecha.
  const [l1, l2] = leaderPhrase(nombre(leader), fecha ?? 0, leader.positionsChanged > 0)
  const mesasFinales = played.filter(
    d => (leader.pointsByDate[d] ?? 0) > 0 && (nightlyPosition(rankings, d, leader.playerId) ?? 999) <= MESA_FINAL
  ).length
  const podios = leader.firstPlaces + leader.secondPlaces + leader.thirdPlaces
  const tarjeta = playerCardUrl(leader.playerPhoto) ?? leader.playerPhoto ?? null

  const cifra = (v: number, singular: string, plural: string) => (
    <span style={{ fontSize: 13, color: SOBRE_NEGRO.textoSuave, whiteSpace: 'nowrap' }}>
      <b style={{ fontFamily: FUENTE_DISPLAY, fontWeight: 900, fontSize: 16, color: SOBRE_NEGRO.texto }}>{v}</b> {v === 1 ? singular : plural}
    </span>
  )

  return (
    <section
      className="cp-rise"
      aria-labelledby="h-campeon"
      style={{ position: 'relative', height: CAMPEON_ALTO, borderRadius: 20, overflow: 'hidden', background: SOBRE_NEGRO.fondo }}
    >
      {/* La foto entera es el boton que abre la tarjeta en grande. */}
      <button
        type="button"
        onClick={() => tarjeta && setOpen(true)}
        disabled={!tarjeta}
        aria-label={`Ver en grande la tarjeta de ${leader.playerName}`}
        aria-haspopup="dialog"
        className="cp-photo-zoom"
        style={{ position: 'absolute', inset: 0, padding: 0, border: 'none', background: 'none', display: 'block', width: '100%' }}
      >
        {leader.playerPhoto && (
          <Image src={leader.playerPhoto} alt="" fill sizes={FULL_SIZES} preload className="object-cover object-top" />
        )}
      </button>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `linear-gradient(180deg, ${velo(55)} 0%, transparent 22%, transparent 45%, ${velo(92)} 78%), radial-gradient(circle at 50% 18%, color-mix(in srgb, ${SOBRE_NEGRO.oro} 28%, transparent) 0, transparent 55%)`,
        }}
      />

      <div style={{ position: 'absolute', top: 16, left: 16, right: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, pointerEvents: 'none' }}>
        <span style={{ background: SOBRE_NEGRO.oro, color: SOBRE_NEGRO.tinta, fontFamily: FUENTE_DISPLAY, fontWeight: 900, fontSize: 12, letterSpacing: '0.06em', padding: '6px 8px', borderRadius: 5, whiteSpace: 'nowrap' }}>
          DUEÑO DEL CINTURÓN
        </span>
        {fecha && (
          <span style={{ color: SOBRE_NEGRO.texto, fontFamily: FUENTE_DISPLAY, fontWeight: 800, fontSize: 12, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            FECHA {fecha}{totalDates ? ` DE ${totalDates}` : ''}
          </span>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '0 18px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          pointerEvents: 'none',
        }}
      >
        <h2 id="h-campeon" style={{ ...DISPLAY_CONDENSADO, margin: 0, textAlign: 'center', fontSize: heroTitleSize([l1, l2], 46), color: SOBRE_NEGRO.texto, whiteSpace: 'nowrap' }}>
          {l1}
          <br />
          <span style={{ color: SOBRE_NEGRO.oro }}>{l2}</span>
        </h2>

        {/* El cinturon: #1 · placa del torneo · puntos. */}
        <div
          style={{
            width: '100%',
            height: 64,
            borderRadius: 32,
            background: SOBRE_NEGRO.oro,
            boxShadow: `inset 0 0 0 4px ${SOBRE_NEGRO.oroOscuro}, 0 10px 22px ${velo(60)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 10px 0 22px',
          }}
        >
          <span style={{ fontFamily: FUENTE_DISPLAY, fontWeight: 900, fontSize: 34, color: SOBRE_NEGRO.tinta }}>#1</span>
          <span
            style={{
              minWidth: 56,
              height: 44,
              padding: '0 8px',
              borderRadius: 8,
              background: SOBRE_NEGRO.tinta,
              color: SOBRE_NEGRO.oro,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: FUENTE_DISPLAY,
              fontWeight: 900,
              fontSize: 13,
              letterSpacing: '0.08em',
            }}
          >
            T{tournamentNumber}
          </span>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 4, paddingRight: 12 }}>
            <span style={{ fontFamily: FUENTE_DISPLAY, fontWeight: 900, fontSize: 34, color: SOBRE_NEGRO.tinta }}>{scoreOf(leader)}</span>
            <span style={{ fontFamily: FUENTE_DISPLAY, fontWeight: 900, fontSize: 12, letterSpacing: '0.08em', color: SOBRE_NEGRO.tinta }}>PTS</span>
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: 18, rowGap: 4 }}>
          {cifra(mesasFinales, 'mesa final', 'mesas finales')}
          {cifra(podios, 'podio', 'podios')}
          {cifra(leader.firstPlaces, 'victoria', 'victorias')}
        </div>
      </div>

      {tarjeta && (
        <CPPhotoViewer
          open={open}
          onClose={() => setOpen(false)}
          src={tarjeta}
          alt={`Tarjeta de ${leader.playerName}`}
          aspectRatio={playerCardUrl(leader.playerPhoto) ? 2 / 3 : 3 / 4}
        />
      )}
    </section>
  )
}

/* ─────────────────────────── 2. LA CARTELERA ─────────────────────────── */

function Cartelera({ leader, second }: { leader: PlayerRanking; second: PlayerRanking }) {
  const lados = [
    { p: leader, rotulo: '#1 CAMPEÓN', color: SOBRE_NEGRO.oro, izquierda: true },
    { p: second, rotulo: '#2 RETADOR', color: SOBRE_NEGRO.plata, izquierda: false },
  ]
  return (
    <section className="cp-rise" aria-labelledby="h-cartelera" style={{ display: 'flex', flexDirection: 'column', gap: 12, animationDelay: '80ms' }}>
      <SectionHead id="h-cartelera" title="LA CARTELERA" />
      <div style={{ position: 'relative', height: 330, borderRadius: 20, overflow: 'hidden', background: SOBRE_NEGRO.fondo }}>
        {lados.map(({ p, rotulo, color, izquierda }) => (
          <Link
            key={p.playerId}
            href={`/players/${p.playerId}`}
            aria-label={`${rotulo}: ${p.playerName}, ${scoreOf(p)} puntos. Ver su perfil`}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: '62%',
              ...(izquierda ? { left: 0 } : { right: 0 }),
              clipPath: izquierda ? 'polygon(0 0, 100% 0, 72% 100%, 0 100%)' : 'polygon(28% 0, 100% 0, 100% 100%, 0 100%)',
              display: 'block',
            }}
          >
            {p.playerPhoto && (
              <Image src={p.playerPhoto} alt="" fill sizes="(min-width: 448px) 253px, calc((100vw - 40px) * 0.62)" className="object-cover object-top" />
            )}
            <span aria-hidden style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, transparent 55%, ${velo(90)} 100%)` }} />
            <span
              style={{
                position: 'absolute',
                bottom: 12,
                ...(izquierda ? { left: 14, alignItems: 'flex-start' } : { right: 14, alignItems: 'flex-end', textAlign: 'right' as const }),
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <span style={{ fontFamily: FUENTE_DISPLAY, fontWeight: 900, fontSize: 12, letterSpacing: '0.12em', color }}>{rotulo}</span>
              <span style={{ fontFamily: FUENTE_DISPLAY, fontWeight: 900, fontSize: 22, lineHeight: 1.1, color: SOBRE_NEGRO.texto }}>{nombre(p)}</span>
              <span style={{ fontFamily: FUENTE_DISPLAY, fontWeight: 900, fontSize: 30, lineHeight: 1, color: SOBRE_NEGRO.texto }}>{scoreOf(p)}</span>
            </span>
          </Link>
        ))}
        {/* La franja roja que separa a los dos, y el VS encima. */}
        <span aria-hidden style={{ position: 'absolute', top: -20, bottom: -20, left: '50%', width: 14, background: SOBRE_NEGRO.rojo, transform: 'translateX(-50%) rotate(14deg)', pointerEvents: 'none' }} />
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%',
            top: '42%',
            transform: 'translate(-50%, -50%) rotate(-8deg)',
            width: 76,
            height: 76,
            borderRadius: 38,
            background: SOBRE_NEGRO.rojo,
            border: `4px solid ${SOBRE_NEGRO.texto}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: SOBRE_NEGRO.sobreRojo,
            fontFamily: FUENTE_DISPLAY,
            fontWeight: 900,
            fontStyle: 'italic',
            fontSize: 32,
            boxShadow: `0 8px 18px ${velo(50)}`,
            pointerEvents: 'none',
          }}
        >
          VS
        </span>
      </div>
      <p
        style={{
          margin: 0,
          textAlign: 'center',
          fontFamily: FUENTE_DISPLAY,
          fontWeight: 900,
          fontVariationSettings: "'wdth' 75",
          fontSize: 22,
          letterSpacing: '0.04em',
          color: 'var(--cp-primary-light)',
        }}
      >
        {rivalryPhrase(scoreOf(leader) - scoreOf(second))}
      </p>
    </section>
  )
}

/* ─────────────────────────── TORNEO FINALIZADO ─────────────────────────── */

interface WinnerPlayer {
  id: string
  firstName: string
  lastName: string
  photoUrl: string | null
}
/** Ya desenvuelto por el fetcher de SWR (`{ success, data }` → `data`). */
type TournamentWinnersResponse = Array<{ tournamentNumber: number; champion: WinnerPlayer; runnerUp: WinnerPlayer; thirdPlace: WinnerPlayer }>

/**
 * Con el torneo cerrado no hay cinturon en juego: la tarjeta del campeon
 * (podio oficial, el mismo de Stats > Torneos; si la Comision no lo cargo, el
 * #1 de la tabla), el 2º y 3º, y que el proximo torneo esta por anunciar.
 */
function TorneoFinalizado({ rankings, tournamentNumber }: { rankings: PlayerRanking[]; tournamentNumber: number }) {
  const { data } = useSWR<TournamentWinnersResponse>('/api/tournaments/winners', { revalidateOnFocus: false })
  const oficial = data?.find(w => w.tournamentNumber === tournamentNumber)
  const podio = oficial
    ? [oficial.champion, oficial.runnerUp, oficial.thirdPlace].map(p => ({
        id: p.id,
        nombre: playerLabel(p),
        completo: `${p.firstName} ${p.lastName}`,
        photoUrl: p.photoUrl,
      }))
    : rankings.slice(0, 3).map(p => ({ id: p.playerId, nombre: nombre(p), completo: p.playerName, photoUrl: p.playerPhoto ?? null }))
  const [campeon, ...resto] = podio
  if (!campeon) return null

  return (
    <section
      className="cp-rise"
      aria-labelledby="h-finalizado"
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: FUENTE_DISPLAY, fontWeight: 800, fontSize: 12, letterSpacing: '0.14em', color: SOBRE_NEGRO.oro, whiteSpace: 'nowrap' }}>
        <Crown size={16} fill={SOBRE_NEGRO.oro} stroke="none" aria-hidden />
        TORNEO {tournamentNumber} FINALIZADO
      </div>
      <div style={{ transform: 'rotate(3deg)' }}>
        <CPPlayerCard
          photoUrl={campeon.photoUrl}
          name={campeon.completo}
          width={heroCardWidth(FINALIZADO_RESERVADO)}
          sizes="232px"
          zoomable
          style={{ boxShadow: `0 18px 40px ${velo(60)}, 0 0 0 3px ${SOBRE_NEGRO.oro}` }}
        />
      </div>
      <h2 id="h-finalizado" style={{ ...DISPLAY_CONDENSADO, margin: '4px 0 0', textAlign: 'center', fontSize: heroTitleSize([campeon.nombre, 'campeón del torneo'], 40), color: SOBRE_NEGRO.texto, whiteSpace: 'nowrap' }}>
        {campeon.nombre}
        <br />
        <span style={{ color: SOBRE_NEGRO.oro }}>Campeón T{tournamentNumber}</span>
      </h2>
      {resto.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: 18, rowGap: 4 }}>
          {resto.map((p, k) => (
            <Link key={p.id} href={`/players/${p.id}`} style={{ fontSize: 14, color: SOBRE_NEGRO.textoSuave, textDecoration: 'none', whiteSpace: 'nowrap', padding: '6px 0' }}>
              <b style={{ fontFamily: FUENTE_DISPLAY, fontWeight: 900, color: MEDALLA[k + 1] }}>{k + 2}º</b> {p.nombre}
            </Link>
          ))}
        </div>
      )}
      <div style={{ fontSize: 13, color: SOBRE_NEGRO.textoSuave }}>
        Próximo torneo: <span style={{ color: SOBRE_NEGRO.oro, fontWeight: 700 }}>por anunciar</span>
      </div>
    </section>
  )
}

export default HomeTorneoLucha
