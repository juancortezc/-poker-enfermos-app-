import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const danielVelaId = 'cmfbl1agu000tp8dbbyqfrghw'
  const t29Id = 2

  console.log('🔍 Verificando estado de Daniel Vela en T29...\n')

  // Check current status
  const t29Participant = await prisma.t29Participant.findUnique({
    where: { playerId: danielVelaId },
  })

  const tournamentParticipant = await prisma.tournamentParticipant.findFirst({
    where: {
      tournamentId: t29Id,
      playerId: danielVelaId,
    },
  })

  console.log('Estado actual:')
  console.log('- En t29_participants:', t29Participant ? '✅ SÍ' : '❌ NO')
  console.log('- En tournament_participants:', tournamentParticipant ? '✅ SÍ' : '❌ NO')

  // Check for eliminations
  const eliminations = await prisma.elimination.findMany({
    where: {
      gameDate: {
        tournamentId: t29Id,
      },
      OR: [
        { eliminatedPlayerId: danielVelaId },
        { eliminatorPlayerId: danielVelaId },
      ],
    },
  })

  console.log('- Eliminaciones registradas:', eliminations.length)

  if (eliminations.length > 0) {
    console.log('\n⚠️  ADVERTENCIA: Daniel Vela tiene eliminaciones registradas:')
    eliminations.forEach((e) => {
      console.log(`   - Fecha ${e.gameDateId}: Posición ${e.position}`)
    })
    console.log('\n❌ No se puede remover automáticamente. Se deben eliminar las eliminaciones primero.')
    return
  }

  // Check tournament ranking
  const ranking = await prisma.tournamentRanking.findFirst({
    where: {
      tournamentId: t29Id,
      playerId: danielVelaId,
    },
  })

  console.log('- En tournament_rankings:', ranking ? '✅ SÍ' : '❌ NO')

  console.log('\n🗑️  Removiendo a Daniel Vela del T29...\n')

  // Remove from t29_participants
  if (t29Participant) {
    await prisma.t29Participant.delete({
      where: { playerId: danielVelaId },
    })
    console.log('✅ Removido de t29_participants')
  }

  // Remove from tournament_participants
  if (tournamentParticipant) {
    await prisma.tournamentParticipant.delete({
      where: { id: tournamentParticipant.id },
    })
    console.log('✅ Removido de tournament_participants')
  }

  // Remove from tournament_rankings
  if (ranking) {
    await prisma.tournamentRanking.delete({
      where: { id: ranking.id },
    })
    console.log('✅ Removido de tournament_rankings')
  }

  console.log('\n✅ Daniel Vela ha sido removido exitosamente del Torneo 29')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
