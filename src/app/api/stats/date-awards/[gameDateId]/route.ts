import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ gameDateId: string }> }
) {
  try {
    const { gameDateId } = await context.params
    const gameDateIdNum = parseInt(gameDateId, 10)

    if (isNaN(gameDateIdNum)) {
      return NextResponse.json(
        { error: 'Invalid game date ID' },
        { status: 400 }
      )
    }

    // Get game date info
    const gameDate = await prisma.gameDate.findUnique({
      where: { id: gameDateIdNum },
      include: {
        tournament: true,
        eliminations: {
          include: {
            eliminatedPlayer: true,
            eliminatorPlayer: true
          },
          orderBy: { position: 'asc' }
        }
      }
    })

    if (!gameDate) {
      return NextResponse.json(
        { error: 'Game date not found' },
        { status: 404 }
      )
    }

    const totalParticipants = gameDate.playerIds.length

    // 1. Varón de la Noche (most eliminations)
    const eliminationCounts = new Map<string, number>()
    gameDate.eliminations.forEach((elim) => {
      const count = eliminationCounts.get(elim.eliminatorPlayerId) || 0
      eliminationCounts.set(elim.eliminatorPlayerId, count + 1)
    })

    const maxEliminations = Math.max(...Array.from(eliminationCounts.values()), 0)
    const varonPlayerIds = Array.from(eliminationCounts.entries())
      .filter(([_, count]) => count === maxEliminations)
      .map(([playerId]) => playerId)

    const varonPlayers = await prisma.player.findMany({
      where: { id: { in: varonPlayerIds } }
    })

    const varon = varonPlayers.map(player => ({
      player,
      eliminations: maxEliminations
    }))

    // 1b. Gay de la Noche (least eliminations, excluding 0)
    const eliminationCountsArray = Array.from(eliminationCounts.entries())
      .filter(([_, count]) => count > 0)

    const minEliminations = eliminationCountsArray.length > 0
      ? Math.min(...eliminationCountsArray.map(([_, count]) => count))
      : 0

    const gayPlayerIds = eliminationCountsArray
      .filter(([_, count]) => count === minEliminations)
      .map(([playerId]) => playerId)

    const gayPlayers = await prisma.player.findMany({
      where: { id: { in: gayPlayerIds } }
    })

    const gay = gayPlayers.map(player => ({
      player,
      eliminations: minEliminations
    }))

    // 2. Podio (top 3)
    const podioEliminations = gameDate.eliminations
      .filter(e => e.position >= 1 && e.position <= 3)
      .sort((a, b) => a.position - b.position)

    const podioPlayerIds = podioEliminations.map(e => e.eliminatedPlayerId)
    const podioPlayers = await prisma.player.findMany({
      where: { id: { in: podioPlayerIds } }
    })

    // Sort podioPlayers according to position
    const podio = podioEliminations.map(e =>
      podioPlayers.find(p => p.id === e.eliminatedPlayerId)!
    )

    // 3. Mesa Final (positions 1-9)
    const mesaFinalEliminations = gameDate.eliminations
      .filter(e => e.position >= 1 && e.position <= 9)
      .sort((a, b) => a.position - b.position)

    const mesaFinalPlayerIds = mesaFinalEliminations.map(e => e.eliminatedPlayerId)
    const mesaFinalPlayers = await prisma.player.findMany({
      where: { id: { in: mesaFinalPlayerIds } }
    })

    const mesaFinal = mesaFinalEliminations.map(e =>
      mesaFinalPlayers.find(p => p.id === e.eliminatedPlayerId)!
    )

    // 4. 7/2 (first 2 eliminated)
    const lastTwoPositions = gameDate.eliminations
      .filter(e => e.position >= totalParticipants - 1)
      .sort((a, b) => b.position - a.position)

    const sieteYDosPlayerIds = lastTwoPositions.map(e => e.eliminatedPlayerId)
    const sieteYDosPlayers = await prisma.player.findMany({
      where: { id: { in: sieteYDosPlayerIds } }
    })

    const sieteYDos = lastTwoPositions.map(e =>
      sieteYDosPlayers.find(p => p.id === e.eliminatedPlayerId)!
    )

    // 5. Faltas (absent players from Comision and Enfermo roles)
    const allEnfermosComision = await prisma.player.findMany({
      where: {
        isActive: true,
        role: { in: [UserRole.Comision, UserRole.Enfermo] }
      }
    })

    const presentPlayerIds = new Set(gameDate.playerIds)
    const faltas = allEnfermosComision.filter(p => !presentPlayerIds.has(p.id))

    return NextResponse.json({
      gameDate: {
        id: gameDate.id,
        dateNumber: gameDate.dateNumber,
        scheduledDate: gameDate.scheduledDate,
        status: gameDate.status
      },
      awards: {
        varon,
        gay,
        podio,
        mesaFinal,
        sieteYDos,
        faltas
      }
    })
  } catch (error) {
    console.error('Error fetching date awards:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
