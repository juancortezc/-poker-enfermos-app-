import { NextRequest } from 'next/server'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { PLAYER_PUBLIC_SELECT } from '@/lib/player-select'
import { AppError, withErrorHandler } from '@/lib/errors'
import { ok, parseParams } from '@/lib/http'
import { gameDateIdParamsSchema, nightSieteDos } from '@poker/shared'

export const GET = withErrorHandler(async (
  _request: NextRequest,
  context: { params: Promise<{ gameDateId: string }> }
) => {
  const { gameDateId: gameDateIdNum } = parseParams(await context.params, gameDateIdParamsSchema)

  // Get game date info
  const gameDate = await prisma.gameDate.findUnique({
    where: { id: gameDateIdNum },
    include: {
      tournament: true,
      eliminations: {
        include: {
          eliminatedPlayer: { select: PLAYER_PUBLIC_SELECT },
          eliminatorPlayer: { select: PLAYER_PUBLIC_SELECT }
        },
        orderBy: { position: 'asc' }
      }
    }
  })

  if (!gameDate) {
    throw AppError.notFound('Fecha no encontrada')
  }

  // 1. Varón de la Noche (most eliminations)
  // Exclude position 1 (winner) since the winner doesn't eliminate anyone
  const eliminationCounts = new Map<string, number>()
  gameDate.eliminations
    .filter((elim) => elim.position !== 1) // Winner doesn't count as an elimination
    .forEach((elim) => {
      const count = eliminationCounts.get(elim.eliminatorPlayerId) || 0
      eliminationCounts.set(elim.eliminatorPlayerId, count + 1)
    })

  const maxEliminations = Math.max(...Array.from(eliminationCounts.values()), 0)
  const varonPlayerIds = Array.from(eliminationCounts.entries())
    .filter(([_, count]) => count === maxEliminations)
    .map(([playerId]) => playerId)

  const varonPlayers = await prisma.player.findMany({
    select: PLAYER_PUBLIC_SELECT,
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
    select: PLAYER_PUBLIC_SELECT,
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
    select: PLAYER_PUBLIC_SELECT,
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
    select: PLAYER_PUBLIC_SELECT,
    where: { id: { in: mesaFinalPlayerIds } }
  })

  const mesaFinal = mesaFinalEliminations.map(e =>
    mesaFinalPlayers.find(p => p.id === e.eliminatedPlayerId)!
  )

  // 4. 7/2 de la noche: los dos primeros en salir, el 2 (primero) y luego el 7.
  // Misma regla que el reporte y los premios (@poker/shared).
  const { dos, siete } = nightSieteDos(gameDate.eliminations)
  const lastTwoPositions = [dos, siete].filter((e): e is NonNullable<typeof e> => e !== null)

  const sieteYDosPlayerIds = lastTwoPositions.map(e => e.eliminatedPlayerId)
  const sieteYDosPlayers = await prisma.player.findMany({
    select: PLAYER_PUBLIC_SELECT,
    where: { id: { in: sieteYDosPlayerIds } }
  })

  const sieteYDos = lastTwoPositions.map(e =>
    sieteYDosPlayers.find(p => p.id === e.eliminatedPlayerId)!
  )

  // 5. Faltas (absent players from Comision and Enfermo roles)
  const allEnfermosComision = await prisma.player.findMany({
    select: PLAYER_PUBLIC_SELECT,
    where: {
      isActive: true,
      role: { in: [UserRole.Comision, UserRole.Enfermo] }
    }
  })

  const presentPlayerIds = new Set(gameDate.playerIds)
  const faltas = allEnfermosComision.filter(p => !presentPlayerIds.has(p.id))

  return ok({
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
})
