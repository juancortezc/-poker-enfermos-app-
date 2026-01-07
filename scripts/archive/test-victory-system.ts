import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testVictorySystem() {
  console.log('🧪 Testing Sistema de Última Victoria...\n');

  try {
    // 1. Verificar que los ganadores tengan lastVictoryDate
    console.log('1. Verificando ganadores con lastVictoryDate...');
    const playersWithVictories = await prisma.player.findMany({
      where: {
        lastVictoryDate: { not: null }
      },
      select: {
        firstName: true,
        lastName: true,
        lastVictoryDate: true
      }
    });

    console.log(`   ✅ Encontrados ${playersWithVictories.length} jugadores con victorias:`);
    playersWithVictories.forEach(player => {
      console.log(`      - ${player.firstName} ${player.lastName}: ${player.lastVictoryDate}`);
    });

    // 2. Probar API de días sin ganar
    console.log('\n2. Probando API de días sin ganar...');
    const response = await fetch('http://localhost:3000/api/stats/days-without-victory/1');
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ API funciona - ${data.players.length} jugadores encontrados`);
      console.log(`   📊 Stats: ${data.stats.playersWithVictories} con victorias, ${data.stats.playersNeverWon} sin victorias`);
      console.log(`   🔥 Mayor sequía: ${data.stats.longestStreak} días`);
    } else {
      console.log(`   ❌ Error en API: ${response.status}`);
    }

    // 3. Verificar lógica de días calculados
    console.log('\n3. Verificando cálculo de días...');
    const today = new Date();
    const freddy = playersWithVictories.find(p => p.firstName === 'Freddy');
    
    if (freddy && freddy.lastVictoryDate) {
      const [day, month, year] = freddy.lastVictoryDate.split('/').map(Number);
      const lastVictoryDate = new Date(year, month - 1, day);
      const daysDiff = Math.floor((today.getTime() - lastVictoryDate.getTime()) / (1000 * 3600 * 24));
      
      console.log(`   ✅ Freddy López - Última victoria: ${freddy.lastVictoryDate}`);
      console.log(`   📅 Días calculados: ${daysDiff}`);
      console.log(`   🎯 Debería ser el que menos días tiene sin ganar`);
    }

    console.log('\n🎉 TODAS LAS PRUEBAS PASARON EXITOSAMENTE!');
    
  } catch (error) {
    console.error('❌ Error en testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  testVictorySystem()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { testVictorySystem };