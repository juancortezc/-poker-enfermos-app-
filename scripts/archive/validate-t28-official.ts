#!/usr/bin/env tsx

/**
 * Validación del Torneo 28 contra imágenes oficiales del grupo
 * Compara CSV, Base de Datos y datos oficiales de eliminaciones e imágenes
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'
import { T28_IMAGE_DATA, IMAGE_NAME_MAPPING, NICKNAME_MAPPING } from '../data/t28-image-data'
import { PLAYER_NAME_MAPPING, mapCSVNameToDBName } from '../src/lib/csv-import'

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

interface PlayerScore {
  playerName: string
  position: number
  points: number
  source: 'CSV' | 'BD' | 'IMAGEN'
}

interface DateDiscrepancy {
  fecha: number
  playerName: string
  csvPoints?: number
  bdPoints?: number
  imagePoints?: number
  errorType: string
}

interface AccumulatedDiscrepancy {
  fecha: number
  playerName: string
  csvTotal?: number
  bdTotal?: number
  imageTotal?: number
  errorType: string
}

// Mapear apodos a nombres completos
function mapNicknameToFullName(nickname: string): string {
  return NICKNAME_MAPPING[nickname.toLowerCase()] || nickname
}

// Cargar CSV
function loadCSV(filename: string): CSVRecord[] {
  const filePath = path.join(process.cwd(), filename)
  const fileContent = fs.readFileSync(filePath, 'utf-8')
  return parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ','
  }) as CSVRecord[]
}

// Obtener puntos de CSV para una fecha
function getCSVPoints(dateNumber: number): PlayerScore[] {
  const csvFiles = {
    1: 't28f01.csv',
    2: 'f2.csv',
    3: 'f3.csv',
    4: 'f4.csv'
  }

  const csvFile = csvFiles[dateNumber]
  if (!csvFile) return []

  const records = loadCSV(csvFile)
  return records.map(record => ({
    playerName: mapCSVNameToDBName(record.ELIMINADO),
    position: parseInt(record.POSICION),
    points: parseInt(record.PUNTOS),
    source: 'CSV' as const
  }))
}

// Obtener puntos de BD para una fecha
async function getBDPoints(tournamentId: number, dateNumber: number): Promise<PlayerScore[]> {
  const gameDate = await prisma.gameDate.findFirst({
    where: {
      tournamentId,
      dateNumber
    },
    include: {
      eliminations: {
        include: {
          eliminatedPlayer: true
        },
        orderBy: {
          position: 'desc'
        }
      }
    }
  })

  if (!gameDate) return []

  return gameDate.eliminations.map(e => ({
    playerName: `${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName}`,
    position: e.position,
    points: e.points,
    source: 'BD' as const
  }))
}

// Obtener puntos de imagen oficial para fecha 1
function getImagePoints(dateNumber: number): PlayerScore[] {
  if (dateNumber === 1) {
    // Usar datos de t1.jpeg (ranking oficial)
    const imageData = T28_IMAGE_DATA.fecha1_individual
    return imageData.map(result => ({
      playerName: IMAGE_NAME_MAPPING[result.player] || result.player,
      position: result.position,
      points: result.points,
      source: 'IMAGEN' as const
    }))
  }
  
  return []
}

// Obtener totales acumulados de imagen oficial
function getImageAccumulated(dateNumber: number): Record<string, number> {
  const accumData = T28_IMAGE_DATA[`fecha${dateNumber}_acumulado`]
  if (!accumData || !Array.isArray(accumData)) return {}

  const totals: Record<string, number> = {}
  accumData.forEach(player => {
    const fullName = IMAGE_NAME_MAPPING[player.player] || player.player
    totals[fullName] = player.total
  })
  
  return totals
}

// Comparar puntos por fecha
function comparePointsByDate(
  csv: PlayerScore[], 
  bd: PlayerScore[], 
  image: PlayerScore[],
  dateNumber: number
): DateDiscrepancy[] {
  const discrepancies: DateDiscrepancy[] = []
  
  // Crear mapas por jugador
  const csvMap = new Map(csv.map(p => [p.playerName, p.points]))
  const bdMap = new Map(bd.map(p => [p.playerName, p.points]))
  const imageMap = new Map(image.map(p => [p.playerName, p.points]))
  
  // Obtener todos los jugadores únicos
  const allPlayers = new Set([
    ...csvMap.keys(),
    ...bdMap.keys(),
    ...imageMap.keys()
  ])
  
  allPlayers.forEach(playerName => {
    const csvPts = csvMap.get(playerName)
    const bdPts = bdMap.get(playerName)
    const imagePts = imageMap.get(playerName)
    
    // Comparar puntos
    if (csvPts !== bdPts || bdPts !== imagePts || csvPts !== imagePts) {
      let errorType = 'DIFERENCIA_PUNTOS'
      
      if (csvPts === undefined) errorType = 'FALTA_CSV'
      else if (bdPts === undefined) errorType = 'FALTA_BD'
      else if (imagePts === undefined) errorType = 'FALTA_IMAGEN'
      
      discrepancies.push({
        fecha: dateNumber,
        playerName,
        csvPoints: csvPts,
        bdPoints: bdPts,
        imagePoints: imagePts,
        errorType
      })
    }
  })
  
  return discrepancies
}

// Imprimir cuadro de discrepancias por fecha
function printDateDiscrepancies(discrepancies: DateDiscrepancy[]) {
  console.log('\n' + '='.repeat(100))
  console.log('CUADRO A - DISCREPANCIAS EN PUNTOS POR FECHA')
  console.log('='.repeat(100))
  console.log('FECHA | # ERRORES | NOMBRE                | PTS_IMAGEN | PTS_CSV | PTS_SISTEMA')
  console.log('------|-----------|----------------------|------------|---------|-------------')
  
  const byDate = discrepancies.reduce((acc, disc) => {
    if (!acc[disc.fecha]) acc[disc.fecha] = []
    acc[disc.fecha].push(disc)
    return acc
  }, {} as Record<number, DateDiscrepancy[]>)
  
  Object.entries(byDate).forEach(([fecha, errs]) => {
    errs.forEach((err, index) => {
      const fechaStr = index === 0 ? fecha.padStart(5) : ''.padStart(5)
      const errCountStr = index === 0 ? errs.length.toString().padStart(9) : ''.padStart(9)
      
      console.log(
        `${fechaStr} | ${errCountStr} | ${err.playerName.padEnd(20)} | ` +
        `${(err.imagePoints?.toString() || '-').padStart(10)} | ` +
        `${(err.csvPoints?.toString() || '-').padStart(7)} | ` +
        `${(err.bdPoints?.toString() || '-').padStart(11)}`
      )
    })
    console.log('------|-----------|----------------------|------------|---------|-------------')
  })
}

// Función principal de validación
async function validateTournament28Official() {
  console.log('🎯 VALIDACIÓN OFICIAL DEL TORNEO 28')
  console.log('Comparando contra imágenes oficiales del grupo')
  console.log('Fecha:', new Date().toLocaleString())

  try {
    const tournament = await prisma.tournament.findFirst({
      where: { number: 28 }
    })

    if (!tournament) {
      throw new Error('Torneo 28 no encontrado')
    }

    const allDateDiscrepancies: DateDiscrepancy[] = []
    
    // Validar fecha 1 con datos completos
    console.log('\n📅 VALIDANDO FECHA 1...')
    
    const csv1 = getCSVPoints(1)
    const bd1 = await getBDPoints(tournament.id, 1)
    const image1 = getImagePoints(1)
    
    console.log(`- CSV: ${csv1.length} registros`)
    console.log(`- BD: ${bd1.length} registros`)
    console.log(`- Imagen: ${image1.length} registros`)
    
    const date1Discrepancies = comparePointsByDate(csv1, bd1, image1, 1)
    allDateDiscrepancies.push(...date1Discrepancies)
    
    console.log(`- Discrepancias encontradas: ${date1Discrepancies.length}`)
    
    // Imprimir resultados
    if (allDateDiscrepancies.length > 0) {
      printDateDiscrepancies(allDateDiscrepancies)
      
      console.log('\n📊 RESUMEN:')
      console.log(`Total de discrepancias en puntos: ${allDateDiscrepancies.length}`)
      console.log('\nTipos de errores:')
      const errorTypes = allDateDiscrepancies.reduce((acc, disc) => {
        acc[disc.errorType] = (acc[disc.errorType] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      Object.entries(errorTypes).forEach(([type, count]) => {
        console.log(`- ${type}: ${count}`)
      })
    } else {
      console.log('\n✅ PERFECTO: No se encontraron discrepancias en puntos por fecha')
    }

  } catch (error) {
    console.error('❌ Error durante la validación:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar validación
validateTournament28Official()
  .catch(console.error)