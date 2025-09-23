#!/usr/bin/env tsx

/**
 * Validación de totales Fecha 11 vs imagen oficial t11.jpeg
 * Compara Total, Elimina 1, Elimina 2 y Final entre sistema y imagen oficial
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Datos oficiales extraídos de t11.jpeg
const FECHA11_OFICIAL = [
  { rank: 1, player: "Roddy Naranjo", fecha11: 16, total: 196, elimina1: 4, elimina2: 7, final: 185 },
  { rank: 2, player: "Freddy Lopez", fecha11: 21, total: 163, elimina1: 0, elimina2: 1, final: 162 },
  { rank: 3, player: "Andres Benites", fecha11: 7, total: 160, elimina1: 5, elimina2: 7, final: 148 },
  { rank: 4, player: "Fernando Peña", fecha11: 10, total: 150, elimina1: 2, elimina2: 5, final: 143 },
  { rank: 5, player: "Miguel Chiesa", fecha11: 5, total: 149, elimina1: 4, elimina2: 4, final: 141 },
  { rank: 6, player: "Diego Behar", fecha11: 1, total: 143, elimina1: 1, elimina2: 4, final: 138 },
  { rank: 7, player: "Ruben Cadena", fecha11: 5, total: 141, elimina1: 3, elimina2: 4, final: 134 },
  { rank: 8, player: "Daniel Vela", fecha11: 24, total: 136, elimina1: 3, elimina2: 6, final: 127 },
  { rank: 9, player: "Joffre Palacios", fecha11: 15, total: 131, elimina1: 1, elimina2: 2, final: 128 },
  { rank: 10, player: "Jorge Tamayo", fecha11: 27, total: 121, elimina1: 1, elimina2: 3, final: 117 },
  { rank: 11, player: "Juan Antonio Cortez", fecha11: 11, total: 119, elimina1: 2, elimina2: 2, final: 115 },
  { rank: 12, player: "Juan Fernando Ochoa", fecha11: 2, total: 117, elimina1: 0, elimina2: 2, final: 115 },
  { rank: 13, player: "Juan Tapia", fecha11: 0, total: 114, elimina1: 0, elimina2: 2, final: 112 },
  { rank: 14, player: "Carlos Chacón", fecha11: 18, total: 111, elimina1: 0, elimina2: 0, final: 111 },
  { rank: 15, player: "Javier Martinez", fecha11: 9, total: 108, elimina1: 0, elimina2: 0, final: 108 },
  { rank: 16, player: "Damian Amador", fecha11: 8, total: 107, elimina1: 6, elimina2: 7, final: 94 },
  { rank: 17, player: "Milton Tapia", fecha11: 14, total: 101, elimina1: 1, elimina2: 1, final: 99 },
  { rank: 18, player: "Sean Willis", fecha11: 6, total: 82, elimina1: 0, elimina2: 1, final: 81 },
  { rank: 19, player: "Jose Luis Toral", fecha11: 17, total: 74, elimina1: 0, elimina2: 0, final: 74 }
]

interface PlayerComparison {
  playerName: string
  rank: number
  // Datos oficiales
  oficialTotal: number
  oficialElimina1: number
  oficialElimina2: number
  oficialFinal: number
  // Datos del sistema
  sistemaTotal?: number
  sistemaElimina1?: number
  sistemaElimina2?: number
  sistemaFinal?: number
  // Discrepancias
  totalDiff: number
  elimina1Diff: number
  elimina2Diff: number
  finalDiff: number
  hasDiscrepancy: boolean
}

async function validateFecha11Totals() {
  console.log('🎯 VALIDACIÓN TOTALES FECHA 11 vs IMAGEN OFICIAL t11.jpeg')
  console.log('Comparando Total, Elimina 1, Elimina 2 y Final')
  console.log('='.repeat(120))

  try {
    // Obtener ranking del sistema directamente de la BD
    const tournament = await prisma.tournament.findFirst({
      where: { number: 28 },
      include: {
        tournamentParticipants: {
          include: {
            player: true
          }
        }
      }
    })

    if (!tournament) {
      throw new Error('Torneo 28 no encontrado')
    }

    // Obtener todas las fechas del torneo
    const gameDates = await prisma.gameDate.findMany({
      where: { 
        tournamentId: tournament.id,
        status: 'completed'
      },
      include: {
        eliminations: {
          include: {
            eliminatedPlayer: true
          }
        }
      },
      orderBy: { dateNumber: 'asc' }
    })

    // Calcular totales por jugador
    const sistemaRankings = tournament.tournamentParticipants.map(participant => {
      const playerName = `${participant.player.firstName} ${participant.player.lastName}`
      
      // Calcular puntos totales
      const playerEliminations = gameDates.flatMap(date => 
        date.eliminations.filter(e => e.eliminatedPlayerId === participant.playerId)
      )
      
      const totalPoints = playerEliminations.reduce((sum, e) => sum + e.points, 0)
      
      // Ordenar puntos por fecha para ELIMINA 2
      const pointsByDate = playerEliminations
        .map(e => e.points)
        .sort((a, b) => b - a) // Descendente
      
      // Elimina 1 y 2 (peores puntuaciones)
      const elimina1Count = pointsByDate.length > 10 ? Math.min(...pointsByDate.slice(-1)) : 0
      const elimina2Count = pointsByDate.length > 10 ? Math.min(...pointsByDate.slice(-2, -1)) : 0
      
      // Final score (total - elimina1 - elimina2)
      const finalScore = pointsByDate.length > 10 ? 
        totalPoints - elimina1Count - elimina2Count : totalPoints
      
      return {
        playerName,
        totalPoints,
        elimina1Count,
        elimina2Count,
        finalScore
      }
    })

    // Crear mapa del sistema por nombre de jugador
    const sistemaMap = new Map()
    sistemaRankings.forEach(player => {
      sistemaMap.set(player.playerName, {
        total: player.totalPoints,
        elimina1: player.elimina1Count || 0,
        elimina2: player.elimina2Count || 0,
        final: player.finalScore || player.totalPoints
      })
    })

    // Comparar cada jugador
    const comparisons: PlayerComparison[] = []

    FECHA11_OFICIAL.forEach(oficial => {
      const sistemaData = sistemaMap.get(oficial.player)
      
      const totalDiff = sistemaData ? (sistemaData.total - oficial.total) : -oficial.total
      const elimina1Diff = sistemaData ? (sistemaData.elimina1 - oficial.elimina1) : -oficial.elimina1
      const elimina2Diff = sistemaData ? (sistemaData.elimina2 - oficial.elimina2) : -oficial.elimina2
      const finalDiff = sistemaData ? (sistemaData.final - oficial.final) : -oficial.final

      const hasDiscrepancy = totalDiff !== 0 || elimina1Diff !== 0 || elimina2Diff !== 0 || finalDiff !== 0

      comparisons.push({
        playerName: oficial.player,
        rank: oficial.rank,
        oficialTotal: oficial.total,
        oficialElimina1: oficial.elimina1,
        oficialElimina2: oficial.elimina2,
        oficialFinal: oficial.final,
        sistemaTotal: sistemaData?.total,
        sistemaElimina1: sistemaData?.elimina1,
        sistemaElimina2: sistemaData?.elimina2,
        sistemaFinal: sistemaData?.final,
        totalDiff,
        elimina1Diff,
        elimina2Diff,
        finalDiff,
        hasDiscrepancy
      })
    })

    // Imprimir tabla comparativa
    console.log('\nCUADRO COMPARATIVO - FECHA 11 TOTALES:')
    console.log('RANK | JUGADOR               | TOTAL        | ELIMINA1     | ELIMINA2     | FINAL        | STATUS')
    console.log('     |                       | IMG | SIS    | IMG | SIS    | IMG | SIS    | IMG | SIS    |')
    console.log('-----|----------------------|--------------|--------------|--------------|--------------|--------')

    comparisons.forEach(comp => {
      const status = comp.hasDiscrepancy ? '❌ DIFF' : '✅ OK'
      const totalStatus = comp.totalDiff !== 0 ? `(${comp.totalDiff > 0 ? '+' : ''}${comp.totalDiff})` : ''
      const e1Status = comp.elimina1Diff !== 0 ? `(${comp.elimina1Diff > 0 ? '+' : ''}${comp.elimina1Diff})` : ''
      const e2Status = comp.elimina2Diff !== 0 ? `(${comp.elimina2Diff > 0 ? '+' : ''}${comp.elimina2Diff})` : ''
      const fStatus = comp.finalDiff !== 0 ? `(${comp.finalDiff > 0 ? '+' : ''}${comp.finalDiff})` : ''

      console.log(
        `${comp.rank.toString().padStart(4)} | ${comp.playerName.padEnd(21)} | ` +
        `${comp.oficialTotal.toString().padStart(3)} | ${(comp.sistemaTotal?.toString() || '-').padStart(3)} ${totalStatus.padEnd(4)} | ` +
        `${comp.oficialElimina1.toString().padStart(3)} | ${(comp.sistemaElimina1?.toString() || '-').padStart(3)} ${e1Status.padEnd(4)} | ` +
        `${comp.oficialElimina2.toString().padStart(3)} | ${(comp.sistemaElimina2?.toString() || '-').padStart(3)} ${e2Status.padEnd(4)} | ` +
        `${comp.oficialFinal.toString().padStart(3)} | ${(comp.sistemaFinal?.toString() || '-').padStart(3)} ${fStatus.padEnd(4)} | ` +
        `${status}`
      )
    })

    // Resumen de discrepancias
    console.log('\n' + '='.repeat(120))
    console.log('RESUMEN DE DISCREPANCIAS:')
    console.log('='.repeat(120))

    const totalDiscrepancies = comparisons.filter(c => c.hasDiscrepancy).length
    const perfectMatches = comparisons.length - totalDiscrepancies

    console.log(`✅ Coincidencias exactas: ${perfectMatches}/${comparisons.length} jugadores`)
    console.log(`❌ Jugadores con discrepancias: ${totalDiscrepancies}`)

    if (totalDiscrepancies > 0) {
      console.log('\nDISCREPANCIAS POR TIPO:')
      
      const totalDiffs = comparisons.filter(c => c.totalDiff !== 0).length
      const elimina1Diffs = comparisons.filter(c => c.elimina1Diff !== 0).length
      const elimina2Diffs = comparisons.filter(c => c.elimina2Diff !== 0).length
      const finalDiffs = comparisons.filter(c => c.finalDiff !== 0).length

      console.log(`- Total de puntos: ${totalDiffs} diferencias`)
      console.log(`- Elimina 1: ${elimina1Diffs} diferencias`)
      console.log(`- Elimina 2: ${elimina2Diffs} diferencias`)
      console.log(`- Puntuación final: ${finalDiffs} diferencias`)

      console.log('\nJUGADORES CON DISCREPANCIAS:')
      comparisons
        .filter(c => c.hasDiscrepancy)
        .forEach(c => {
          console.log(`\n${c.playerName}:`)
          if (c.totalDiff !== 0) console.log(`  Total: Oficial=${c.oficialTotal}, Sistema=${c.sistemaTotal} (Diff: ${c.totalDiff})`)
          if (c.elimina1Diff !== 0) console.log(`  Elimina1: Oficial=${c.oficialElimina1}, Sistema=${c.sistemaElimina1} (Diff: ${c.elimina1Diff})`)
          if (c.elimina2Diff !== 0) console.log(`  Elimina2: Oficial=${c.oficialElimina2}, Sistema=${c.sistemaElimina2} (Diff: ${c.elimina2Diff})`)
          if (c.finalDiff !== 0) console.log(`  Final: Oficial=${c.oficialFinal}, Sistema=${c.sistemaFinal} (Diff: ${c.finalDiff})`)
        })
    }

    // Precisión por categoría
    console.log('\n' + '='.repeat(120))
    console.log('PRECISIÓN POR CATEGORÍA:')
    console.log('='.repeat(120))

    const totalPrecision = ((comparisons.length - comparisons.filter(c => c.totalDiff !== 0).length) / comparisons.length * 100).toFixed(1)
    const elimina1Precision = ((comparisons.length - comparisons.filter(c => c.elimina1Diff !== 0).length) / comparisons.length * 100).toFixed(1)
    const elimina2Precision = ((comparisons.length - comparisons.filter(c => c.elimina2Diff !== 0).length) / comparisons.length * 100).toFixed(1)
    const finalPrecision = ((comparisons.length - comparisons.filter(c => c.finalDiff !== 0).length) / comparisons.length * 100).toFixed(1)

    console.log(`📊 Total de puntos: ${totalPrecision}% precisión`)
    console.log(`📊 Elimina 1: ${elimina1Precision}% precisión`)
    console.log(`📊 Elimina 2: ${elimina2Precision}% precisión`)
    console.log(`📊 Puntuación final: ${finalPrecision}% precisión`)

  } catch (error) {
    console.error('❌ Error durante la validación:', error)
  }
}

// Ejecutar validación
validateFecha11Totals()
  .catch(console.error)