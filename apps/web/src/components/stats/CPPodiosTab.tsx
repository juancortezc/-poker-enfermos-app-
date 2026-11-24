'use client'

import useSWR from 'swr'
import {
  CPHistoricoTab,
  CargandoHistorico,
  ErrorHistorico,
  PALETA_METAL,
  type Jugador,
  type FilaHistorico,
} from './CPHistoricoTab'

/**
 * Los podios historicos: cuantas veces cada uno termino entre los tres
 * primeros de un torneo.
 *
 * El orden lo decide la API (total de podios, y si empatan, primeros, segundos
 * y terceros). Que los que ya no juegan vayan al final lo resuelve
 * `CPHistoricoTab`, igual que para las otras dos tablas historicas.
 */

interface PodiumStat {
  player: Jugador
  firstPlaces: number
  secondPlaces: number
  thirdPlaces: number
  totalPodiums: number
}

interface Respuesta {
  success: boolean
  error?: string
  data?: { players: PodiumStat[] }
}

export default function CPPodiosTab() {
  // SWR con el fetcher GLOBAL (de `swr-config`), sin pasar uno propio: es el
  // que lleva la credencial y el unico que ante un 401 cierra la sesion y
  // devuelve al login. Con `fetch` a pelo, una clave caducada dejaba esta
  // pestaña clavada en "Error al cargar podios".
  const { data, error, isLoading, mutate } = useSWR<Respuesta>('/api/tournaments/podium-stats')

  if (isLoading) return <CargandoHistorico texto="Cargando podios..." />

  if (error || (data && !data.success)) {
    return (
      <ErrorHistorico
        mensaje={data?.error ?? 'Error al cargar podios'}
        paleta={PALETA_METAL}
        onReintentar={() => void mutate()}
      />
    )
  }

  if (!data?.data) return null

  const filas: FilaHistorico[] = data.data.players.map(s => ({
    jugador: s.player,
    total: s.totalPodiums,
    pie: `${s.firstPlaces}·${s.secondPlaces}·${s.thirdPlaces}`,
    detalle: (
      <p className="tabular-nums" style={{ fontSize: 11, color: 'var(--cp-on-surface-muted)' }}>
        1ro {s.firstPlaces} · 2do {s.secondPlaces} · 3ro {s.thirdPlaces}
      </p>
    ),
  }))

  return <CPHistoricoTab filas={filas} paleta={PALETA_METAL} vacio="No hay datos de podios" />
}
