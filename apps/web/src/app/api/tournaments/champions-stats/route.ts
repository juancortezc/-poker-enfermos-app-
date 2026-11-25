import { prisma } from '@/lib/prisma'
import { getTournamentWinnersWithFallback } from '@/lib/tournament-winners'
import { withErrorHandler } from '@/lib/errors'
import { ok } from '@/lib/http'

/**
 * GET /api/tournaments/champions-stats
 * Obtener estadísticas detalladas de campeones históricos
 *
 * El orden del ranking se decide por el podio completo, no por la fecha:
 *   1º  cantidad de campeonatos (primeros lugares)
 *   2º  si empatan, cantidad de segundos lugares
 *   3º  si siguen empatados, cantidad de terceros
 *   4º  alfabetico, para que el orden nunca quede indefinido
 *
 * Antes el desempate era "el que gano mas recientemente". Se cambio porque
 * premiaba la casualidad del calendario y no el historial: con los mismos
 * campeonatos, pesa quien estuvo mas veces cerca de ganar.
 *
 * `secondPlacesCount` y `thirdPlacesCount` viajan en la respuesta por si alguna
 * pantalla necesita explicar un empate, pero hoy NINGUNA los muestra: el diseño
 * aprobado de la tabla de campeones no lleva esas columnas. Se quedan porque el
 * orden los usa, no porque se vean.
 */
export const GET = withErrorHandler(async () => {
  const winners = await getTournamentWinnersWithFallback(prisma)

  type Jugador = (typeof winners)[number]['champion']

  const championsMap = new Map<string, {
    player: Jugador
    championshipsCount: number
    secondPlacesCount: number
    thirdPlacesCount: number
    tournamentNumbers: number[]
  }>()

  /** Devuelve la fila del jugador, creandola vacia si es la primera vez. */
  const filaDe = (player: Jugador) => {
    if (!player) return null
    let fila = championsMap.get(player.id)
    if (!fila) {
      fila = {
        player,
        championshipsCount: 0,
        secondPlacesCount: 0,
        thirdPlacesCount: 0,
        tournamentNumbers: []
      }
      championsMap.set(player.id, fila)
    }
    return fila
  }

  winners.forEach(winner => {
    const campeon = filaDe(winner.champion)
    if (campeon) {
      campeon.championshipsCount += 1
      campeon.tournamentNumbers.push(winner.tournamentNumber)
    }

    // Los segundos y terceros se cuentan aunque nunca hayan ganado: hacen
    // falta para desempatar a quienes si ganaron.
    const segundo = filaDe(winner.runnerUp)
    if (segundo) segundo.secondPlacesCount += 1

    const tercero = filaDe(winner.thirdPlace)
    if (tercero) tercero.thirdPlacesCount += 1
  })

  const championsWithDetails = Array.from(championsMap.values())
    // Esta es la tabla de CAMPEONES: quien nunca gano no entra, solo aporto
    // sus segundos y terceros al desempate de los demas.
    .filter(champion => champion.championshipsCount > 0)
    .sort((a, b) => {
      if (b.championshipsCount !== a.championshipsCount) {
        return b.championshipsCount - a.championshipsCount
      }

      if (b.secondPlacesCount !== a.secondPlacesCount) {
        return b.secondPlacesCount - a.secondPlacesCount
      }

      if (b.thirdPlacesCount !== a.thirdPlacesCount) {
        return b.thirdPlacesCount - a.thirdPlacesCount
      }

      // Como último criterio, ordenar alfabéticamente
      const nameA = `${a.player.firstName} ${a.player.lastName}`.toLowerCase()
      const nameB = `${b.player.firstName} ${b.player.lastName}`.toLowerCase()
      return nameA.localeCompare(nameB)
    })

  // Solo `all`. La respuesta traia ademas `top3` y `others` —el mismo `all`
  // partido en dos, que la pestaña volvia a pegar con un concat— y los
  // totales `totalChampions`/`totalChampionships`, que nadie renderizaba.
  return ok({
    all: championsWithDetails
  })
})
