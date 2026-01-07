#!/usr/bin/env tsx

/**
 * Análisis exhaustivo fecha por fecha del Torneo 28
 * Compara CSV vs BD vs Imágenes oficiales para todas las fechas disponibles
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'
import { T28_IMAGE_DATA, IMAGE_NAME_MAPPING, NICKNAME_MAPPING } from '../data/t28-image-data'
import { mapCSVNameToDBName } from '../src/lib/csv-import'

const prisma = new PrismaClient()

interface CSVRecord {
  TORNEO: string
  FECHA: string
  DATE: string
  POSICION: string
  ELIMINADO: string
  ELMINADOR: string
  PUNTOS: string
}

interface DateAnalysis {
  dateNumber: number
  csvFile: string
  csvCount: number
  bdCount: number
  imageCount: number
  csvTotal: number
  bdTotal: number
  imageTotal: number
  discrepancies: Array<{
    type: string
    position?: number
    player?: string
    csvData?: any
    bdData?: any
    imageData?: any
    description: string
  }>
}

// Mapear apodos a nombres completos
function mapNicknameToFullName(nickname: string): string {
  return NICKNAME_MAPPING[nickname.toLowerCase()] || nickname
}

// Cargar CSV si existe
function loadCSVIfExists(filename: string): CSVRecord[] {
  try {
    const filePath = path.join(process.cwd(), filename)
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    return parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ','
    }) as CSVRecord[]
  } catch (error) {
    return []
  }
}

// Obtener eliminaciones de BD para una fecha
async function getBDEliminations(tournamentId: number, dateNumber: number) {
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

  if (!gameDate) return []

  return gameDate.eliminations.map(e => ({
    position: e.position,
    eliminatedName: `${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName}`,
    eliminatorName: e.eliminatorPlayer ? 
      `${e.eliminatorPlayer.firstName} ${e.eliminatorPlayer.lastName}` : '',
    points: e.points
  }))
}

// Obtener datos de imagen para una fecha (acumulados)
function getImageAccumulatedData(dateNumber: number) {
  const imageKey = `fecha${dateNumber}_acumulado`
  const imageData = T28_IMAGE_DATA[imageKey]
  
  if (!imageData || !Array.isArray(imageData)) {
    return []
  }

  return imageData.map(player => ({
    playerName: IMAGE_NAME_MAPPING[player.player] || player.player,
    total: player.total,
    fecha: player[`fecha${dateNumber}`] || 0
  }))
}

// Analizar una fecha específica
async function analyzeDateDiscrepancies(
  tournamentId: number, 
  dateNumber: number, 
  csvFile: string
): Promise<DateAnalysis> {
  
  // Cargar datos CSV
  const csvRecords = loadCSVIfExists(csvFile)
  const csvEliminations = csvRecords.map(record => ({
    position: parseInt(record.POSICION),
    eliminatedName: mapCSVNameToDBName(record.ELIMINADO),
    eliminatorName: record.ELMINADOR ? mapCSVNameToDBName(record.ELMINADOR) : '',
    points: parseInt(record.PUNTOS)
  }))

  // Obtener datos BD
  const bdEliminations = await getBDEliminations(tournamentId, dateNumber)

  // Obtener datos de imagen acumulados
  const imageData = getImageAccumulatedData(dateNumber)

  // Calcular totales
  const csvTotal = csvEliminations.reduce((sum, e) => sum + e.points, 0)
  const bdTotal = bdEliminations.reduce((sum, e) => sum + e.points, 0)
  const imageTotal = imageData.reduce((sum, p) => sum + p.total, 0)

  // Encontrar discrepancias
  const discrepancies = []

  // Comparar conteos
  if (csvEliminations.length !== bdEliminations.length) {
    discrepancies.push({
      type: 'COUNT_MISMATCH',
      description: `Diferentes cantidades de eliminaciones: CSV=${csvEliminations.length}, BD=${bdEliminations.length}`
    })
  }

  // Comparar totales de puntos
  if (csvTotal !== bdTotal) {
    discrepancies.push({
      type: 'TOTAL_MISMATCH',
      description: `Totales diferentes: CSV=${csvTotal}, BD=${bdTotal}, Diff=${bdTotal - csvTotal}`
    })
  }

  // Comparar eliminaciones posición por posición
  const maxPositions = Math.max(csvEliminations.length, bdEliminations.length)
  for (let pos = maxPositions; pos >= 1; pos--) {
    const csvEntry = csvEliminations.find(e => e.position === pos)
    const bdEntry = bdEliminations.find(e => e.position === pos)

    if (!csvEntry && bdEntry) {
      discrepancies.push({
        type: 'MISSING_CSV',
        position: pos,
        bdData: bdEntry,
        description: `Posición ${pos} falta en CSV: ${bdEntry.eliminatedName}`
      })
    } else if (csvEntry && !bdEntry) {
      discrepancies.push({
        type: 'MISSING_BD',
        position: pos,
        csvData: csvEntry,
        description: `Posición ${pos} falta en BD: ${csvEntry.eliminatedName}`
      })
    } else if (csvEntry && bdEntry) {
      // Comparar nombres
      if (csvEntry.eliminatedName !== bdEntry.eliminatedName) {
        discrepancies.push({
          type: 'NAME_MISMATCH',
          position: pos,
          csvData: csvEntry,
          bdData: bdEntry,
          description: `Pos ${pos}: CSV="${csvEntry.eliminatedName}" vs BD="${bdEntry.eliminatedName}"`
        })
      }
      
      // Comparar puntos
      if (csvEntry.points !== bdEntry.points) {
        discrepancies.push({
          type: 'POINTS_MISMATCH',
          position: pos,
          csvData: csvEntry,
          bdData: bdEntry,
          description: `Pos ${pos}: Puntos CSV=${csvEntry.points} vs BD=${bdEntry.points}`
        })
      }

      // Comparar eliminadores
      if (csvEntry.eliminatorName !== bdEntry.eliminatorName) {
        discrepancies.push({
          type: 'ELIMINATOR_MISMATCH',
          position: pos,
          csvData: csvEntry,
          bdData: bdEntry,
          description: `Pos ${pos}: Eliminador CSV="${csvEntry.eliminatorName}" vs BD="${bdEntry.eliminatorName}"`
        })
      }
    }
  }

  return {
    dateNumber,
    csvFile,
    csvCount: csvEliminations.length,
    bdCount: bdEliminations.length,
    imageCount: imageData.length,
    csvTotal,
    bdTotal,
    imageTotal,
    discrepancies
  }
}

// Función principal
async function validateAllDates() {
  console.log('🔍 ANÁLISIS EXHAUSTIVO FECHA POR FECHA - TORNEO 28')
  console.log('Comparando CSV vs Base de Datos para todas las fechas disponibles')
  console.log('='.repeat(100))

  try {
    const tournament = await prisma.tournament.findFirst({
      where: { number: 28 }
    })

    if (!tournament) {
      throw new Error('Torneo 28 no encontrado')
    }

    // Configuración de archivos CSV por fecha
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

    const allAnalysis: DateAnalysis[] = []

    // Analizar cada fecha
    for (let dateNum = 1; dateNum <= 8; dateNum++) {
      const csvFile = csvFiles[dateNum]
      if (!csvFile) continue

      console.log(`\n📅 ANALIZANDO FECHA ${dateNum} (${csvFile})...`)
      
      const analysis = await analyzeDateDiscrepancies(tournament.id, dateNum, csvFile)
      allAnalysis.push(analysis)

      // Imprimir resumen rápido
      console.log(`   CSV: ${analysis.csvCount} eliminaciones, ${analysis.csvTotal} puntos`)
      console.log(`   BD:  ${analysis.bdCount} eliminaciones, ${analysis.bdTotal} puntos`)
      console.log(`   Discrepancias: ${analysis.discrepancies.length}`)
      
      if (analysis.discrepancies.length === 0) {
        console.log('   ✅ PERFECTO - Sin discrepancias')
      } else {
        console.log(`   ❌ ${analysis.discrepancies.length} problemas encontrados`)
      }
    }

    // Resumen general
    console.log('\n' + '='.repeat(100))
    console.log('RESUMEN GENERAL POR FECHA')
    console.log('='.repeat(100))
    console.log('FECHA | ARCHIVO      | CSV | BD  | PUNTOS CSV | PUNTOS BD | DISCREPANCIAS | STATUS')
    console.log('------|--------------|-----|-----|------------|-----------|---------------|--------')

    allAnalysis.forEach(analysis => {
      const status = analysis.discrepancies.length === 0 ? '✅ OK' : '❌ ERROR'
      const pointsMatch = analysis.csvTotal === analysis.bdTotal ? '✅' : '❌'
      
      console.log(
        `${analysis.dateNumber.toString().padStart(5)} | ` +
        `${analysis.csvFile.padEnd(12)} | ` +
        `${analysis.csvCount.toString().padStart(3)} | ` +
        `${analysis.bdCount.toString().padStart(3)} | ` +
        `${analysis.csvTotal.toString().padStart(10)} | ` +
        `${analysis.bdTotal.toString().padStart(9)} ${pointsMatch} | ` +
        `${analysis.discrepancies.length.toString().padStart(13)} | ` +
        `${status}`
      )
    })

    // Detalles de discrepancias
    console.log('\n' + '='.repeat(100))
    console.log('DISCREPANCIAS DETALLADAS POR FECHA')
    console.log('='.repeat(100))

    allAnalysis.forEach(analysis => {
      if (analysis.discrepancies.length > 0) {
        console.log(`\n📅 FECHA ${analysis.dateNumber} - ${analysis.discrepancies.length} DISCREPANCIAS:`)
        console.log('-'.repeat(80))
        
        analysis.discrepancies.forEach((disc, index) => {
          console.log(`${(index + 1).toString().padStart(2)}. [${disc.type}] ${disc.description}`)
        })
      }
    })

    // Estadísticas finales
    console.log('\n' + '='.repeat(100))
    console.log('ESTADÍSTICAS FINALES')
    console.log('='.repeat(100))

    const totalDates = allAnalysis.length
    const perfectDates = allAnalysis.filter(a => a.discrepancies.length === 0).length
    const totalDiscrepancies = allAnalysis.reduce((sum, a) => sum + a.discrepancies.length, 0)

    console.log(`📊 Fechas analizadas: ${totalDates}`)
    console.log(`✅ Fechas perfectas: ${perfectDates}/${totalDates} (${((perfectDates/totalDates)*100).toFixed(1)}%)`)
    console.log(`❌ Total discrepancias: ${totalDiscrepancies}`)

    // Discrepancias por tipo
    const discrepanciesByType = {}
    allAnalysis.forEach(analysis => {
      analysis.discrepancies.forEach(disc => {
        discrepanciesByType[disc.type] = (discrepanciesByType[disc.type] || 0) + 1
      })
    })

    if (Object.keys(discrepanciesByType).length > 0) {
      console.log('\nDiscrepancias por tipo:')
      Object.entries(discrepanciesByType)
        .sort(([,a], [,b]) => b - a)
        .forEach(([type, count]) => {
          console.log(`- ${type}: ${count}`)
        })
    }

    console.log('\n' + '='.repeat(100))
    console.log('CONCLUSIÓN')
    console.log('='.repeat(100))

    if (perfectDates === totalDates) {
      console.log('🎉 EXCELENTE: Todas las fechas están perfectamente sincronizadas')
      console.log('✅ CSV y Base de Datos coinciden completamente')
    } else if (perfectDates >= totalDates * 0.8) {
      console.log('👍 BUENO: La mayoría de fechas están correctas')
      console.log('⚠️  Pocas discrepancias que requieren atención')
    } else {
      console.log('⚠️  ATENCIÓN REQUERIDA: Múltiples discrepancias encontradas')
      console.log('🔧 Se recomienda revisión y corrección de datos')
    }

  } catch (error) {
    console.error('❌ Error durante el análisis:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar análisis
validateAllDates()
  .catch(console.error)