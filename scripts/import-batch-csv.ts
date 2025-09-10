import { importHistoricalCSV } from './import-historical-csv.js';

async function importBatchCSV() {
  const csvFiles = ['f4.csv', 'f5.csv', 'f6.csv', 'f7.csv', 'f8.csv'];
  const results = [];

  console.log('🚀 IMPORTACIÓN BATCH DE CSVs\n');

  for (const file of csvFiles) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📁 Procesando: ${file}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      const result = await importHistoricalCSV(file);
      results.push({ file, ...result });
      
      if (result.success) {
        console.log(`✅ ${file} importado exitosamente`);
      } else {
        console.log(`❌ Error en ${file}: ${result.message}`);
        // Continue with next file even if one fails
      }
    } catch (error) {
      console.error(`💥 Error fatal en ${file}:`, error);
      results.push({ file, success: false, message: error instanceof Error ? error.message : 'Error desconocido', imported: 0 });
    }

    // Small delay between files
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n\n📊 RESUMEN FINAL:');
  console.log(`${'='.repeat(60)}`);
  
  const successCount = results.filter(r => r.success).length;
  const totalImported = results.reduce((sum, r) => sum + r.imported, 0);
  
  results.forEach(r => {
    console.log(`${r.success ? '✅' : '❌'} ${r.file}: ${r.imported} eliminaciones - ${r.message}`);
  });

  console.log(`\n📈 TOTAL: ${successCount}/${csvFiles.length} archivos exitosos`);
  console.log(`🎯 ELIMINACIONES TOTALES: ${totalImported}`);

  return results;
}

importBatchCSV()
  .then(results => {
    const allSuccess = results.every(r => r.success);
    process.exit(allSuccess ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Error en importación batch:', error);
    process.exit(1);
  });