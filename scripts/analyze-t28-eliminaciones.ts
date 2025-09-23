#!/usr/bin/env tsx

/**
 * Análisis detallado de eliminaciones Fecha 1 vs datos oficiales
 * Compara eliminaciones.png con CSV y Base de Datos
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'
import { T28_IMAGE_DATA, NICKNAME_MAPPING } from '../data/t28-image-data'
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

interface EliminationComparison {
  position: number
  oficialEliminado: string
  oficialEliminador: string
  csvEliminado?: string
  csvEliminador?: string
  csvPuntos?: number
  bdEliminado?: string
  bdEliminador?: string
  bdPuntos?: number
  status: 'MATCH' | 'MISMATCH' | 'MISSING'
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

// Analizar eliminaciones fecha 1
async function analyzeDate1Eliminations() {
  console.log('🔍 ANÁLISIS DETALLADO - ELIMINACIONES FECHA 1')
  console.log('Comparando eliminaciones.png vs CSV vs Base de Datos')
  console.log('='.repeat(80))

  try {
    // Obtener tournament
    const tournament = await prisma.tournament.findFirst({
      where: { number: 28 }
    })

    if (!tournament) {
      throw new Error('Torneo 28 no encontrado')
    }

    // Cargar datos
    const csvRecords = loadCSV('t28f01.csv')
    const bdEliminations = await getBDEliminations(tournament.id, 1)
    const oficialEliminations = T28_IMAGE_DATA.fecha1_eliminaciones_oficiales

    // Crear mapas para fácil búsqueda
    const csvMap = new Map()
    csvRecords.forEach(record => {
      csvMap.set(parseInt(record.POSICION), {
        eliminado: mapCSVNameToDBName(record.ELIMINADO),
        eliminador: record.ELMINADOR ? mapCSVNameToDBName(record.ELMINADOR) : '',
        puntos: parseInt(record.PUNTOS)
      })
    })

    const bdMap = new Map()
    bdEliminations.forEach(elim => {
      bdMap.set(elim.position, {
        eliminado: elim.eliminatedName,
        eliminador: elim.eliminatorName,
        puntos: elim.points
      })
    })

    // Comparar cada eliminación oficial
    console.log('\nCOMPARACIÓN DETALLADA POR POSICIÓN:')
    console.log('POS | OFICIAL ELIMINADO    | OFICIAL ELIM. | CSV ELIMINADO        | CSV ELIM. | BD ELIMINADO         | BD ELIM.  | STATUS')
    console.log('----|----------------------|---------------|----------------------|-----------|----------------------|-----------|--------')

    const comparisons: EliminationComparison[] = []

    oficialEliminations.forEach(oficial => {
      const oficialEliminado = mapNicknameToFullName(oficial.eliminatedPlayer)
      const oficialEliminador = mapNicknameToFullName(oficial.eliminatorPlayer)
      
      const csvData = csvMap.get(oficial.position)
      const bdData = bdMap.get(oficial.position)

      let status: 'MATCH' | 'MISMATCH' | 'MISSING' = 'MATCH'
      
      if (!csvData || !bdData) {
        status = 'MISSING'
      } else if (
        csvData.eliminado !== oficialEliminado ||
        bdData.eliminado !== oficialEliminado ||
        csvData.eliminador !== oficialEliminador ||
        bdData.eliminador !== oficialEliminador
      ) {
        status = 'MISMATCH'
      }

      const comparison: EliminationComparison = {
        position: oficial.position,
        oficialEliminado,
        oficialEliminador,
        csvEliminado: csvData?.eliminado,
        csvEliminador: csvData?.eliminador,
        csvPuntos: csvData?.puntos,
        bdEliminado: bdData?.eliminado,
        bdEliminador: bdData?.eliminador,
        bdPuntos: bdData?.puntos,
        status
      }

      comparisons.push(comparison)

      // Imprimir fila
      console.log(
        `${oficial.position.toString().padStart(3)} | ` +
        `${oficialEliminado.padEnd(20)} | ` +
        `${oficialEliminador.padEnd(13)} | ` +
        `${(csvData?.eliminado || '-').padEnd(20)} | ` +
        `${(csvData?.eliminador || '-').padEnd(9)} | ` +
        `${(bdData?.eliminado || '-').padEnd(20)} | ` +
        `${(bdData?.eliminador || '-').padEnd(9)} | ` +
        `${status}`
      )
    })

    // Resumen de discrepancias
    console.log('\n' + '='.repeat(80))
    console.log('RESUMEN DE DISCREPANCIAS:')
    console.log('='.repeat(80))

    const matches = comparisons.filter(c => c.status === 'MATCH').length
    const mismatches = comparisons.filter(c => c.status === 'MISMATCH').length
    const missing = comparisons.filter(c => c.status === 'MISSING').length

    console.log(`✅ Coincidencias exactas: ${matches}/${comparisons.length}`)
    console.log(`❌ Discrepancias: ${mismatches}`)
    console.log(`⚠️  Datos faltantes: ${missing}`)

    if (mismatches > 0) {
      console.log('\nDISCREPANCIAS DETALLADAS:')
      comparisons
        .filter(c => c.status === 'MISMATCH')
        .forEach(c => {
          console.log(`\nPosición ${c.position}:`)
          console.log(`  Oficial: ${c.oficialEliminado} eliminado por ${c.oficialEliminador}`)
          console.log(`  CSV:     ${c.csvEliminado} eliminado por ${c.csvEliminador}`)
          console.log(`  BD:      ${c.bdEliminado} eliminado por ${c.bdEliminador}`)
        })
    }

    // Verificar si CSV y BD coinciden entre sí
    console.log('\n' + '='.repeat(80))
    console.log('CONSISTENCIA CSV vs BD:')
    console.log('='.repeat(80))

    let csvBdMatches = 0
    comparisons.forEach(c => {
      if (c.csvEliminado === c.bdEliminado && c.csvEliminador === c.bdEliminador) {
        csvBdMatches++
      }
    })

    console.log(`CSV y BD coinciden en: ${csvBdMatches}/${comparisons.length} eliminaciones`)
    if (csvBdMatches === comparisons.length) {
      console.log('✅ CSV y Base de Datos están perfectamente sincronizados')
    } else {
      console.log('⚠️  Hay inconsistencias entre CSV y Base de Datos')
    }

  } catch (error) {
    console.error('❌ Error durante el análisis:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar análisis
analyzeDate1Eliminations()
  .catch(console.error)