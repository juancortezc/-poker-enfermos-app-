import { computeTournamentAwardsData } from '@poker/shared'
import { loadTournamentStatsInput } from '@/lib/tournament-stats-data'

export interface AwardPlayer {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string | null
}

export interface AwardsResponse {
  tournament: {
    id: number
    number: number
    name: string
  }
  awards: {
    varon: { player: AwardPlayer; eliminations: number }[]
    gay: { player: AwardPlayer; eliminations: number }[]
    podios: { player: AwardPlayer; count: number }[]
    /**
     * Veces en el 7/2 de la noche (los dos primeros en salir). `count` es el
     * total; `dosCount` las veces que salio primero y `sieteCount` segundo.
     */
    sieteYDos: { player: AwardPlayer; count: number; sieteCount: number; dosCount: number }[]
    sinPodio: AwardPlayer[]
    faltas: { player: AwardPlayer; count: number }[]
    mesasFinales: { player: AwardPlayer; count: number }[]
    victorias: { player: AwardPlayer; count: number }[]
  }
}

/**
 * Las 8 categorias de premiacion de un torneo (Varon, Gay, Podios, 7/2, Sin
 * Podio, Faltas, Mesas Finales, Victorias). El calculo vive en @poker/shared
 * (computeTournamentAwardsData) y lo usan tambien el reporte XLSX y sus
 * pantallas, asi que siempre coinciden.
 */
export async function computeTournamentAwards(tournamentIdNum: number): Promise<AwardsResponse | null> {
  const loaded = await loadTournamentStatsInput(tournamentIdNum)
  if (!loaded) return null
  const { tournament, input, playersById } = loaded

  const data = computeTournamentAwardsData(input)
  const player = (id: string): AwardPlayer => {
    const p = playersById.get(id)
    return { id, firstName: p?.firstName ?? '', lastName: p?.lastName ?? '', photoUrl: p?.photoUrl ?? null }
  }

  return {
    tournament: { id: tournament.id, number: tournament.number, name: tournament.name },
    awards: {
      varon: data.varon.map(a => ({ player: player(a.playerId), eliminations: a.count })),
      gay: data.gay.map(a => ({ player: player(a.playerId), eliminations: a.count })),
      podios: data.podios.map(a => ({ player: player(a.playerId), count: a.count })),
      sieteYDos: data.sieteYDos.map(a => ({
        player: player(a.playerId),
        count: a.count,
        sieteCount: a.sieteCount,
        dosCount: a.dosCount
      })),
      sinPodio: data.sinPodio.map(player),
      faltas: data.faltas.map(a => ({ player: player(a.playerId), count: a.count })),
      mesasFinales: data.mesasFinales.map(a => ({ player: player(a.playerId), count: a.count })),
      victorias: data.victorias.map(a => ({ player: player(a.playerId), count: a.count }))
    }
  }
}
