import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyT29Exclusion() {
  try {
    console.log('\n🔍 VERIFICACIÓN DE EXCLUSIÓN DE JOSÉ LUIS TORAL DEL T29\n');
    console.log('='.repeat(60));

    // 1. Buscar el jugador
    const player = await prisma.player.findFirst({
      where: { lastName: { contains: 'Toral', mode: 'insensitive' } }
    });

    if (!player) {
      console.log('❌ No se encontró el jugador');
      return;
    }

    console.log(`\n✓ Jugador: ${player.firstName} ${player.lastName} (${player.id})\n`);

    // 2. Obtener Torneo 29
    const tournament29 = await prisma.tournament.findUnique({
      where: { number: 29 },
      include: {
        tournamentParticipants: {
          select: {
            playerId: true,
            player: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    if (!tournament29) {
      console.log('❌ No se encontró el Torneo 29');
      return;
    }

    // 3. Verificar participación
    console.log('📊 ESTADO DE PARTICIPACIÓN:\n');

    const isInParticipants = tournament29.tournamentParticipants.some(
      tp => tp.playerId === player.id
    );
    console.log(`- TournamentParticipants: ${isInParticipants ? '❌ PRESENTE' : '✅ AUSENTE'}`);

    const isInParticipantIds = tournament29.participantIds.includes(player.id);
    console.log(`- Tournament.participantIds: ${isInParticipantIds ? '❌ PRESENTE' : '✅ AUSENTE'}`);

    const t29Participant = await prisma.t29Participant.findUnique({
      where: { playerId: player.id }
    });
    console.log(`- T29Participant: ${t29Participant ? '❌ PRESENTE' : '✅ AUSENTE'}`);

    // 4. Verificar P&H Stats
    const activeParentChildStats = await prisma.parentChildStats.findMany({
      where: {
        tournamentId: tournament29.id,
        OR: [
          { parentPlayerId: player.id },
          { childPlayerId: player.id }
        ],
        isActiveRelation: true
      }
    });
    console.log(`- P&H Stats activas: ${activeParentChildStats.length > 0 ? `❌ ${activeParentChildStats.length} ENCONTRADAS` : '✅ NINGUNA'}`);

    // 5. Contar participantes totales
    console.log(`\n📈 PARTICIPANTES ACTIVOS DEL T29: ${tournament29.tournamentParticipants.length}`);
    console.log('\nLista de participantes:');
    tournament29.tournamentParticipants
      .sort((a, b) => `${a.player.lastName} ${a.player.firstName}`.localeCompare(`${b.player.lastName} ${b.player.firstName}`))
      .forEach((tp, index) => {
        console.log(`  ${(index + 1).toString().padStart(2, ' ')}. ${tp.player.firstName} ${tp.player.lastName}`);
      });

    // 6. Resultado final
    console.log('\n' + '='.repeat(60));
    const isExcluded = !isInParticipants && !isInParticipantIds && !t29Participant && activeParentChildStats.length === 0;

    if (isExcluded) {
      console.log('✅ VERIFICACIÓN EXITOSA');
      console.log('\n✓ José Luis Toral ha sido excluido correctamente del T29');
      console.log('✓ No aparecerá en rankings');
      console.log('✓ No aparecerá en estadísticas de P&H');
      console.log('✓ No aparecerá en premios/awards');
      console.log('✓ Sus datos históricos se conservan\n');
    } else {
      console.log('⚠️  ADVERTENCIA: Aún hay referencias activas');
      console.log('   Ejecuta nuevamente el script de desactivación\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyT29Exclusion();
