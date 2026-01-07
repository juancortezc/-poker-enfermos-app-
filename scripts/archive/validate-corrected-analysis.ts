#!/usr/bin/env tsx

/**
 * Análisis corregido del Torneo 28
 * Maneja correctamente ganadores sin eliminador y valida fechas específicas
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'
import { NICKNAME_MAPPING, FECHA2_ELIMINACIONES_OFICIALES } from '../data/t28-image-data'
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

interface DiscrepancyAnalysis {
  fecha: number
  tipo: string
  posicion?: number
  jugador?: string
  descripcion: string
  csvData?: any
  bdData?: any
  oficialData?: any
  severidad: 'CRITICA' | 'IMPORTANTE' | 'MENOR' | 'INFORMATIVA'
}

// Mapear apodos a nombres completos
function mapNicknameToFullName(nickname: string): string {
  return NICKNAME_MAPPING[nickname.toLowerCase()] || nickname
}

// Cargar CSV
function loadCSV(filename: string): CSVRecord[] {
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

// Obtener eliminaciones de BD
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

// Validar fecha específica con datos oficiales
async function validateSpecificDate(
  tournamentId: number, 
  dateNumber: number, 
  csvFile: string,
  oficialEliminations?: Array<{position: number, eliminatedPlayer: string, eliminatorPlayer: string, time: string}>
): Promise<DiscrepancyAnalysis[]> {
  
  const discrepancies: DiscrepancyAnalysis[] = []
  
  console.log(`\n🔍 VALIDANDO FECHA ${dateNumber} (${csvFile})`)
  console.log('-'.repeat(60))

  // Cargar datos CSV
  const csvRecords = loadCSV(csvFile)
  const csvEliminations = csvRecords.map(record => ({
    position: parseInt(record.POSICION),
    eliminatedName: mapCSVNameToDBName(record.ELIMINADO),
    eliminatorName: record.ELMINADOR ? mapCSVNameToDBName(record.ELMINADOR) : '',
    points: parseInt(record.PUNTOS)
  }))

  // Obtener datos BD
  const bdEliminations = await getBDEliminations(tournamentId, dateNumber)

  console.log(`CSV: ${csvEliminations.length} eliminaciones`)
  console.log(`BD:  ${bdEliminations.length} eliminaciones`)
  if (oficialEliminations) {
    console.log(`OFICIAL: ${oficialEliminations.length} eliminaciones`)
  }

  // Comparar CSV vs BD (ignorando ganadores sin eliminador)
  const maxPositions = Math.max(csvEliminations.length, bdEliminations.length)
  
  for (let pos = maxPositions; pos >= 1; pos--) {
    const csvEntry = csvEliminations.find(e => e.position === pos)
    const bdEntry = bdEliminations.find(e => e.position === pos)
    
    // Comparar nombres eliminados
    if (csvEntry && bdEntry) {
      if (csvEntry.eliminatedName !== bdEntry.eliminatedName) {
        discrepancies.push({
          fecha: dateNumber,
          tipo: 'NOMBRE_DIFERENTE',
          posicion: pos,
          jugador: csvEntry.eliminatedName,
          descripcion: `Pos ${pos}: CSV="${csvEntry.eliminatedName}" vs BD="${bdEntry.eliminatedName}"`,
          csvData: csvEntry,
          bdData: bdEntry,
          severidad: 'CRITICA'
        })
      }
      
      // Comparar puntos
      if (csvEntry.points !== bdEntry.points) {
        discrepancies.push({
          fecha: dateNumber,
          tipo: 'PUNTOS_DIFERENTES',
          posicion: pos,
          jugador: csvEntry.eliminatedName,
          descripcion: `Pos ${pos}: Puntos CSV=${csvEntry.points} vs BD=${bdEntry.points}`,
          csvData: csvEntry,
          bdData: bdEntry,
          severidad: 'IMPORTANTE'
        })
      }
      
      // Comparar eliminadores (NO marcar como error si el ganador no tiene eliminador)
      if (pos > 1 && csvEntry.eliminatorName !== bdEntry.eliminatorName) {
        discrepancies.push({
          fecha: dateNumber,
          tipo: 'ELIMINADOR_DIFERENTE',
          posicion: pos,
          jugador: csvEntry.eliminatedName,
          descripcion: `Pos ${pos}: Eliminador CSV="${csvEntry.eliminatorName}" vs BD="${bdEntry.eliminatorName}"`,
          csvData: csvEntry,
          bdData: bdEntry,
          severidad: 'MENOR'
        })
      }
    } else if (!csvEntry && bdEntry) {
      discrepancies.push({
        fecha: dateNumber,
        tipo: 'FALTA_EN_CSV',
        posicion: pos,
        jugador: bdEntry.eliminatedName,
        descripcion: `Pos ${pos}: "${bdEntry.eliminatedName}" existe en BD pero no en CSV`,
        bdData: bdEntry,
        severidad: 'IMPORTANTE'
      })
    } else if (csvEntry && !bdEntry) {
      discrepancies.push({
        fecha: dateNumber,
        tipo: 'FALTA_EN_BD',
        posicion: pos,
        jugador: csvEntry.eliminatedName,
        descripcion: `Pos ${pos}: "${csvEntry.eliminatedName}" existe en CSV pero no en BD`,
        csvData: csvEntry,
        severidad: 'IMPORTANTE'
      })
    }
  }

  // Validar contra datos oficiales si están disponibles
  if (oficialEliminations) {
    console.log('\n📋 Comparando con datos oficiales de eliminaciones...')
    
    for (const oficial of oficialEliminations) {
      const oficialEliminado = mapNicknameToFullName(oficial.eliminatedPlayer)
      const oficialEliminador = oficial.eliminatorPlayer ? mapNicknameToFullName(oficial.eliminatorPlayer) : ''
      
      const csvEntry = csvEliminations.find(e => e.position === oficial.position)
      const bdEntry = bdEliminations.find(e => e.position === oficial.position)
      
      // Comparar con CSV
      if (csvEntry) {
        if (csvEntry.eliminatedName !== oficialEliminado) {
          discrepancies.push({
            fecha: dateNumber,
            tipo: 'OFICIAL_CSV_NOMBRE',
            posicion: oficial.position,
            jugador: oficialEliminado,
            descripcion: `Pos ${oficial.position}: OFICIAL="${oficialEliminado}" vs CSV="${csvEntry.eliminatedName}"`,
            csvData: csvEntry,
            oficialData: oficial,
            severidad: 'CRITICA'
          })
        }
      }
      
      // Comparar con BD
      if (bdEntry) {
        if (bdEntry.eliminatedName !== oficialEliminado) {
          discrepancies.push({
            fecha: dateNumber,
            tipo: 'OFICIAL_BD_NOMBRE',
            posicion: oficial.position,
            jugador: oficialEliminado,
            descripcion: `Pos ${oficial.position}: OFICIAL="${oficialEliminado}" vs BD="${bdEntry.eliminatedName}"`,
            bdData: bdEntry,
            oficialData: oficial,
            severidad: 'CRITICA'
          })
        }
      }
    }
  }

  return discrepancies
}

// Función principal
async function runCorrectedAnalysis() {
  console.log('🎯 ANÁLISIS CORREGIDO DEL TORNEO 28')
  console.log('Manejo correcto de ganadores y validación con datos oficiales')
  console.log('='.repeat(80))

  try {
    const tournament = await prisma.tournament.findFirst({
      where: { number: 28 }
    })

    if (!tournament) {
      throw new Error('Torneo 28 no encontrado')
    }

    const allDiscrepancies: DiscrepancyAnalysis[] = []

    // Validar Fecha 2 con datos oficiales
    console.log('\n🎯 FECHA 2 - VALIDACIÓN CON DATOS OFICIALES')
    const fecha2Discrepancies = await validateSpecificDate(
      tournament.id, 
      2, 
      'f2.csv',
      FECHA2_ELIMINACIONES_OFICIALES
    )
    allDiscrepancies.push(...fecha2Discrepancies)

    // Validar Fecha 8 (donde sabemos que hay problemas)
    console.log('\n🎯 FECHA 8 - VALIDACIÓN ESPECÍFICA')
    const fecha8Discrepancies = await validateSpecificDate(
      tournament.id, 
      8, 
      'f8.csv'
    )
    allDiscrepancies.push(...fecha8Discrepancies)

    // Información específica de Fecha 8
    console.log('\n📝 CORRECCIÓN FECHA 8:')
    console.log('Posición 2: Debe ser Fernando Peña (no Miguel Chiesa)')
    console.log('Posición 23: Milton Tapia eliminado por Juan Antonio Cortez')

    // Resumen de discrepancias
    console.log('\n' + '='.repeat(80))
    console.log('RESUMEN DE DISCREPANCIAS REALES')
    console.log('='.repeat(80))

    const byFecha = allDiscrepancies.reduce((acc, disc) => {
      if (!acc[disc.fecha]) acc[disc.fecha] = []
      acc[disc.fecha].push(disc)
      return acc
    }, {} as Record<number, DiscrepancyAnalysis[]>)

    Object.entries(byFecha).forEach(([fecha, discs]) => {
      console.log(`\n📅 FECHA ${fecha} - ${discs.length} DISCREPANCIAS:`)
      
      const criticas = discs.filter(d => d.severidad === 'CRITICA')
      const importantes = discs.filter(d => d.severidad === 'IMPORTANTE')
      const menores = discs.filter(d => d.severidad === 'MENOR')
      
      if (criticas.length > 0) {
        console.log(`🚨 CRÍTICAS (${criticas.length}):`)
        criticas.forEach(d => console.log(`   - ${d.descripcion}`))
      }
      
      if (importantes.length > 0) {
        console.log(`⚠️  IMPORTANTES (${importantes.length}):`)
        importantes.forEach(d => console.log(`   - ${d.descripcion}`))
      }
      
      if (menores.length > 0) {
        console.log(`ℹ️  MENORES (${menores.length}):`)
        menores.forEach(d => console.log(`   - ${d.descripcion}`))
      }
    })

    // Estadísticas finales
    console.log('\n' + '='.repeat(80))
    console.log('ESTADÍSTICAS CORREGIDAS')
    console.log('='.repeat(80))

    const criticas = allDiscrepancies.filter(d => d.severidad === 'CRITICA').length
    const importantes = allDiscrepancies.filter(d => d.severidad === 'IMPORTANTE').length
    const menores = allDiscrepancies.filter(d => d.severidad === 'MENOR').length

    console.log(`🚨 Discrepancias críticas: ${criticas}`)
    console.log(`⚠️  Discrepancias importantes: ${importantes}`)
    console.log(`ℹ️  Discrepancias menores: ${menores}`)
    console.log(`📊 Total discrepancias reales: ${allDiscrepancies.length}`)

    if (criticas === 0) {
      console.log('\n✅ EXCELENTE: No hay discrepancias críticas')
      console.log('Los datos fundamentales están correctos')
    } else {
      console.log('\n🔧 ACCIÓN REQUERIDA: Corregir discrepancias críticas')
    }

  } catch (error) {
    console.error('❌ Error durante el análisis:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar análisis
runCorrectedAnalysis()
  .catch(console.error)