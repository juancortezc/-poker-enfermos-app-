'use client'

import useSWR from 'swr'
import Image from 'next/image'
import {
  CPHistoricoTab,
  CargandoHistorico,
  ErrorHistorico,
  PALETA_ROSA,
  type Jugador,
  type FilaHistorico,
} from './CPHistoricoTab'

/**
 * El 7/2 historico, en rosa.
 *
 * El rosa es el color del malazo en toda la app, asi que esta pestaña no usa
 * el oro: ganar el 7/2 no es lo mismo que ganar el torneo.
 *
 * Los rosas salen TODOS de `PALETA_ROSA`, incluidos los del panel de abajo.
 * Estaban escritos a mano (`#AD1457` cuatro veces, `#ec489920` y `#EC4899`),
 * asi que el compartido prometia ser el dueño del color y no lo era: cambiar la
 * paleta dejaba media pestaña con el rosa viejo.
 *
 * El 2 es el ULTIMO del torneo y el 7 el penultimo. La cifra grande es el TOTAL
 * —las veces que te llevaste el 7/2— y el desglose de abajo muestra de que esta
 * hecho, que es ademas lo que desempata: primero quien fue ultimo mas veces.
 */

interface FilaApi {
  player: Jugador
  sieteCount: number
  dosCount: number
  sieteTournaments: number[]
  dosTournaments: number[]
  total: number
}

interface PorTorneo {
  tournamentNumber: number
  siete: Jugador | null
  dos: Jugador | null
}

/** `data` ya desenvuelto por el fetcher global (formato viejo o nuevo). */
interface Respuesta {
  all: FilaApi[]
  porTorneo: PorTorneo[]
}

export default function CPSieteTab() {
  // SWR con el fetcher GLOBAL (de `swr-config`), sin pasar uno propio: es el
  // que lleva la credencial y el unico que ante un 401 cierra la sesion y
  // devuelve al login. Con `fetch` a pelo, una clave caducada dejaba esta
  // pestaña clavada en "Error al cargar el 7/2".
  const { data, error, isLoading, mutate } = useSWR<Respuesta>('/api/tournaments/siete-stats')

  if (isLoading) return <CargandoHistorico texto="Cargando el 7/2..." />

  if (error) {
    return (
      <ErrorHistorico
        mensaje={error.message || 'Error al cargar el 7/2'}
        paleta={PALETA_ROSA}
        onReintentar={() => void mutate()}
      />
    )
  }

  if (!data) return null

  const datos = data

  // Los dos van primero, y la FIRMA lo dice: eran dos `number[]` seguidos que
  // TypeScript no distingue, asi que un intercambio en cualquiera de los dos
  // extremos reetiquetaba en silencio todos los torneos de la linea. Este orden
  // ya se cambio una vez.
  const listaTorneos = (dos: number[], sietes: number[]) => {
    const parte = (etiqueta: string, ts: number[]) =>
      ts.length ? `${etiqueta}: ${[...ts].sort((a, b) => b - a).map(t => `T${t}`).join(' · ')}` : ''
    return [parte('2', dos), parte('7', sietes)].filter(Boolean).join('   ')
  }

  const filas: FilaHistorico[] = datos.all
    .filter((f): f is FilaApi & { player: Jugador } => Boolean(f.player))
    .map(f => ({
      jugador: f.player,
      total: f.total,
      pie: `2:${f.dosCount} · 7:${f.sieteCount}`,
      detalle: (
        // Sin truncar: la queja fue justamente que no se veian los torneos del
        // primero. Si no caben en una linea, que bajen.
        <p style={{ fontSize: 11, color: 'var(--cp-on-surface-muted)', lineHeight: 1.5 }}>
          {listaTorneos(f.dosTournaments, f.sieteTournaments)}
        </p>
      ),
    }))

  return (
    <div className="space-y-4">
      <CPHistoricoTab filas={filas} paleta={PALETA_ROSA} vacio="Todavia no hay 7/2 registrados" />

      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--cp-surface)', border: '1px solid var(--cp-surface-border)' }}
      >
        <div
          className="px-4 py-3 font-bold uppercase"
          style={{
            fontSize: 'var(--cp-caption-size)',
            letterSpacing: '0.08em',
            color: PALETA_ROSA.metales[0],
            borderBottom: '1px solid var(--cp-surface-border)',
          }}
        >
          El 7/2 de cada torneo
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--cp-surface-border)' }}>
          {datos.porTorneo.map(t => (
            <div key={t.tournamentNumber} className="flex items-center gap-3 p-3">
              <div
                className="px-2 py-0.5 rounded-full font-bold flex-shrink-0 tabular-nums"
                style={{
                  background: PALETA_ROSA.pastillaFondo,
                  color: PALETA_ROSA.pastillaTexto,
                  fontSize: 12,
                }}
              >
                T{t.tournamentNumber}
              </div>
              {/* El 2 primero: es el ultimo del torneo, el peor de los dos. */}
              <Premio etiqueta="2" jugador={t.dos} />
              <Premio etiqueta="7" jugador={t.siete} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Premio({ etiqueta, jugador }: { etiqueta: string; jugador: Jugador | null }) {
  if (!jugador) return <div className="flex-1" />
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <span className="font-bold flex-shrink-0" style={{ fontSize: 12, color: PALETA_ROSA.pastillaTexto }}>
        {etiqueta}
      </span>
      <div className="relative w-10 h-10 flex-shrink-0 overflow-hidden rounded-full border border-black/10">
        {jugador.photoUrl ? (
          <Image src={jugador.photoUrl} alt={jugador.firstName} fill sizes="40px" className="object-cover object-top" />
        ) : (
          // El rosa claro de la paleta: sobre el va texto blanco, no es texto.
          <div
            className="flex h-full w-full items-center justify-center font-semibold"
            style={{ background: PALETA_ROSA.metales[2], color: 'white', fontSize: 13 }}
          >
            {jugador.firstName.charAt(0)}
            {jugador.lastName.charAt(0)}
          </div>
        )}
      </div>
      <span className="truncate" style={{ fontSize: 12, color: 'var(--cp-on-surface)' }}>
        {jugador.firstName} {jugador.lastName.charAt(0)}.
      </span>
    </div>
  )
}
