import { prisma } from '@/lib/prisma'
import { getTournamentWinnersWithFallback } from '@/lib/tournament-winners'
import { withErrorHandler } from '@/lib/errors'
import { ok } from '@/lib/http'

/**
 * GET /api/tournaments/siete-stats
 *
 * El 7/2 historico: el espejo de /api/tournaments/champions-stats, pero del
 * otro lado de la tabla. Se lee del mismo registro (TournamentWinners), asi que
 * no hay una segunda fuente de verdad.
 *
 * QUE SIGNIFICAN EL 7 Y EL 2
 *
 * Son los dos ultimos puestos del torneo, nombrados por la peor mano del
 * poker: el **2 es el ULTIMO** y el **7 el PENULTIMO**. Cada torneo reparte uno
 * de cada uno, en columnas distintas de la tabla (`dosId` y `sieteId`).
 *
 * EL ORDEN
 *
 * Manda el TOTAL, porque es la cantidad de veces que te llevaste el 7/2. Si dos
 * empatan en total, desempata quien fue ULTIMO mas veces —el 2 es peor que el
 * 7—, y si no, alfabetico, para que el orden nunca quede indefinido. No hay un
 * tercer criterio por sietes: como el total es siete + dos, empatar en los dos
 * campos anteriores ya obliga a empatar tambien en sietes.
 *
 * El desempate iba antes por sietes, que es al reves: entre dos jugadores con
 * seis apariciones, ponia primero al que casi nunca quedo ultimo.
 */
export const GET = withErrorHandler(async () => {
  const winners = await getTournamentWinnersWithFallback(prisma)

  type Jugador = (typeof winners)[number]['siete']

  interface Fila {
    player: Jugador
    sieteCount: number
    dosCount: number
    /** Torneos donde se llevo el 7. */
    sieteTournaments: number[]
    /** Torneos donde se llevo el 2. */
    dosTournaments: number[]
  }

  const mapa = new Map<string, Fila>()

  /** Devuelve la fila del jugador, creandola vacia si es la primera vez. */
  const filaDe = (player: Jugador): Fila | null => {
    if (!player) return null
    let fila = mapa.get(player.id)
    if (!fila) {
      fila = { player, sieteCount: 0, dosCount: 0, sieteTournaments: [], dosTournaments: [] }
      mapa.set(player.id, fila)
    }
    return fila
  }

  winners.forEach(winner => {
    const siete = filaDe(winner.siete)
    if (siete) {
      siete.sieteCount += 1
      siete.sieteTournaments.push(winner.tournamentNumber)
    }

    const dos = filaDe(winner.dos)
    if (dos) {
      dos.dosCount += 1
      dos.dosTournaments.push(winner.tournamentNumber)
    }
  })

  const all = Array.from(mapa.values())
    .map(fila => ({
      ...fila,
      total: fila.sieteCount + fila.dosCount,
    }))
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total
      if (b.dosCount !== a.dosCount) return b.dosCount - a.dosCount
      const nombreA = `${a.player?.firstName ?? ''} ${a.player?.lastName ?? ''}`
      const nombreB = `${b.player?.firstName ?? ''} ${b.player?.lastName ?? ''}`
      return nombreA.localeCompare(nombreB)
    })

  // El 7/2 de cada torneo, del mas reciente al mas viejo.
  const porTorneo = [...winners]
    .sort((a, b) => b.tournamentNumber - a.tournamentNumber)
    .map(w => ({
      tournamentNumber: w.tournamentNumber,
      siete: w.siete,
      dos: w.dos,
    }))

  // Solo lo que alguien lee. Esto devolvia ademas `top3`/`others` (el mismo
  // `all` partido en dos, que el cliente volvia a pegar), `totalJugadores` y
  // `totalPremios` —un recorrido de toda la tabla en cada request— y, por
  // jugador, un `tournamentNumbers` con los dos premios revueltos: el cliente
  // necesita saber cual es un 7 y cual un 2, asi que usa las dos listas
  // separadas y esa nunca servia para nada.
  return ok({
    all,
    porTorneo,
  })
})
