'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { SCORE_LABELS } from '@poker/shared'
import { shortenFullName } from '@poker/shared'
import type { LiveRankingData, LiveRankingRow } from '@/lib/live-ranking'

const MUTED = 'rgba(255,255,255,0.42)'
/** Separadores: una linea finisima, nunca un relleno. */
const LINEA = '1px solid rgba(255,255,255,0.10)'
/** Ambar: todo lo que todavia puede cambiar, y los puntos en juego. */
const AMBAR = '#F0B429'
/** Rojo del club: la marca y el "tu". Nada mas. */
const LIVE = '#E53935'
/** Rosa: los dos ultimos, que es lo que significa el rosa en toda la app. */
const ROSA = '#EC4899'
/** Zebra apenas perceptible: ordena la lectura sin convertirse en material. */
const ZEBRA = 'rgba(255,255,255,0.025)'

/**
 * LIMPIO Y VIBRANTE, SOBRE NEGRO.
 *
 * La version anterior tenia un panel con relleno propio por cada bloque, un
 * tinte rojo detras del "tu" y del ultimo eliminado, filas alternadas, medallas
 * de oro, plata y bronce, y un KPI en turquesa. Siete materiales distintos
 * compitiendo en una pantalla de 390px: se veia sucia y ningun color
 * significaba nada porque estaban todos.
 *
 * Ahora el fondo es negro plano y NINGUN bloque tiene relleno. Lo que separa
 * son lineas de una decima de opacidad. Quedan tres colores y cada uno dice
 * una sola cosa:
 *
 *   blanco  lo que ya quedo definido
 *   ambar   lo que sigue en juego y los puntos que estan en disputa
 *   rojo    tu
 *
 * El verde y el naranja de las flechas sobreviven porque la direccion de un
 * cambio de puesto se lee por color antes que por forma, pero van atenuados y
 * no compiten.
 *
 * Toda la pantalla tiene que entrar sin desplazar con 19 jugadores en un
 * iPhone 14 (390x844). Esta medido en el navegador, no sumado en papel: si
 * agregas algo, medilo de nuevo.
 */

function Kpi({ label, value, hint, accent }: { label: string; value: string; hint: string; accent?: string }) {
  return (
    <div
      className="flex-1 min-w-0 px-2 py-1"
      style={{ border: LINEA, borderRadius: 5 }}
    >
      <p className="uppercase truncate" style={{ fontSize: 11, letterSpacing: '0.12em', color: MUTED }}>
        {label}
      </p>
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className="leading-none tabular-nums" style={{ fontSize: 22, fontWeight: 800, color: accent ?? '#fff' }}>
          {value}
        </span>
        <span className="truncate leading-none" style={{ fontSize: 11, color: MUTED }}>
          {hint}
        </span>
      </div>
    </div>
  )
}

/**
 * El cambio de puesto respecto al arranque de la fecha.
 *
 * `salio` dice si el jugador ya esta fuera de la mesa, y de eso dependen el
 * relleno y la intensidad de la flecha: antes se veia igual para alguien que ya
 * salio y para alguien que sigue jugando, y no habia forma de leer de un
 * vistazo cuanto de la tabla todavia se mueve.
 *
 * OJO con lo que significa: lo definitivo de quien ya salio es su PUNTAJE, no
 * su puesto. El puesto sigue cambiando mientras los de la mesa suman y lo pasan
 * o lo dejan atras. Por eso la leyenda dice "ya salio" y no "fijo".
 */
function Var({ change, salio }: { change: number; salio: boolean }) {
  if (change === 0) {
    return <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)' }}>—</span>
  }
  const up = change > 0
  return (
    <span
      className="inline-flex items-center gap-0.5"
      style={{
        color: up ? '#6ECB71' : LIVE,
        fontSize: 13,
        fontWeight: salio ? 800 : 500,
        opacity: salio ? 1 : 0.6,
      }}
    >
      <span style={{ fontSize: 12 }}>{up ? (salio ? '▲' : '△') : (salio ? '▼' : '▽')}</span>
      {Math.abs(change)}
    </span>
  )
}

/**
 * Responde las tres preguntas que el jugador se hace en la mesa: cuánto tenía,
 * cuánto gana si sale ahora y con cuánto termina, más la posición resultante.
 *
 * El punto fino: el ELIMINA descarta un número FIJO de peores fechas. Al
 * entrar la fecha de hoy al conjunto cambia cuál fecha se descarta, así que lo
 * que hoy le suma al puntaje final casi nunca es igual al premio de la fecha.
 * Puede ser 0 (hoy es de las peores y se descarta) o incluso mayor que el
 * premio (hoy destapa una fecha peor que ya no se descarta). Ese desfase era
 * lo que no se entendía: el puntaje quieto y la posición moviéndose. Por eso
 * se nombra en vez de dejarlo implícito.
 */
