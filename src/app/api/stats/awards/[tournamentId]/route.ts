import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface AwardPlayer {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string | null
}

interface AwardsResponse {
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  try {
    const { tournamentId } = await params
    const tournamentIdNum = parseInt(tournamentId)

    // Get tournament info with registered participants
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
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      )
    }

    // Create set of registered player IDs for filtering
    const registeredPlayerIds = new Set(
      tournament.tournamentParticipants.map(tp => tp.playerId)
    )

    // Get all game dates with eliminations
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

    // Build player results structure
    // Map: playerId -> { player, dates: [{ dateNumber, points, rankByPoints }] }
    const playerResults = new Map<string, {
      player: AwardPlayer & { role: string }
      dates: { dateNumber: number; points: number; rankByPoints: number }[]
    }>()

    // Process each game date
    for (const gd of gameDates) {
      // Rank players by points (DESC) to get true final positions
      const rankedByPoints = [...gd.eliminations]
        .sort((a, b) => b.points - a.points)

      rankedByPoints.forEach((elim, index) => {
        const playerId = elim.eliminatedPlayer.id
        const rankByPoints = index + 1 // 1 = ganador (más puntos)

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

      // Handle players with 0 points (faltas - registered but didn't play)
      const eliminatedPlayerIds = new Set(gd.eliminations.map(e => e.eliminatedPlayerId))
      const faltasIds = gd.playerIds.filter(id => !eliminatedPlayerIds.has(id))

      if (faltasIds.length > 0) {
        const faltaPlayers = await prisma.player.findMany({
          where: { id: { in: faltasIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
            role: true
          }
        })

        faltaPlayers.forEach(player => {
          if (!playerResults.has(player.id)) {
            playerResults.set(player.id, {
              player,
              dates: []
            })
          }

          playerResults.get(player.id)!.dates.push({
            dateNumber: gd.dateNumber,
            points: 0,
            rankByPoints: gd.eliminations.length + 1 // Last position
          })
        })
      }
    }

    // Get all eliminations for Varón/Gay calculation
    const allEliminations = gameDates.flatMap(gd => gd.eliminations)

    // ============================================================
    // 1. VARÓN - Most eliminations (only registered players)
    // ============================================================
    const eliminationsByEliminator = new Map<string, { player: AwardPlayer; count: number }>()

    allEliminations.forEach(elim => {
      // Only count registered players
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

    // ============================================================
    // 2. GAY - Least eliminations (only registered players)
    // ============================================================
    const minElims = sortedByElims[sortedByElims.length - 1]?.count || 0
    const gay = sortedByElims
      .filter(p => p.count === minElims && minElims > 0)
      .map(p => ({ player: p.player, eliminations: p.count }))

    // ============================================================
    // 3. PODIOS - Most top 3 finishes (only registered players)
    // ============================================================
    const podiosByPlayer = new Map<string, { player: AwardPlayer; count: number }>()

    playerResults.forEach((data, playerId) => {
      // Only count registered players
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

    // ============================================================
    // 4. VICTORIAS - Most 1st place finishes (only registered players)
    // ============================================================
    const victoriasByPlayer = new Map<string, { player: AwardPlayer; count: number }>()

    playerResults.forEach((data, playerId) => {
      // Only count registered players
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
      .filter(p => p.count > 1) // Only show players with more than 1 victory
      .sort((a, b) => b.count - a.count)

    // ============================================================
    // 5. ÚLTIMOS - Most last place finishes (only registered players)
    // ============================================================
    const sieteYDosByPlayer = new Map<string, { player: AwardPlayer; count: number }>()

    // For each date, find only the last position (7º place)
    gameDates.forEach(gd => {
      if (gd.eliminations.length === 0) return

      const totalPlayers = gd.eliminations.length
      const lastPosition = totalPlayers // Último lugar (7º)

      // Find player(s) in last position
      const lastPlaceElims = gd.eliminations.filter(
        elim => elim.position === lastPosition
      )

      lastPlaceElims.forEach(elim => {
        // Only count registered players
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

    // ============================================================
    // 6. MESAS FINALES - Most top 9 finishes (only registered players)
    // ============================================================
    const mesasFinalesByPlayer = new Map<string, { player: AwardPlayer; count: number }>()

    playerResults.forEach((data, playerId) => {
      // Only count registered players
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

    // ============================================================
    // 7. SIN PODIO - Never in top 3 (only registered players)
    // ============================================================
    const sinPodioPlayers: AwardPlayer[] = []

    playerResults.forEach((data, playerId) => {
      // Only count registered players
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

    // ============================================================
    // 8. FALTAS - Most absences (only registered players)
    // FALTA = jugador registrado que NO jugó una fecha (sin eliminación)
    // ============================================================
    const faltasByPlayer = new Map<string, { player: AwardPlayer; count: number }>()

    // Get all registered participants
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

    // For each registered player, count how many dates they missed
    for (const tp of registeredParticipants) {
      const player = tp.player
      const playerId = player.id

      // Get which dates this player participated in (has elimination)
      const datesPlayed = new Set(
        playerResults.get(playerId)?.dates.map(d => d.dateNumber) || []
      )

      // Count faltas (dates NOT played)
      const faltasCount = gameDates.length - datesPlayed.size

      if (faltasCount > 0) {
        faltasByPlayer.set(playerId, {
          player: {
            id: player.id,
            firstName: player.firstName,
            lastName: player.lastName,
            photoUrl: player.photoUrl
          },
          count: faltasCount
        })
      }
    }

    const faltas = Array.from(faltasByPlayer.values()).sort((a, b) => b.count - a.count)

    // ============================================================
    // Build response
    // ============================================================
    const response: AwardsResponse = {
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

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching awards:', error)
    return NextResponse.json(
      { error: 'Failed to fetch awards' },
      { status: 500 }
    )
  }
}
