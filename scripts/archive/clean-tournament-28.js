const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteTournament28() {
  try {
    console.log('🔍 Finding Tournament 28...');
    
    // Find Tournament 28
    const tournament = await prisma.tournament.findFirst({
      where: { number: 28 },
      include: {
        gameDates: true,
        tournamentParticipants: true
      }
    });

    if (!tournament) {
      console.log('❌ Tournament 28 not found');
      return;
    }

    console.log(`📊 Found Tournament 28 (ID: ${tournament.id})`);
    console.log(`   - Status: ${tournament.status}`);
    console.log(`   - Participants: ${tournament.tournamentParticipants.length}`);
    console.log(`   - Game Dates: ${tournament.gameDates.length}`);

    // Delete in correct order to respect foreign keys
    console.log('🗑️  Deleting associated data...');

    // Delete eliminations for all game dates
    for (const gameDate of tournament.gameDates) {
      const eliminationsDeleted = await prisma.elimination.deleteMany({
        where: { gameDateId: gameDate.id }
      });
      console.log(`   - Deleted ${eliminationsDeleted.count} eliminations for date ${gameDate.dateNumber}`);
    }

    // Delete game dates
    const gameDatesDeleted = await prisma.gameDate.deleteMany({
      where: { tournamentId: tournament.id }
    });
    console.log(`   - Deleted ${gameDatesDeleted.count} game dates`);

    // Delete tournament participants
    const participantsDeleted = await prisma.tournamentParticipant.deleteMany({
      where: { tournamentId: tournament.id }
    });
    console.log(`   - Deleted ${participantsDeleted.count} tournament participants`);

    // Delete blind levels
    const blindsDeleted = await prisma.blindLevel.deleteMany({
      where: { tournamentId: tournament.id }
    });
    console.log(`   - Deleted ${blindsDeleted.count} blind levels`);

    // Finally delete the tournament
    await prisma.tournament.delete({
      where: { id: tournament.id }
    });

    console.log('✅ Tournament 28 and all associated data deleted successfully');

  } catch (error) {
    console.error('❌ Error deleting Tournament 28:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteTournament28();