function MyStatus({ row, nextPosition }: { row: LiveRankingRow; nextPosition: number }) {
  const playing = row.state === 'playing'
  // Lo que la fecha de hoy le suma DE VERDAD al puntaje final, que casi nunca
  // es el premio de la noche: al entrar la fecha de hoy cambia cual de las
  // viejas descarta el ELIMINA. Es este numero el que se muestra, y no el
  // premio, para que la linea cuadre: antes decia "Traias 108 · ganas +27 ·
  // terminas 108" y parecia una cuenta mal hecha.
  const sumaReal = row.score - row.baseScore

  return (
    <div
      className="py-1.5 pl-2.5 pr-2"
      style={{ border: LINEA, borderLeft: `3px solid ${LIVE}`, borderRadius: 5 }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="uppercase truncate" style={{ fontSize: 12, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.72)' }}>
          {playing ? `Tú · sales ${nextPosition}º` : `Tú · saliste ${row.eliminationPosition}º`}
        </p>
        <p className="flex items-center gap-1.5 flex-shrink-0">
          <span className="tabular-nums" style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{row.position}º</span>
          <Var change={row.positionsChanged} salio={!playing} />
        </p>
      </div>

      <div className="flex items-baseline gap-1.5 mt-0.5" style={{ fontSize: 13 }}>
        <span style={{ color: MUTED }}>Traías</span>
        <span className="tabular-nums" style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{row.baseScore}</span>
        <span style={{ color: MUTED }}>·</span>
        <span style={{ color: MUTED }}>{playing ? 'sumas' : 'sumaste'}</span>
        <span className="tabular-nums" style={{ fontSize: 14, fontWeight: 800, color: playing ? AMBAR : '#fff' }}>
          {sumaReal >= 0 ? '+' : ''}{sumaReal}
        </span>
        <span style={{ color: MUTED }}>·</span>
        <span style={{ color: MUTED }}>{playing ? 'terminas' : 'terminaste'}</span>
        <span className="tabular-nums" style={{ fontSize: 14, fontWeight: 800, color: playing ? AMBAR : '#fff' }}>
          {row.score}
        </span>
      </div>

    </div>
  )
}

/**
 * Una fila de la tabla.
 *
 * TODO lo que puede cambiar va en ambar y atenuado; todo lo que ya quedo fijo
 * va en blanco y solido. Antes esa diferencia estaba solo en los puntos y el
 * resto de la fila se veia igual para alguien que ya salio y para alguien que
 * sigue en mesa, asi que no habia forma de leer de un vistazo cuanto de la
 * tabla es definitivo. Ahora el puesto, el nombre, los puntos y la flecha
 * dicen lo mismo a la vez.
 */
function Row({
  row,
  isMe,
  zebra,
  esUltimo,
}: {
  row: LiveRankingRow
  isMe: boolean
  zebra: boolean
  /** Uno de los dos ultimos de la tabla: candidato al 7/2. */
  esUltimo: boolean
}) {
  const enMesa = row.state === 'playing'
  const ausente = row.state === 'absent'

  // El rosa de los dos ultimos gana sobre el blanco/ambar del estado: en toda
  // la app el rosa significa el malazo, y aqui interesa verlos venir desde
  // lejos. Los puntos siguen el estado normal, porque ahi lo que importa es si
  // la cifra ya quedo fija.
  const tintaNombre = esUltimo
    ? ROSA
    : ausente
      ? 'rgba(255,255,255,0.28)'
      : enMesa
        ? 'rgba(255,255,255,0.72)'
        : '#fff'
  const tintaPuesto = esUltimo
    ? ROSA
    : ausente
      ? 'rgba(255,255,255,0.28)'
      : enMesa
        ? AMBAR
        : '#fff'

  return (
    <div
      className="flex items-center gap-2 pr-2"
      style={{
        height: 23,
        background: zebra ? ZEBRA : 'transparent',
        borderLeft: isMe ? `3px solid ${LIVE}` : '3px solid transparent',
        paddingLeft: 5,
      }}
    >
      {/* Sin medallas de oro, plata y bronce: eran tres colores mas para
          repetir lo que el numero ya dice, y en una tabla de 19 filas
          ensuciaban mas de lo que ayudaban. */}
      <div className="flex-shrink-0 text-right" style={{ width: 18 }}>
        <span
          className="tabular-nums"
          style={{
            fontSize: 13,
            fontWeight: enMesa && !esUltimo ? 500 : 700,
            color: tintaPuesto,
          }}
        >
          {row.position}
        </span>
      </div>

      <span
        className="flex-1 truncate"
        style={{
          fontSize: 13,
          fontWeight: isMe ? 700 : enMesa && !esUltimo ? 400 : 600,
          color: tintaNombre,
        }}
      >
        {shortenFullName(row.playerName)}
      </span>

      <span
        className="text-right tabular-nums flex-shrink-0"
        style={{
          width: 34,
          fontSize: 13,
          fontWeight: enMesa ? 500 : 800,
          color: enMesa ? AMBAR : '#fff',
        }}
      >
        {row.score}
      </span>

      <span className="text-right flex-shrink-0" style={{ width: 28 }}>
        <Var change={row.positionsChanged} salio={!enMesa} />
      </span>
    </div>
  )
}

/**
 * Explicacion del calculo, en el idioma de la mesa.
 *
 * La version anterior de esto era una nota de tres lineas metida dentro del
 * bloque "tu", que comia altura en la unica pantalla donde no sobra y que solo
 * aparecia en un caso particular. Aqui esta siempre disponible, no ocupa nada
 * hasta que alguien la pide, y se puede leer entera sin tecnicismos.
 */
function ComoSeCalcula({ descartes, onCerrar }: { descartes: number; onCerrar: () => void }) {
  const puntos = [
    'La tabla muestra como quedaria el torneo si la fecha terminara ahora mismo.',
    'A los que siguen en mesa se les cuenta lo minimo: los puntos del proximo en salir. Su cifra solo puede subir.',
    'Por eso van en ambar: todavia se mueven.',
    'Los que ya salieron tienen sus puntos definitivos, y van en blanco.',
    `Al final del torneo se descartan tus ${descartes} peores fechas. Por eso a veces ganas puntos en la noche y tu total no sube: hoy es una de las que se van a descartar.`,
    'La flecha compara tu puesto de ahora con el que traias antes de empezar la fecha.',
  ]

  return (
    <div
      className="fixed inset-0 flex items-end justify-center"
      // Por encima del menu inferior, que es fixed con z-50 y viene despues en
      // el arbol: sin esto tapaba el boton de cerrar y el modal no se podia
      // salir con el dedo.
      style={{ background: 'rgba(0,0,0,0.72)', zIndex: 60 }}
      onClick={onCerrar}
      role="presentation"
    >
      <div
        className="w-full max-w-md"
        style={{
          background: '#0A0A0A',
          borderTop: LINEA,
          borderRadius: '12px 12px 0 0',
          padding: '18px 18px calc(28px + env(safe-area-inset-bottom, 0px))',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Como se calcula"
      >
        <h2
          className="uppercase"
          style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', color: '#fff', marginBottom: 14 }}
        >
          Como se calcula
        </h2>

        <ul className="flex flex-col gap-2.5" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {puntos.map((texto) => (
            <li key={texto} className="flex gap-2.5" style={{ fontSize: 13, lineHeight: 1.45, color: 'rgba(255,255,255,0.82)' }}>
              <span style={{ color: AMBAR, flexShrink: 0 }}>·</span>
              <span>{texto}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onCerrar}
          className="w-full touch-manipulation"
          style={{
            marginTop: 18,
            height: 44,
            borderRadius: 5,
            border: 'none',
            background: LIVE,
            color: '#fff',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Entendido
        </button>
      </div>
    </div>
  )
}

export function LiveDateBoard({
  gameDateId,
  userId,
}: {
  gameDateId: number
  userId: string
}) {
  const [explicacion, setExplicacion] = useState(false)

  const { data, error, isLoading } = useSWR<LiveRankingData>(
    `/api/game-dates/${gameDateId}/live-ranking`,
    { refreshInterval: 5000, revalidateOnFocus: true, dedupingInterval: 2000 }
  )

  if (isLoading) {
    return (
      <div className="py-10 text-center" style={{ color: MUTED, fontSize: 13 }}>
        Cargando la mesa...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="py-10 text-center" style={{ color: MUTED, fontSize: 13 }}>
        No se pudo cargar el estado de la fecha.
      </div>
    )
  }

  const { gameDate, projection, lastElimination, rows } = data
  const me = rows.find((r) => r.playerId === userId)
  const showMyStatus = me && me.state !== 'absent'

  return (
    <div className="space-y-2">
      {/*
        Tres cifras, en el orden en que se preguntan en la mesa: cuantos
        quedan, cuanto paga caer ahora y cuanto se lleva el que gane. Antes la
        primera era "Jugadores" (un numero que no cambia en toda la noche) y la
        tercera el blind, que lo dice el timer.

        Las dos cifras de puntos van en ambar porque son lo que esta en juego;
        el turquesa que tenia la tercera era un cuarto color sin un rol propio.
      */}
      <div className="flex gap-2 py-1">
        <Kpi
          label="En mesa"
          value={String(gameDate.playersRemaining)}
          hint={`${gameDate.eliminationsCount} fuera`}
        />
        {gameDate.playersRemaining > 0 ? (
          <Kpi
            label="Siguiente"
            value={`+${projection.nextPoints}`}
            hint={`sale ${projection.nextPosition}º`}
            accent={AMBAR}
          />
        ) : (
          <Kpi label="Siguiente" value="—" hint="fecha completa" />
        )}
        <Kpi
          label="Ganador"
          value={`+${projection.winnerPoints}`}
          hint="puntos"
          accent={AMBAR}
        />
      </div>

      {/*
        Último eliminado en una sola línea. Los puntos van en BLANCO y no en
        ámbar: ya son reales, el ámbar es solo de lo proyectado.
      */}
      {lastElimination && (
        <div className="flex items-center gap-2 py-1.5" style={{ borderBottom: LINEA }}>
          <span
            className="uppercase flex-shrink-0"
            style={{ fontSize: 12, letterSpacing: '0.1em', color: MUTED }}
          >
            Último
          </span>
          <span className="flex-1 truncate" style={{ fontSize: 13, color: '#fff' }}>
            <span className="tabular-nums" style={{ color: MUTED }}>{lastElimination.position}º </span>
            <span style={{ fontWeight: 700 }}>{shortenFullName(lastElimination.playerName)}</span>
            <span style={{ color: MUTED }}> por {shortenFullName(lastElimination.eliminatorName)}</span>
          </span>
          <span className="flex-shrink-0 tabular-nums" style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>
            +{lastElimination.points}
          </span>
        </div>
      )}

      {showMyStatus && <MyStatus row={me} nextPosition={projection.nextPosition} />}

      {/* Tabla del torneo */}
      <div>
        {/*
          El título comparte fila con los encabezados de columna: eran dos
          filas de encabezado una encima de la otra y la pantalla no tiene
          altura para las dos. El "#" y "Jugador" se fueron — una posición y un
          nombre no necesitan que se los nombre; PTS y Var sí.
        */}
        <div
          className="flex items-center gap-2 pr-2 py-1.5"
          style={{ borderBottom: LINEA, borderLeft: '3px solid transparent', paddingLeft: 5 }}
        >
          <h2 className="flex-1 truncate uppercase" style={{ fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: '0.06em' }}>
            Tabla proyectada en vivo
          </h2>
          <span
            className="uppercase text-right flex-shrink-0"
            style={{ width: 34, fontSize: 12, letterSpacing: '0.08em', color: MUTED }}
          >
            {SCORE_LABELS.pointsShort}
          </span>
          <span
            className="uppercase text-right flex-shrink-0"
            style={{ width: 28, fontSize: 12, letterSpacing: '0.08em', color: MUTED }}
          >
            Var
          </span>
        </div>

        {rows.map((row, i) => (
          <Row
            key={row.playerId}
            row={row}
            isMe={row.playerId === userId}
            zebra={i % 2 === 1}
            esUltimo={i >= rows.length - 2}
          />
        ))}

        <div
          className="flex items-center gap-2 py-1.5"
          style={{ fontSize: 12, color: MUTED, lineHeight: 1.35, borderTop: LINEA }}
        >
          <p className="flex-1 min-w-0">
            <span style={{ color: AMBAR }}>●</span> Proyección{'  '}
            <span style={{ color: '#fff' }}>●</span> Puntos reales
          </p>

          <button
            type="button"
            onClick={() => setExplicacion(true)}
            aria-label="Cómo se calcula"
            className="flex-shrink-0 flex items-center justify-center touch-manipulation"
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: LINEA,
              background: 'transparent',
              color: MUTED,
              fontSize: 13,
              fontWeight: 700,
              fontStyle: 'italic',
              cursor: 'pointer',
            }}
          >
            i
          </button>
        </div>
      </div>

      {explicacion && (
        <ComoSeCalcula
          descartes={projection.datesToEliminate}
          onCerrar={() => setExplicacion(false)}
        />
      )}
    </div>
  )
}
