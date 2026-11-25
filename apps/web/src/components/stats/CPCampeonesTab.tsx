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
 * Los campeones historicos.
 *
 * El orden lo decide la API (campeonatos, y si empatan, segundos y terceros).
 * Que los que ya no juegan vayan al final lo resuelve `CPHistoricoTab`, igual
 * que para las otras dos tablas historicas.
 */

interface ChampionData {
  player: Jugador
  championshipsCount: number
  tournamentNumbers: number[]
}

/** `data` ya desenvuelto por el fetcher global (formato viejo o nuevo). */
interface Respuesta {
  all: ChampionData[]
}

export default function CPCampeonesTab() {
  // SWR con el fetcher GLOBAL (de `swr-config`), sin pasar uno propio. Esto no
  // es solo por ahorrar codigo: ese fetcher es el que adjunta la credencial y
  // el unico que ante un 401 borra la sesion y devuelve al login. Con `fetch` a
  // pelo, una clave caducada dejaba esta pestaña mostrando "Error al cargar
  // campeones" para siempre, sin forma de salir de ahi.
  const { data, error, isLoading, mutate } = useSWR<Respuesta>('/api/tournaments/champions-stats')

  if (isLoading) return <CargandoHistorico texto="Cargando campeones..." />

  if (error) {
    return (
      <ErrorHistorico
        mensaje={error.message || 'Error al cargar campeones'}
        paleta={PALETA_METAL}
        onReintentar={() => void mutate()}
      />
    )
  }

  if (!data) return null

  // `all` ya viene en orden; antes esta pestaña leia `top3` y `others` y los
  // volvia a pegar, o sea deshacia un corte que el endpoint hacia solo para
  // ella.
  const filas: FilaHistorico[] = data.all.map(c => ({
    jugador: c.player,
    total: c.championshipsCount,
  }))

  return <CPHistoricoTab filas={filas} paleta={PALETA_METAL} vacio="No hay datos de campeones" />
}
