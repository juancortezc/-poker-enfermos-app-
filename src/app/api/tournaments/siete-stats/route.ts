import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTournamentWinnersWithFallback } from '@/lib/tournament-winners'

/**
 * GET /api/tournaments/siete-stats
 *
 * El 7/2 historico: el espejo de /api/tournaments/champions-stats, pero del
 * otro lado de la tabla. Se lee del mismo registro (TournamentWinners), asi que
 * no hay una segunda fuente de verdad.
 *
 * EL TOTAL SON LOS DOS PREMIOS, NO UNO
 *
 * Cada torneo reparte un 7 y un 2, y son columnas distintas de la tabla
 * (`sieteId` y `dosId`). La primera version de este endpoint contaba solo los
 * sietes, asi que la mitad de los datos no aparecia: Juan Antonio C. figuraba
 * primero con 5 cuando en realidad hay un triple empate en 6. El total es
 * sietes + dos.
 *
 * El desempate es por cantidad de sietes, y despues alfabetico para que el
 * orden nunca quede indefinido. Por eso la respuesta trae `sieteCount` y
 * `dosCount` por separado: si el desempate usa un dato, tiene que poder verse.
 */
export async function GET() {
  try {
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
        if (b.sieteCount !== a.sieteCount) return b.sieteCount - a.sieteCount
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
    return NextResponse.json({
      success: true,
      data: {
        all,
        porTorneo,
      },
    })
  } catch (error) {
    console.error('Error fetching siete stats:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching siete stats' },
      { status: 500 }
    )
  }
}
