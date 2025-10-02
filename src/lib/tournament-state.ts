import { prisma } from '@/lib/prisma'
import { getSocketServer } from './server-socket'

export async function finalizeTournamentIfCompleted(tournamentId: number) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      gameDates: {
        select: {
          status: true
        }
      }
    }
  })

  if (!tournament) return

  const allCompleted =
    tournament.gameDates.length > 0 &&
    tournament.gameDates.every(date => date.status === 'completed')

  if (allCompleted && tournament.status !== 'FINALIZADO') {
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: 'FINALIZADO',
        updatedAt: new Date()
      }
    })

    const io = getSocketServer()
    io?.emit('tournament-completed', { tournamentId })
    io?.emit('active-tournament-changed')
  }
}
