#!/usr/bin/env tsx

/**
 * Validación final contra t11.jpeg con nombres corregidos
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Datos oficiales de t11.jpeg
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

// Mapeo corregido para nombres con espacios
function normalizePlayerName(oficialName: string): string {
  const nameMap: Record<string, string> = {
    'Andres Benites': 'Mono Benites',
    'Juan Fernando Ochoa': 'Juan Fernando  Ochoa', // Doble espacio en BD
    'Jose Luis Toral': 'Jose Luis  Toral' // Doble espacio en BD
  }
  return nameMap[oficialName] || oficialName
}

async function validateFinalT11() {
  console.log('🎯 VALIDACIÓN FINAL CONTRA T11.JPEG')
  console.log('Con nombres corregidos y mapeos de espacios')
  console.log('='.repeat(100))

  try {
    // Obtener tournament
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

    // Obtener todas las fechas completadas
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
        .sort((a, b) => a - b) // Ascendente para encontrar los menores
      
      // Elimina 1 y 2 (peores puntuaciones)
      const elimina1Count = pointsByDate.length > 10 ? pointsByDate[0] || 0 : 0
      const elimina2Count = pointsByDate.length > 10 ? pointsByDate[1] || 0 : 0
      
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

    // Crear mapa del sistema
    const sistemaMap = new Map()
    sistemaRankings.forEach(player => {
      sistemaMap.set(player.playerName, {
        total: player.totalPoints,
        elimina1: player.elimina1Count,
        elimina2: player.elimina2Count,
        final: player.finalScore
      })
    })

    // Comparar con datos oficiales
    console.log('\nCUADRO COMPARATIVO FINAL:')
    console.log('RANK | JUGADOR               | TOTAL        | ELIMINA1     | ELIMINA2     | FINAL        | STATUS')
    console.log('     |                       | IMG | SIS    | IMG | SIS    | IMG | SIS    | IMG | SIS    |')
    console.log('-----|----------------------|--------------|--------------|--------------|--------------|--------')

    let coincidenciasExactas = 0
    let discrepanciasTotal = 0

    FECHA11_OFICIAL.forEach(oficial => {
      const normalizedName = normalizePlayerName(oficial.player)
      const sistemaData = sistemaMap.get(normalizedName)
      
      let status = '✅ OK'
      let hasDiscrepancy = false
      
      if (!sistemaData) {
        status = '❌ NO ENCONTRADO'
        hasDiscrepancy = true
      } else {
        if (sistemaData.total !== oficial.total ||
            sistemaData.elimina1 !== oficial.elimina1 ||
            sistemaData.elimina2 !== oficial.elimina2 ||
            sistemaData.final !== oficial.final) {
          status = '❌ DIFF'
          hasDiscrepancy = true
        }
      }
      
      if (!hasDiscrepancy) {
        coincidenciasExactas++
      } else {
        discrepanciasTotal++
      }

      const totalDiff = sistemaData ? (sistemaData.total - oficial.total) : -oficial.total
      const e1Diff = sistemaData ? (sistemaData.elimina1 - oficial.elimina1) : -oficial.elimina1
      const e2Diff = sistemaData ? (sistemaData.elimina2 - oficial.elimina2) : -oficial.elimina2
      const fDiff = sistemaData ? (sistemaData.final - oficial.final) : -oficial.final

      const totalStr = totalDiff !== 0 ? `(${totalDiff > 0 ? '+' : ''}${totalDiff})` : ''
      const e1Str = e1Diff !== 0 ? `(${e1Diff > 0 ? '+' : ''}${e1Diff})` : ''
      const e2Str = e2Diff !== 0 ? `(${e2Diff > 0 ? '+' : ''}${e2Diff})` : ''
      const fStr = fDiff !== 0 ? `(${fDiff > 0 ? '+' : ''}${fDiff})` : ''

      console.log(
        `${oficial.rank.toString().padStart(4)} | ${oficial.player.padEnd(21)} | ` +
        `${oficial.total.toString().padStart(3)} | ${(sistemaData?.total?.toString() || '-').padStart(3)} ${totalStr.padEnd(4)} | ` +
        `${oficial.elimina1.toString().padStart(3)} | ${(sistemaData?.elimina1?.toString() || '-').padStart(3)} ${e1Str.padEnd(4)} | ` +
        `${oficial.elimina2.toString().padStart(3)} | ${(sistemaData?.elimina2?.toString() || '-').padStart(3)} ${e2Str.padEnd(4)} | ` +
        `${oficial.final.toString().padStart(3)} | ${(sistemaData?.final?.toString() || '-').padStart(3)} ${fStr.padEnd(4)} | ` +
        `${status}`
      )
    })

    // Resumen final
    console.log('\n' + '='.repeat(100))
    console.log('RESUMEN FINAL DE VALIDACIÓN')
    console.log('='.repeat(100))

    const porcentajePrecision = ((coincidenciasExactas / FECHA11_OFICIAL.length) * 100).toFixed(1)
    
    console.log(`✅ Coincidencias exactas: ${coincidenciasExactas}/${FECHA11_OFICIAL.length} jugadores (${porcentajePrecision}%)`)
    console.log(`❌ Discrepancias restantes: ${discrepanciasTotal}`)

    if (coincidenciasExactas === FECHA11_OFICIAL.length) {
      console.log('\n🎉 PERFECTO: Sistema 100% sincronizado con imagen oficial t11.jpeg')
      console.log('✅ Todos los totales, ELIMINA 1, ELIMINA 2 y puntuación final coinciden')
    } else if (coincidenciasExactas >= FECHA11_OFICIAL.length * 0.9) {
      console.log('\n👍 EXCELENTE: Sistema 90%+ sincronizado')
      console.log('⚠️  Pocas discrepancias menores restantes')
    } else {
      console.log('\n🔧 REQUIERE ATENCIÓN: Múltiples discrepancias encontradas')
      console.log('📋 Revisar datos específicos de jugadores con diferencias')
    }

  } catch (error) {
    console.error('❌ Error durante la validación:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar validación
validateFinalT11()
  .catch(console.error)