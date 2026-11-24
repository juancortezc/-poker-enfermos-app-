import { prisma } from '../src/lib/prisma.js';

async function fixGameDateParticipants() {
  console.log('🔧 CORRIGIENDO PARTICIPANTES DE FECHA 1...\n');

  const gameDate1 = await prisma.gameDate.findFirst({
    where: {
      tournament: { number: 28 },
      dateNumber: 1
    }
  });

  if (!gameDate1) {
    console.log('❌ Fecha 1 no encontrada');
    return;
  }

  // Get players that actually have eliminations
  const eliminations = await prisma.elimination.findMany({
    where: { gameDateId: gameDate1.id },
    include: { eliminatedPlayer: true }
  });

  const actualParticipantIds = eliminations.map(e => e.eliminatedPlayerId);
  
  console.log('📅 PARTICIPANTES ACTUALES:', gameDate1.playerIds.length);
  console.log('🎯 PARTICIPANTES REALES (con eliminaciones):', actualParticipantIds.length);

  // Find the non-participants
  const nonParticipants = gameDate1.playerIds.filter(id => !actualParticipantIds.includes(id));
  
  if (nonParticipants.length > 0) {
    const nonParticipantPlayers = await prisma.player.findMany({
      where: { id: { in: nonParticipants } }
    });

    console.log('\n🚫 JUGADORES A REMOVER:');
    nonParticipantPlayers.forEach(player => {
      console.log(`- ${player.firstName} ${player.lastName}`);
    });

    // Update GameDate with correct participant list
    await prisma.gameDate.update({
      where: { id: gameDate1.id },
      data: {
        playerIds: actualParticipantIds
      }
    });

    console.log('\n✅ LISTA DE PARTICIPANTES CORREGIDA');
    console.log(`Antes: ${gameDate1.playerIds.length} jugadores`);
    console.log(`Después: ${actualParticipantIds.length} jugadores`);

    // Show the corrected participant list
    console.log('\n📋 PARTICIPANTES FINALES:');
    eliminations
      .sort((a, b) => a.position - b.position)
      .forEach((elim, index) => {
        console.log(`${index + 1}. ${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName} - Pos ${elim.position} (${elim.points} pts)`);
      });

  } else {
    console.log('✅ La lista de participantes ya está correcta');
  }
}

fixGameDateParticipants()
  .finally(() => prisma.$disconnect())
  .then(() => {
    console.log('\n🎉 CORRECCIÓN COMPLETADA');
    console.log('🔄 Ahora el ranking debería mostrar correctamente solo a Roddy Naranjo como ganador con 26 pts');
  })
  .catch(console.error);