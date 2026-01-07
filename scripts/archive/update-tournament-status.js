const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateTournamentStatus() {
  try {
    console.log('🔄 Updating tournament statuses...');
    
    // Update all PROXIMO tournaments to ACTIVO
    const updated = await prisma.tournament.updateMany({
      where: { status: 'PROXIMO' },
      data: { status: 'ACTIVO' }
    });

    console.log(`✅ Updated ${updated.count} tournaments from PROXIMO to ACTIVO`);
    
    // Show current tournament statuses
    const tournaments = await prisma.tournament.findMany({
      select: {
        id: true,
        number: true,
        status: true,
        name: true
      },
      orderBy: { number: 'desc' }
    });

    console.log('📊 Current tournament statuses:');
    tournaments.forEach(t => {
      console.log(`   - Torneo ${t.number}: ${t.status}`);
    });

  } catch (error) {
    console.error('❌ Error updating tournament status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTournamentStatus();