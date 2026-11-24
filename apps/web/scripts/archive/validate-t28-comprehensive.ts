#!/usr/bin/env tsx

/**
 * Validación exhaustiva del Torneo 28
 * Compara tres fuentes: CSV, Base de Datos, e Imágenes oficiales
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'
import { T28_IMAGE_DATA, IMAGE_NAME_MAPPING } from '../data/t28-image-data'
import { PLAYER_NAME_MAPPING, mapCSVNameToDBName } from '../src/lib/csv-import'

const prisma = new PrismaClient()

interface CSVRecord {
  TORNEO: string
  FECHA: string
  DATE: string
  POSICION: string
  ELIMINADO: string
  ELMINADOR: string // Note: typo in CSV header
  PUNTOS: string
}

interface Elimination {
  position: number
  eliminatedName: string
  eliminatorName: string
  points: number
  dateNumber: number
}

interface ValidationResult {
  dateNumber: number
  csvEliminations: Elimination[]
  dbEliminations: Elimination[]
  imageEliminations: Elimination[]
  discrepancies: Discrepancy[]
}

interface Discrepancy {
  type: 'MISSING' | 'EXTRA' | 'MISMATCH' | 'POINTS_DIFF'
  position: number
  description: string
  csvData?: any
  dbData?: any
  imageData?: any
}

// Load CSV file
function loadCSV(filename: string): CSVRecord[] {
  const filePath = path.join(process.cwd(), filename)
  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ','
  }) as CSVRecord[]
  
  return records
}

// Convert CSV records to Elimination format
function csvToEliminations(records: CSVRecord[]): Elimination[] {
  return records.map(record => ({
    position: parseInt(record.POSICION),
    eliminatedName: record.ELIMINADO,
    eliminatorName: record.ELMINADOR || '',
    points: parseInt(record.PUNTOS),
    dateNumber: parseInt(record.FECHA)
  }))
}

// Get eliminations from database for a specific date
async function getDBEliminations(tournamentId: number, dateNumber: number): Promise<Elimination[]> {
  const gameDate = await prisma.gameDate.findFirst({
    where: {
      tournamentId,
      dateNumber
    },
    include: {
      eliminations: {
        include: {
          eliminatedPlayer: true,
          eliminatorPlayer: true
        },
        orderBy: {
          position: 'desc'
        }
      }
    }
  })

  if (!gameDate) {
    console.warn(`⚠️  No se encontró GameDate para fecha ${dateNumber}`)
    return []
  }

  return gameDate.eliminations.map(e => ({
    position: e.position,
    eliminatedName: `${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName}`,
    eliminatorName: e.eliminatorPlayer ? 
      `${e.eliminatorPlayer.firstName} ${e.eliminatorPlayer.lastName}` : '',
    points: e.points,
    dateNumber
  }))
}

// Get eliminations from image data
function getImageEliminations(dateNumber: number): Elimination[] {
  // For date 1, we have individual data
  if (dateNumber === 1) {
    const imageData = T28_IMAGE_DATA.fecha1_individual
    if (!imageData || !Array.isArray(imageData)) {
      console.warn(`⚠️  No hay datos de imagen para fecha ${dateNumber}`)
      return []
    }

    return imageData.map(result => ({
      position: result.position,
      eliminatedName: IMAGE_NAME_MAPPING[result.player] || result.player,
      eliminatorName: '', // Images don't show eliminator
      points: result.points,
      dateNumber
    }))
  }
  
  // For other dates, we need to extract from accumulated data
  // This is more complex and would require comparing deltas
  console.warn(`⚠️  Los datos de imagen para fecha ${dateNumber} son acumulados, no individuales`)
  return []
}

// Compare three sources and find discrepancies
function compareEliminations(
  csv: Elimination[], 
  db: Elimination[], 
  image: Elimination[]
): Discrepancy[] {
  const discrepancies: Discrepancy[] = []
  const maxPosition = Math.max(
    csv.length,
    db.length,
    image.length
  )

  for (let pos = maxPosition; pos >= 1; pos--) {
    const csvEntry = csv.find(e => e.position === pos)
    const dbEntry = db.find(e => e.position === pos)
    const imgEntry = image.find(e => e.position === pos)

    // Check if entry exists in all sources
    if (!csvEntry && (dbEntry || imgEntry)) {
      discrepancies.push({
        type: 'MISSING',
        position: pos,
        description: `Posición ${pos} falta en CSV`,
        dbData: dbEntry,
        imageData: imgEntry
      })
      continue
    }

    if (!dbEntry && (csvEntry || imgEntry)) {
      discrepancies.push({
        type: 'MISSING',
        position: pos,
        description: `Posición ${pos} falta en BD`,
        csvData: csvEntry,
        imageData: imgEntry
      })
      continue
    }

    if (!imgEntry && (csvEntry || dbEntry)) {
      // This is OK for positions beyond what's shown in images
      if (pos <= (csvEntry?.position || dbEntry?.position || 0)) {
        discrepancies.push({
          type: 'MISSING',
          position: pos,
          description: `Posición ${pos} falta en imagen`,
          csvData: csvEntry,
          dbData: dbEntry
        })
      }
      continue
    }

    // All three exist, check for mismatches
    if (csvEntry && dbEntry && imgEntry) {
      // Check player names
      const csvName = mapCSVNameToDBName(csvEntry.eliminatedName)
      const dbName = dbEntry.eliminatedName
      const imgName = imgEntry.eliminatedName

      if (csvName !== dbName || dbName !== imgName) {
        discrepancies.push({
          type: 'MISMATCH',
          position: pos,
          description: `Nombres diferentes - CSV: "${csvName}", DB: "${dbName}", IMG: "${imgName}"`,
          csvData: csvEntry,
          dbData: dbEntry,
          imageData: imgEntry
        })
      }

      // Check points
      if (csvEntry.points !== dbEntry.points || dbEntry.points !== imgEntry.points) {
        discrepancies.push({
          type: 'POINTS_DIFF',
          position: pos,
          description: `Puntos diferentes - CSV: ${csvEntry.points}, DB: ${dbEntry.points}, IMG: ${imgEntry.points}`,
          csvData: csvEntry,
          dbData: dbEntry,
          imageData: imgEntry
        })
      }
    }
  }

  return discrepancies
}

// Print validation results for a date
function printDateValidation(result: ValidationResult) {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`VALIDACIÓN FECHA ${result.dateNumber}`)
  console.log('='.repeat(80))
  
  console.log(`\nResumen:`)
  console.log(`- Eliminaciones en CSV: ${result.csvEliminations.length}`)
  console.log(`- Eliminaciones en BD: ${result.dbEliminations.length}`)
  console.log(`- Eliminaciones en Imagen: ${result.imageEliminations.length}`)
  console.log(`- Discrepancias encontradas: ${result.discrepancies.length}`)

  if (result.discrepancies.length === 0) {
    console.log('\n✅ PERFECTO: Las tres fuentes coinciden completamente')
  } else {
    console.log('\n❌ DISCREPANCIAS ENCONTRADAS:')
    console.log('\nPOS | TIPO         | DESCRIPCIÓN')
    console.log('----|--------------|' + '-'.repeat(60))
    
    result.discrepancies.forEach(disc => {
      console.log(
        `${disc.position.toString().padStart(3)} | ${disc.type.padEnd(12)} | ${disc.description}`
      )
    })
  }

  // Print detailed comparison table
  console.log('\nTABLA COMPARATIVA DETALLADA:')
  console.log('POS | CSV PLAYER           | CSV PTS | DB PLAYER            | DB PTS | IMG PLAYER           | IMG PTS')
  console.log('----|----------------------|---------|----------------------|--------|----------------------|--------')
  
  const maxPos = Math.max(
    result.csvEliminations.length,
    result.dbEliminations.length,
    result.imageEliminations.length
  )

  for (let pos = maxPos; pos >= 1; pos--) {
    const csv = result.csvEliminations.find(e => e.position === pos)
    const db = result.dbEliminations.find(e => e.position === pos)
    const img = result.imageEliminations.find(e => e.position === pos)

    console.log(
      `${pos.toString().padStart(3)} | ` +
      `${(csv?.eliminatedName || '-').padEnd(20)} | ` +
      `${(csv?.points?.toString() || '-').padStart(7)} | ` +
      `${(db?.eliminatedName || '-').padEnd(20)} | ` +
      `${(db?.points?.toString() || '-').padStart(6)} | ` +
      `${(img?.eliminatedName || '-').padEnd(20)} | ` +
      `${(img?.points?.toString() || '-').padStart(7)}`
    )
  }
}

// Main validation function
async function validateTournament28() {
  console.log('🔍 VALIDACIÓN EXHAUSTIVA DEL TORNEO 28')
  console.log('Comparando: Archivos CSV vs Base de Datos vs Imágenes Oficiales')
  console.log('Fecha:', new Date().toLocaleString())

  try {
    // Get tournament
    const tournament = await prisma.tournament.findFirst({
      where: { number: 28 }
    })

    if (!tournament) {
      throw new Error('Torneo 28 no encontrado en la base de datos')
    }

    // CSV files mapping
    const csvFiles = {
      1: 't28f01.csv',
      2: 'f2.csv',
      3: 'f3.csv',
      4: 'f4.csv',
      5: 'f5.csv',
      6: 'f6.csv',
      7: 'f7.csv',
      8: 'f8.csv'
    }

    const allResults: ValidationResult[] = []
    let totalDiscrepancies = 0

    // Validate each date
    for (let dateNum = 1; dateNum <= 4; dateNum++) { // Start with first 4 dates
      console.log(`\n📅 Procesando Fecha ${dateNum}...`)
      
      // Load CSV
      const csvFile = csvFiles[dateNum]
      if (!csvFile) {
        console.warn(`⚠️  No hay archivo CSV para fecha ${dateNum}`)
        continue
      }
      
      const csvRecords = loadCSV(csvFile)
      const csvEliminations = csvToEliminations(csvRecords)
      
      // Get DB eliminations
      const dbEliminations = await getDBEliminations(tournament.id, dateNum)
      
      // Get Image eliminations
      const imageEliminations = getImageEliminations(dateNum)
      
      // Compare all three
      const discrepancies = compareEliminations(
        csvEliminations,
        dbEliminations,
        imageEliminations
      )
      
      const result: ValidationResult = {
        dateNumber: dateNum,
        csvEliminations,
        dbEliminations,
        imageEliminations,
        discrepancies
      }
      
      allResults.push(result)
      totalDiscrepancies += discrepancies.length
      
      // Print results for this date
      printDateValidation(result)
    }

    // Final summary
    console.log(`\n${'='.repeat(80)}`)
    console.log('RESUMEN FINAL DE VALIDACIÓN')
    console.log('='.repeat(80))
    console.log(`\nFechas validadas: ${allResults.length}`)
    console.log(`Total de discrepancias: ${totalDiscrepancies}`)
    
    const perfectDates = allResults.filter(r => r.discrepancies.length === 0).length
    console.log(`Fechas perfectas: ${perfectDates}/${allResults.length}`)
    
    if (totalDiscrepancies === 0) {
      console.log('\n✅ EXCELENTE: Todas las fuentes coinciden perfectamente')
    } else {
      console.log('\n⚠️  Se encontraron discrepancias que requieren revisión')
      
      // Group discrepancies by type
      const byType = allResults.flatMap(r => r.discrepancies)
        .reduce((acc, disc) => {
          acc[disc.type] = (acc[disc.type] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      
      console.log('\nDiscrepancias por tipo:')
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`- ${type}: ${count}`)
      })
    }

  } catch (error) {
    console.error('❌ Error durante la validación:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run validation
validateTournament28()
  .catch(console.error)