import { withTournamentPhotos } from '@poker/shared'
import { prisma } from './prisma'

/**
 * Respuesta de un torneo con las fotos de ese torneo, buscando su numero por
 * id. Para las rutas que solo tienen el id; si ya tienes el numero, usa
 * withTournamentPhotos de @poker/shared directamente.
 */
export async function withPhotosOfTournament<T>(data: T, tournamentId: number): Promise<T> {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId }, select: { number: true } })
  return withTournamentPhotos(data, tournament?.number)
}
