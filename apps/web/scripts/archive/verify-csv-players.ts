import { readFileSync } from 'fs';
import { validateCSVPlayerNames } from './player-name-mapping.js';

async function verifyAllCSVPlayers() {
  console.log('🔍 VERIFICANDO JUGADORES EN TODOS LOS CSVs...\n');

  const csvFiles = ['f2.csv', 'f3.csv', 'f4.csv', 'f5.csv', 'f6.csv', 'f7.csv', 'f8.csv'];
  const allUniqueNames = new Set<string>();
  const filePlayerCounts: Record<string, number> = {};

  // Collect all unique player names across all CSVs
  for (const file of csvFiles) {
    try {
      const content = readFileSync(file, 'utf-8');
      const lines = content.trim().split('\n');
      let playerCount = 0;
      
      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const columns = line.split(',');
        if (columns.length >= 7) {
          playerCount++;
          const eliminated = columns[4].trim();
          const eliminator = columns[5].trim();
          
          allUniqueNames.add(eliminated);
          if (eliminator) {
            allUniqueNames.add(eliminator);
          }
        }
      }
      
      filePlayerCounts[file] = playerCount;
      console.log(`📄 ${file}: ${playerCount} eliminaciones`);
    } catch (error) {
      console.error(`❌ Error reading ${file}:`, error);
    }
  }

  console.log(`\n📊 TOTAL NOMBRES ÚNICOS: ${allUniqueNames.size}`);

  // Validate all names
  const namesArray = Array.from(allUniqueNames).sort();
  const validation = await validateCSVPlayerNames(namesArray);

  console.log('\n✅ JUGADORES VÁLIDOS:', validation.valid.length);
  
  if (validation.warnings.length > 0) {
    console.log('\n⚠️  ADVERTENCIAS:');
    validation.warnings.forEach(w => {
      console.log(`- ${w.csvName}: ${w.message}`);
    });
  }

  if (validation.invalid.length > 0) {
    console.log('\n❌ JUGADORES NO ENCONTRADOS:');
    validation.invalid.forEach(i => {
      console.log(`- ${i.csvName}: ${i.reason}`);
    });
  }

  // Check for specific cases
  console.log('\n🔍 CASOS ESPECIALES A REVISAR:');
  const specialCases = [
    'Jose Patricio Moreno',
    'Meche Garrido',
    'Juan Guajardo',
    'Invitado SN',
    'Agustin Guerrero',
    'Apolinar Externo'
  ];

  for (const name of specialCases) {
    if (allUniqueNames.has(name)) {
      const playerInfo = validation.valid.find(v => v.csvName === name) || 
                        validation.invalid.find(i => i.csvName === name);
      console.log(`- ${name}: ${playerInfo ? 'Encontrado en DB' : 'NO encontrado'}`);
    }
  }

  // Summary
  console.log('\n📋 RESUMEN:');
  console.log(`- Archivos procesados: ${csvFiles.length}`);
  console.log(`- Total eliminaciones: ${Object.values(filePlayerCounts).reduce((a, b) => a + b, 0)}`);
  console.log(`- Jugadores válidos: ${validation.valid.length}`);
  console.log(`- Advertencias: ${validation.warnings.length}`);
  console.log(`- Errores: ${validation.invalid.length}`);
  
  return {
    valid: validation.valid.length === namesArray.length,
    validation,
    filePlayerCounts
  };
}

verifyAllCSVPlayers()
  .then(result => {
    console.log('\n🎯 RESULTADO:', result.valid ? '✅ LISTO PARA IMPORTAR' : '❌ REVISAR ERRORES');
  })
  .catch(console.error);