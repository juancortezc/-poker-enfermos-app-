import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removePlayerFromT29() {
  const playerName = 'José Luis Toral';

  try {
    console.log(`\n🔍 Buscando datos de ${playerName} en Torneo 29...\n`);

    // 1. Encontrar el jugador
    const player = await prisma.player.findFirst({
      where: {
        lastName: { contains: 'Toral', mode: 'insensitive' }
      }
    });

    if (!player) {
      console.log('❌ No se encontró el jugador José Luis Toral');
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

    // 3. Verificar participación en T29Participant
    const t29Participant = await prisma.t29Participant.findUnique({
      where: { playerId: player.id }
    });

    console.log('📊 DATOS ENCONTRADOS:\n');
    console.log(`- T29 Participant: ${t29Participant ? '✓ SÍ' : '✗ NO'}`);

    // 4. Verificar participación en TournamentParticipant
    const tournamentParticipant = await prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_playerId: {
          tournamentId: tournament29.id,
          playerId: player.id
        }
      }
    });

    console.log(`- Tournament Participant: ${tournamentParticipant ? '✓ SÍ' : '✗ NO'}`);

    // 5. Verificar en GameDates del T29
    const gameDates = await prisma.gameDate.findMany({
      where: {
        tournamentId: tournament29.id,
        playerIds: { has: player.id }
      }
    });

    console.log(`- GameDates participadas: ${gameDates.length}`);
    if (gameDates.length > 0) {
      gameDates.forEach(gd => {
        console.log(`  - Fecha ${gd.dateNumber}: ${gd.scheduledDate.toLocaleDateString()}`);
      });
    }

    // 6. Verificar GameResults
    const gameResults = await prisma.gameResult.findMany({
      where: {
        playerId: player.id,
        gameDate: { tournamentId: tournament29.id }
      },
      include: { gameDate: true }
    });

    console.log(`- Game Results: ${gameResults.length}`);
    if (gameResults.length > 0) {
      gameResults.forEach(gr => {
        console.log(`  - Fecha ${gr.gameDate.dateNumber}: ${gr.points} puntos`);
      });
    }

    // 7. Verificar Eliminaciones
    const eliminationsAsEliminated = await prisma.elimination.findMany({
      where: {
        eliminatedPlayerId: player.id,
        gameDate: { tournamentId: tournament29.id }
      },
      include: { gameDate: true }
    });

    const eliminationsAsEliminator = await prisma.elimination.findMany({
      where: {
        eliminatorPlayerId: player.id,
        gameDate: { tournamentId: tournament29.id }
      },
      include: { gameDate: true }
    });

    console.log(`- Eliminaciones (como eliminado): ${eliminationsAsEliminated.length}`);
    console.log(`- Eliminaciones (como eliminador): ${eliminationsAsEliminator.length}`);

    // 8. Verificar TournamentRankings
    const rankings = await prisma.tournamentRanking.findMany({
      where: {
        tournamentId: tournament29.id,
        playerId: player.id
      }
    });

    console.log(`- Tournament Rankings: ${rankings.length}`);

    // 9. Verificar ParentChildStats
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

    console.log(`- P&H Stats (como parent): ${parentChildAsParent.length}`);
    if (parentChildAsParent.length > 0) {
      parentChildAsParent.forEach(pc => {
        console.log(`  - Hijo: ${pc.childPlayer.firstName} ${pc.childPlayer.lastName} (${pc.eliminationCount} eliminaciones)`);
      });
    }

    console.log(`- P&H Stats (como child): ${parentChildAsChild.length}`);
    if (parentChildAsChild.length > 0) {
      parentChildAsChild.forEach(pc => {
        console.log(`  - Padre: ${pc.parentPlayer.firstName} ${pc.parentPlayer.lastName} (${pc.eliminationCount} eliminaciones)`);
      });
    }

    // 10. Verificar si está en participantIds del torneo
    const isInTournamentParticipantIds = tournament29.participantIds.includes(player.id);
    console.log(`- En Tournament.participantIds: ${isInTournamentParticipantIds ? '✓ SÍ' : '✗ NO'}`);

    // 11. Verificar Propuestas V2
    const proposalsCreated = await prisma.proposalV2.count({
      where: { createdById: player.id }
    });

    const proposalVotes = await prisma.proposalV2Vote.count({
      where: { playerId: player.id }
    });

    const proposalComments = await prisma.proposalV2Comment.count({
      where: { playerId: player.id }
    });

    console.log(`- Propuestas creadas: ${proposalsCreated}`);
    console.log(`- Votos en propuestas: ${proposalVotes}`);
    console.log(`- Comentarios en propuestas: ${proposalComments}`);

    // Resumen
    const hasAnyData = t29Participant || tournamentParticipant || gameDates.length > 0 ||
                       gameResults.length > 0 || eliminationsAsEliminated.length > 0 ||
                       eliminationsAsEliminator.length > 0 || rankings.length > 0 ||
                       parentChildAsParent.length > 0 || parentChildAsChild.length > 0 ||
                       isInTournamentParticipantIds;

    console.log(`\n${'='.repeat(60)}\n`);

    if (!hasAnyData) {
      console.log('✓ El jugador NO tiene datos en el Torneo 29');
      return;
    }

    console.log('⚠️  COMENZANDO LIMPIEZA DE DATOS...\n');

    // ELIMINACIÓN EN CASCADA
    await prisma.$transaction(async (tx) => {
      let deletedCount = 0;

      // 1. Eliminar T29Participant
      if (t29Participant) {
        await tx.t29Participant.delete({
          where: { id: t29Participant.id }
        });
        console.log('✓ T29Participant eliminado');
        deletedCount++;
      }

      // 2. Eliminar TournamentParticipant
      if (tournamentParticipant) {
        await tx.tournamentParticipant.delete({
          where: { id: tournamentParticipant.id }
        });
        console.log('✓ TournamentParticipant eliminado');
        deletedCount++;
      }

      // 3. Eliminar ParentChildStats (como parent)
      if (parentChildAsParent.length > 0) {
        await tx.parentChildStats.deleteMany({
          where: {
            tournamentId: tournament29.id,
            parentPlayerId: player.id
          }
        });
        console.log(`✓ ${parentChildAsParent.length} ParentChildStats eliminados (como parent)`);
        deletedCount += parentChildAsParent.length;
      }

      // 4. Eliminar ParentChildStats (como child)
      if (parentChildAsChild.length > 0) {
        await tx.parentChildStats.deleteMany({
          where: {
            tournamentId: tournament29.id,
            childPlayerId: player.id
          }
        });
        console.log(`✓ ${parentChildAsChild.length} ParentChildStats eliminados (como child)`);
        deletedCount += parentChildAsChild.length;
      }

      // 5. Eliminar TournamentRankings
      if (rankings.length > 0) {
        await tx.tournamentRanking.deleteMany({
          where: {
            tournamentId: tournament29.id,
            playerId: player.id
          }
        });
        console.log(`✓ ${rankings.length} TournamentRankings eliminados`);
        deletedCount += rankings.length;
      }

      // 6. Eliminar Eliminaciones (como eliminado)
      if (eliminationsAsEliminated.length > 0) {
        await tx.elimination.deleteMany({
          where: {
            eliminatedPlayerId: player.id,
            gameDate: { tournamentId: tournament29.id }
          }
        });
        console.log(`✓ ${eliminationsAsEliminated.length} Eliminaciones eliminadas (como eliminado)`);
        deletedCount += eliminationsAsEliminated.length;
      }

      // 7. Eliminar Eliminaciones (como eliminador)
      if (eliminationsAsEliminator.length > 0) {
        await tx.elimination.deleteMany({
          where: {
            eliminatorPlayerId: player.id,
            gameDate: { tournamentId: tournament29.id }
          }
        });
        console.log(`✓ ${eliminationsAsEliminator.length} Eliminaciones eliminadas (como eliminador)`);
        deletedCount += eliminationsAsEliminator.length;
      }

      // 8. Eliminar GameResults
      if (gameResults.length > 0) {
        await tx.gameResult.deleteMany({
          where: {
            playerId: player.id,
            gameDate: { tournamentId: tournament29.id }
          }
        });
        console.log(`✓ ${gameResults.length} GameResults eliminados`);
        deletedCount += gameResults.length;
      }

      // 9. Remover de playerIds en GameDates
      if (gameDates.length > 0) {
        for (const gameDate of gameDates) {
          const updatedPlayerIds = gameDate.playerIds.filter(id => id !== player.id);
          await tx.gameDate.update({
            where: { id: gameDate.id },
            data: { playerIds: updatedPlayerIds }
          });
        }
        console.log(`✓ Removido de ${gameDates.length} GameDates.playerIds`);
      }

      // 10. Remover de Tournament.participantIds
      if (isInTournamentParticipantIds) {
        const updatedParticipantIds = tournament29.participantIds.filter(id => id !== player.id);
        await tx.tournament.update({
          where: { id: tournament29.id },
          data: { participantIds: updatedParticipantIds }
        });
        console.log('✓ Removido de Tournament.participantIds');
      }

      console.log(`\n✅ TOTAL: ${deletedCount} registros eliminados`);
    });

    console.log(`\n${'='.repeat(60)}`);
    console.log('🎉 Limpieza completada exitosamente');
    console.log(`\n💡 Nota: Las propuestas, votos y comentarios NO fueron eliminados.`);
    console.log('   Si deseas eliminarlos también, hazlo manualmente.\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

removePlayerFromT29();
