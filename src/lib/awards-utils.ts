import { prisma } from '@/lib/prisma'

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
    sieteYDos: { player: AwardPlayer; count: number }[]
    sinPodio: AwardPlayer[]
    faltas: { player: AwardPlayer; count: number }[]
    mesasFinales: { player: AwardPlayer; count: number }[]
    victorias: { player: AwardPlayer; count: number }[]
  }
}

/**
 * Calcula las 8 categorías de premiación de un torneo (Varón, Gay, Podios,
 * 7/2, Sin Podio, Faltas, Mesas Finales, Victorias). Única fuente de verdad —
 * usada tanto por /api/stats/awards/[tournamentId] como por el reporte XLSX,
 * para que ambos siempre coincidan exactamente.
 */
export async function computeTournamentAwards(tournamentIdNum: number): Promise<AwardsResponse | null> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentIdNum },
    select: {
      id: true,
      number: true,
      name: true,
      tournamentParticipants: {
        select: {
          playerId: true
        }
      }
    }
  })

  if (!tournament) {
    return null
  }

  const registeredPlayerIds = new Set(
    tournament.tournamentParticipants.map(tp => tp.playerId)
  )

  const gameDates = await prisma.gameDate.findMany({
    where: { tournamentId: tournamentIdNum },
    include: {
      eliminations: {
        include: {
          eliminatedPlayer: true,
          eliminatorPlayer: true
        }
      }
    }
  })

  const playerResults = new Map<string, {
    player: AwardPlayer & { role: string }
    dates: { dateNumber: number; points: number; rankByPoints: number }[]
  }>()

  const allFaltasIds = new Set<string>()
  gameDates.forEach(gd => {
    const eliminatedPlayerIds = new Set(gd.eliminations.map(e => e.eliminatedPlayerId))
    const faltasIds = gd.playerIds.filter(id => !eliminatedPlayerIds.has(id))
    faltasIds.forEach(id => allFaltasIds.add(id))
  })

  const faltaPlayersMap = new Map<string, AwardPlayer & { role: string }>()
  if (allFaltasIds.size > 0) {
    const faltaPlayers = await prisma.player.findMany({
      where: { id: { in: Array.from(allFaltasIds) } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        role: true
      }
    })
    faltaPlayers.forEach(player => {
      faltaPlayersMap.set(player.id, player)
    })
  }

  for (const gd of gameDates) {
    const rankedByPoints = [...gd.eliminations]
      .sort((a, b) => b.points - a.points)

    rankedByPoints.forEach((elim, index) => {
      const playerId = elim.eliminatedPlayer.id
      const rankByPoints = index + 1

      if (!playerResults.has(playerId)) {
        playerResults.set(playerId, {
          player: {
            id: elim.eliminatedPlayer.id,
            firstName: elim.eliminatedPlayer.firstName,
            lastName: elim.eliminatedPlayer.lastName,
            photoUrl: elim.eliminatedPlayer.photoUrl,
            role: elim.eliminatedPlayer.role
          },
          dates: []
        })
      }

      playerResults.get(playerId)!.dates.push({
        dateNumber: gd.dateNumber,
        points: elim.points,
        rankByPoints
      })
    })

    const eliminatedPlayerIds = new Set(gd.eliminations.map(e => e.eliminatedPlayerId))
    const faltasIds = gd.playerIds.filter(id => !eliminatedPlayerIds.has(id))

    faltasIds.forEach(faltaId => {
      const player = faltaPlayersMap.get(faltaId)
      if (!player) return

      if (!playerResults.has(faltaId)) {
        playerResults.set(faltaId, {
          player,
          dates: []
        })
      }

      playerResults.get(faltaId)!.dates.push({
        dateNumber: gd.dateNumber,
        points: 0,
        rankByPoints: gd.eliminations.length + 1
      })
    })
  }

  // Excluye position 1 (ganador) porque el ganador no elimina a nadie
  const allEliminations = gameDates.flatMap(gd => gd.eliminations)
    .filter(elim => elim.position !== 1)

  // 1. VARÓN - más eliminaciones (solo jugadores registrados)
  const eliminationsByEliminator = new Map<string, { player: AwardPlayer; count: number }>()

  allEliminations.forEach(elim => {
    if (!registeredPlayerIds.has(elim.eliminatorPlayer.id)) return

    const playerId = elim.eliminatorPlayer.id
    if (!eliminationsByEliminator.has(playerId)) {
      eliminationsByEliminator.set(playerId, {
        player: {
          id: elim.eliminatorPlayer.id,
          firstName: elim.eliminatorPlayer.firstName,
          lastName: elim.eliminatorPlayer.lastName,
          photoUrl: elim.eliminatorPlayer.photoUrl
        },
        count: 0
      })
    }
    eliminationsByEliminator.get(playerId)!.count++
  })

  const sortedByElims = Array.from(eliminationsByEliminator.values()).sort((a, b) => b.count - a.count)
  const maxElims = sortedByElims[0]?.count || 0
  const varon = sortedByElims
    .filter(p => p.count === maxElims && maxElims > 0)
    .map(p => ({ player: p.player, eliminations: p.count }))

  // 2. GAY - menos eliminaciones (solo jugadores registrados)
  const minElims = sortedByElims[sortedByElims.length - 1]?.count || 0
  const gay = sortedByElims
    .filter(p => p.count === minElims && minElims > 0)
    .map(p => ({ player: p.player, eliminations: p.count }))

  // 3. PODIOS - más top 3 (solo jugadores registrados)
  const podiosByPlayer = new Map<string, { player: AwardPlayer; count: number }>()

  playerResults.forEach((data, playerId) => {
    if (!registeredPlayerIds.has(playerId)) return

    const podiosCount = data.dates.filter(d => d.rankByPoints <= 3).length

    if (podiosCount > 0) {
      podiosByPlayer.set(playerId, {
        player: {
          id: data.player.id,
          firstName: data.player.firstName,
          lastName: data.player.lastName,
          photoUrl: data.player.photoUrl
        },
        count: podiosCount
      })
    }
  })

  const podios = Array.from(podiosByPlayer.values()).sort((a, b) => b.count - a.count)

  // 4. VICTORIAS - más 1eros lugares (solo jugadores registrados)
  const victoriasByPlayer = new Map<string, { player: AwardPlayer; count: number }>()

  playerResults.forEach((data, playerId) => {
    if (!registeredPlayerIds.has(playerId)) return

    const victoriasCount = data.dates.filter(d => d.rankByPoints === 1).length

    if (victoriasCount > 0) {
      victoriasByPlayer.set(playerId, {
        player: {
          id: data.player.id,
          firstName: data.player.firstName,
          lastName: data.player.lastName,
          photoUrl: data.player.photoUrl
        },
        count: victoriasCount
      })
    }
  })

  const victorias = Array.from(victoriasByPlayer.values())
    .filter(p => p.count > 1)
    .sort((a, b) => b.count - a.count)

  // 5. 7/2 - más veces primer eliminado (solo jugadores registrados)
  // position = totalPlayers significa primero eliminado = última posición
  const sieteYDosByPlayer = new Map<string, { player: AwardPlayer; count: number }>()

  gameDates.forEach(gd => {
    if (gd.eliminations.length === 0) return

    const totalPlayers = gd.playerIds.length
    const lastPosition = totalPlayers

    const lastPlaceElims = gd.eliminations.filter(
      elim => elim.position === lastPosition
    )

    lastPlaceElims.forEach(elim => {
      if (!registeredPlayerIds.has(elim.eliminatedPlayer.id)) return

      const playerId = elim.eliminatedPlayer.id
      if (!sieteYDosByPlayer.has(playerId)) {
        sieteYDosByPlayer.set(playerId, {
          player: {
            id: elim.eliminatedPlayer.id,
            firstName: elim.eliminatedPlayer.firstName,
            lastName: elim.eliminatedPlayer.lastName,
            photoUrl: elim.eliminatedPlayer.photoUrl
          },
          count: 0
        })
      }
      sieteYDosByPlayer.get(playerId)!.count++
    })
  })

  const sieteYDos = Array.from(sieteYDosByPlayer.values()).sort((a, b) => b.count - a.count)

  // 6. MESAS FINALES - más top 9 (solo jugadores registrados)
  const mesasFinalesByPlayer = new Map<string, { player: AwardPlayer; count: number }>()

  playerResults.forEach((data, playerId) => {
    if (!registeredPlayerIds.has(playerId)) return

    const mesasFinalesCount = data.dates.filter(d => d.rankByPoints <= 9).length

    if (mesasFinalesCount > 0) {
      mesasFinalesByPlayer.set(playerId, {
        player: {
          id: data.player.id,
          firstName: data.player.firstName,
          lastName: data.player.lastName,
          photoUrl: data.player.photoUrl
        },
        count: mesasFinalesCount
      })
    }
  })

  const mesasFinales = Array.from(mesasFinalesByPlayer.values()).sort((a, b) => b.count - a.count)

  // 7. SIN PODIO - nunca en el top 3 (solo jugadores registrados)
  const sinPodioPlayers: AwardPlayer[] = []

  playerResults.forEach((data, playerId) => {
    if (!registeredPlayerIds.has(playerId)) return

    const hasPodio = data.dates.some(d => d.rankByPoints <= 3)

    if (!hasPodio && data.dates.length > 0) {
      sinPodioPlayers.push({
        id: data.player.id,
        firstName: data.player.firstName,
        lastName: data.player.lastName,
        photoUrl: data.player.photoUrl
      })
    }
  })

  // 8. FALTAS - más ausencias (solo jugadores registrados)
  const faltasByPlayer = new Map<string, { player: AwardPlayer; count: number }>()

  const registeredParticipants = await prisma.tournamentParticipant.findMany({
    where: { tournamentId: tournamentIdNum },
    include: {
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          photoUrl: true
        }
      }
    }
  })

  const completedGameDates = gameDates.filter(gd => gd.status === 'completed')

  for (const tp of registeredParticipants) {
    const player = tp.player
    const playerId = player.id

    const playerDates = playerResults.get(playerId)?.dates || []
    const faltasCount = playerDates.filter(d => d.points === 0).length

    const datesIncluded = new Set(playerDates.map(d => d.dateNumber))
    const datesNotIncluded = completedGameDates.filter(gd => !datesIncluded.has(gd.dateNumber))
    const totalFaltas = faltasCount + datesNotIncluded.length

    if (totalFaltas > 0) {
      faltasByPlayer.set(playerId, {
        player: {
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          photoUrl: player.photoUrl
        },
        count: totalFaltas
      })
    }
  }

  const faltas = Array.from(faltasByPlayer.values()).sort((a, b) => b.count - a.count)

  return {
    tournament: {
      id: tournament.id,
      number: tournament.number,
      name: tournament.name
    },
    awards: {
      varon,
      gay,
      podios,
      sieteYDos,
      sinPodio: sinPodioPlayers,
      faltas,
      mesasFinales,
      victorias
    }
  }
}
