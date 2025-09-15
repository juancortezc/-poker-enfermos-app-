import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Datos históricos de victorias pre-T28
const historicalVictories = [
  { name: 'Meche G.', date: '1/12/2021', skip: true }, // Ya tiene victoria en T28
  { name: 'Joffre P.', date: '11/15/2022' },
  { name: 'Javier M.', date: '6/20/2023' },
  { name: 'Freddy L.', date: '10/24/2023', skip: true }, // Ya tiene victoria en T28
  { name: 'Fernando P.', date: '11/28/2023', skip: true }, // Ya tiene victoria en T28
  { name: 'Ruben C.', date: '3/5/2024', skip: true }, // Ya tiene victoria en T28
  { name: 'Daniel V.', date: '3/19/2024' },
  { name: 'Diego B.', date: '4/2/2024' },
  { name: 'Carlos Ch.', date: '4/30/2024' },
  { name: 'Jorge T.', date: '5/14/2024' },
  { name: 'Juan G.', date: '5/28/2024' },
  { name: 'Miguel Ch.', date: '6/11/2024' },
  { name: 'Juan Fernando O.', date: '6/25/2024', skip: true }, // Ya tiene victoria en T28
  { name: 'Juan C.', date: '7/9/2024' },
  { name: 'Damian A.', date: '7/23/2024' },
  { name: 'Jose Patricio M.', date: '11/12/2024' },
  { name: 'Juan T.', date: '12/10/2024' },
  { name: 'Sean W.', date: '1/7/2025', skip: true }, // Ya tiene victoria en T28
  { name: 'Mono B.', date: '2/4/2025', skip: true }, // Ya tiene victoria en T28
  { name: 'Roddy N.', date: '2/18/2025', skip: true }, // Ya tiene victoria en T28
  { name: 'Jose Luis T.', date: '3/11/2025' },
  { name: 'Milton T.', date: '3/25/2025' }
];

// Mapeo de nombres cortos a nombres completos en BD
const nameMapping: Record<string, { firstName: string, lastName: string }> = {
  'Meche G.': { firstName: 'Meche', lastName: 'Garrido' },
  'Joffre P.': { firstName: 'Joffre', lastName: 'Palacios' },
  'Javier M.': { firstName: 'Javier', lastName: 'Martinez' },
  'Freddy L.': { firstName: 'Freddy', lastName: 'Lopez' },
  'Fernando P.': { firstName: 'Fernando', lastName: 'Peña' },
  'Ruben C.': { firstName: 'Ruben', lastName: 'Cadena' },
  'Daniel V.': { firstName: 'Daniel', lastName: 'Vela' },
  'Diego B.': { firstName: 'Diego', lastName: 'Behar' },
  'Carlos Ch.': { firstName: 'Carlos', lastName: 'Chacón' },
  'Jorge T.': { firstName: 'Jorge', lastName: 'Tamayo' },
  'Juan G.': { firstName: 'Juan', lastName: 'Guajardo' },
  'Miguel Ch.': { firstName: 'Miguel', lastName: 'Chiesa' },
  'Juan Fernando O.': { firstName: 'Juan Fernando', lastName: ' Ochoa' }, // Nota: espacio extra en BD
  'Juan C.': { firstName: 'Juan Antonio', lastName: 'Cortez' }, // Nombre completo en BD
  'Damian A.': { firstName: 'Damian', lastName: 'Amador' },
  'Jose Patricio M.': { firstName: 'Jose Patricio', lastName: ' Moreno' }, // Nota: espacio extra en BD
  'Juan T.': { firstName: 'Juan', lastName: 'Tapia' },
  'Sean W.': { firstName: 'Sean', lastName: 'Willis' },
  'Mono B.': { firstName: 'Mono', lastName: 'Benites' },
  'Roddy N.': { firstName: 'Roddy', lastName: 'Naranjo' },
  'Jose Luis T.': { firstName: 'Jose Luis', lastName: ' Toral' }, // Nota: espacio extra en BD
  'Milton T.': { firstName: 'Milton', lastName: 'Tapia' }
};

// Función para convertir fecha MM/DD/YYYY a DD/MM/YYYY
function convertDateFormat(dateStr: string): string {
  const [month, day, year] = dateStr.split('/');
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}

async function updateHistoricalVictories() {
  console.log('🏆 Iniciando actualización de victorias históricas pre-T28...\n');

  try {
    let updateCount = 0;
    let skipCount = 0;

    for (const victory of historicalVictories) {
      if (victory.skip) {
        console.log(`⏭️  Saltando ${victory.name} - Ya tiene victoria en T28`);
        skipCount++;
        continue;
      }

      const playerInfo = nameMapping[victory.name];
      if (!playerInfo) {
        console.log(`❌ No se encontró mapeo para: ${victory.name}`);
        continue;
      }

      // Buscar el jugador en la BD
      const player = await prisma.player.findFirst({
        where: {
          firstName: playerInfo.firstName,
          lastName: playerInfo.lastName,
          isActive: true
        }
      });

      if (!player) {
        console.log(`❌ No se encontró jugador: ${playerInfo.firstName} ${playerInfo.lastName}`);
        continue;
      }

      // Solo actualizar si NO tiene lastVictoryDate
      if (player.lastVictoryDate) {
        console.log(`⚠️  ${player.firstName} ${player.lastName} ya tiene victoria registrada: ${player.lastVictoryDate}`);
        continue;
      }

      // Convertir fecha y actualizar
      const formattedDate = convertDateFormat(victory.date);
      
      await prisma.player.update({
        where: { id: player.id },
        data: { lastVictoryDate: formattedDate }
      });

      console.log(`✅ Actualizado: ${player.firstName} ${player.lastName} - ${formattedDate}`);
      updateCount++;
    }

    console.log(`\n📊 RESUMEN DE ACTUALIZACIÓN:`);
    console.log(`   ✅ Jugadores actualizados: ${updateCount}`);
    console.log(`   ⏭️  Jugadores saltados (T28): ${skipCount}`);
    console.log(`   📝 Total procesados: ${historicalVictories.length}`);

    // Verificar el resultado final
    console.log(`\n🔍 VERIFICACIÓN FINAL:`);
    const playersWithVictory = await prisma.player.count({
      where: {
        lastVictoryDate: { not: null },
        isActive: true,
        role: { in: ['Comision', 'Enfermo'] }
      }
    });

    const playersWithoutVictory = await prisma.player.count({
      where: {
        lastVictoryDate: null,
        isActive: true,
        role: { in: ['Comision', 'Enfermo'] }
      }
    });

    console.log(`   🏆 Jugadores con victoria: ${playersWithVictory}`);
    console.log(`   ❌ Jugadores sin victoria: ${playersWithoutVictory}`);

    // Mostrar jugadores que siguen sin victoria
    if (playersWithoutVictory > 0) {
      console.log(`\n⚠️  Jugadores que aún no tienen victoria registrada:`);
      const stillNoVictory = await prisma.player.findMany({
        where: {
          lastVictoryDate: null,
          isActive: true,
          role: { in: ['Comision', 'Enfermo'] }
        },
        select: {
          firstName: true,
          lastName: true
        }
      });

      stillNoVictory.forEach(p => {
        console.log(`   - ${p.firstName} ${p.lastName}`);
      });
    }

  } catch (error) {
    console.error('❌ Error en el proceso:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
if (require.main === module) {
  updateHistoricalVictories()
    .then(() => {
      console.log('\n✅ Script ejecutado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error ejecutando script:', error);
      process.exit(1);
    });
}

export { updateHistoricalVictories };