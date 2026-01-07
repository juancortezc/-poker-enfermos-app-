import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deactivatePlayerFromT29() {
  const playerName = 'Jose Luis Toral';

  try {
    console.log(`\n🔍 Buscando a ${playerName}...\n`);

    // 1. Encontrar el jugador
    const player = await prisma.player.findFirst({
      where: {
        lastName: { contains: 'Toral', mode: 'insensitive' }
      }
    });

    if (!player) {
      console.log('❌ No se encontró el jugador');
      return;
    }

    console.log(`✓ Jugador encontrado: ${player.firstName} ${player.lastName} (ID: ${player.id})`);

    // 2. Encontrar el torneo 29
    const tournament29 = await prisma.tournament.findUnique({
      where: { number: 29 }
    });

    if (!tournament29) {
      console.log('❌ No se encontró el Torneo 29');
      return;
    }

    console.log(`✓ Torneo 29 encontrado (ID: ${tournament29.id})\n`);

    // 3. Verificar datos actuales
    const t29Participant = await prisma.t29Participant.findUnique({
      where: { playerId: player.id }
    });

    const tournamentParticipant = await prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_playerId: {
          tournamentId: tournament29.id,
          playerId: player.id
        }
      }
    });

    const parentChildAsParent = await prisma.parentChildStats.findMany({
      where: {
        tournamentId: tournament29.id,
        parentPlayerId: player.id
      },
      include: { childPlayer: true }
    });

    const parentChildAsChild = await prisma.parentChildStats.findMany({
      where: {
        tournamentId: tournament29.id,
        childPlayerId: player.id
      },
      include: { parentPlayer: true }
    });

    const isInTournamentParticipantIds = tournament29.participantIds.includes(player.id);

    console.log('📊 ESTADO ACTUAL:\n');
    console.log(`- T29 Participant: ${t29Participant ? '✓ SÍ' : '✗ NO'}`);
    console.log(`- Tournament Participant: ${tournamentParticipant ? '✓ SÍ' : '✗ NO'}`);
    console.log(`- En Tournament.participantIds: ${isInTournamentParticipantIds ? '✓ SÍ' : '✗ NO'}`);
    console.log(`- P&H Stats (como parent): ${parentChildAsParent.length} registros`);
    if (parentChildAsParent.length > 0) {
      parentChildAsParent.forEach(pc => {
        console.log(`  - ${pc.childPlayer.firstName} ${pc.childPlayer.lastName}: ${pc.eliminationCount} elims (activa: ${pc.isActiveRelation})`);
      });
    }
    console.log(`- P&H Stats (como child): ${parentChildAsChild.length} registros`);
    if (parentChildAsChild.length > 0) {
      parentChildAsChild.forEach(pc => {
        console.log(`  - ${pc.parentPlayer.firstName} ${pc.parentPlayer.lastName}: ${pc.eliminationCount} elims (activa: ${pc.isActiveRelation})`);
      });
    }

    console.log(`\n${'='.repeat(60)}\n`);
    console.log('⚠️  DESACTIVANDO PARTICIPACIÓN EN T29...\n');

    // DESACTIVACIÓN (sin eliminar datos históricos)
    await prisma.$transaction(async (tx) => {
      let changesCount = 0;

      // 1. Eliminar T29Participant (tabla específica del T29 para participantes activos)
      if (t29Participant) {
        await tx.t29Participant.delete({
          where: { id: t29Participant.id }
        });
        console.log('✓ Removido de T29Participant');
        changesCount++;
      }

      // 2. Eliminar TournamentParticipant (indica participación activa)
      if (tournamentParticipant) {
        await tx.tournamentParticipant.delete({
          where: { id: tournamentParticipant.id }
        });
        console.log('✓ Removido de TournamentParticipant');
        changesCount++;
      }

      // 3. Marcar P&H Stats como INACTIVAS (conservar datos históricos)
      if (parentChildAsParent.length > 0) {
        await tx.parentChildStats.updateMany({
          where: {
            tournamentId: tournament29.id,
            parentPlayerId: player.id
          },
          data: { isActiveRelation: false }
        });
        console.log(`✓ ${parentChildAsParent.length} relaciones P&H marcadas como inactivas (como parent)`);
        changesCount += parentChildAsParent.length;
      }

      if (parentChildAsChild.length > 0) {
        await tx.parentChildStats.updateMany({
          where: {
            tournamentId: tournament29.id,
            childPlayerId: player.id
          },
          data: { isActiveRelation: false }
        });
        console.log(`✓ ${parentChildAsChild.length} relaciones P&H marcadas como inactivas (como child)`);
        changesCount += parentChildAsChild.length;
      }

      // 4. Remover de Tournament.participantIds (lista de participantes activos)
      if (isInTournamentParticipantIds) {
        const updatedParticipantIds = tournament29.participantIds.filter(id => id !== player.id);
        await tx.tournament.update({
          where: { id: tournament29.id },
          data: { participantIds: updatedParticipantIds }
        });
        console.log('✓ Removido de Tournament.participantIds');
        changesCount++;
      }

      console.log(`\n✅ TOTAL: ${changesCount} cambios realizados`);
    });

    console.log(`\n${'='.repeat(60)}`);
    console.log('🎉 Desactivación completada exitosamente\n');
    console.log('📋 RESUMEN:');
    console.log(`- ${player.firstName} ${player.lastName} YA NO participa en el Torneo 29`);
    console.log('- Sus datos históricos se CONSERVAN (GameResults, Eliminations, etc.)');
    console.log('- NO aparecerá en rankings ni estadísticas activas del T29');
    console.log('- Sus relaciones P&H están marcadas como INACTIVAS');
    console.log('\n💡 Los rankings y estadísticas se recalcularán automáticamente');
    console.log('   al excluir su playerId de Tournament.participantIds\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deactivatePlayerFromT29();
