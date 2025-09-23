#!/usr/bin/env tsx

/**
 * Identificar eliminaciones mal asignadas entre jugadores
 * Enfoque en intercambio de puntos entre:
 * - Jose Luis Toral (+19 pts extras)
 * - Sean Willis (-12 pts faltantes)
 * - Fernando Peña (-6 pts faltantes)
 * - Miguel Chiesa (+10 pts extras)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Discrepancias específicas
const DISCREPANCIAS = {
  'Jose Luis  Toral': { actual: 93, esperado: 74, diferencia: +19 },
  'Sean Willis': { actual: 70, esperado: 82, diferencia: -12 },
  'Fernando Peña': { actual: 144, esperado: 150, diferencia: -6 },
  'Miguel Chiesa': { actual: 159, esperado: 149, diferencia: +10 },
  'Juan Antonio Cortez': { actual: 117, esperado: 119, diferencia: -2 }
}

async function identifyMisassignedEliminations() {
  console.log('🔍 IDENTIFICACIÓN DE ELIMINACIONES MAL ASIGNADAS')
  console.log('Buscando intercambios específicos de puntos entre jugadores')
  console.log('='.repeat(100))

  try {
    // Obtener torneo 28
    const tournament = await prisma.tournament.findFirst({
      where: { number: 28 }
    })

    if (!tournament) {
      throw new Error('Torneo 28 no encontrado')
    }

    console.log('\n📊 DISCREPANCIAS OBJETIVO:')
    Object.entries(DISCREPANCIAS).forEach(([name, data]) => {
      const status = data.diferencia > 0 ? 'EXCESO' : 'FALTANTE'
      console.log(`${name}: ${data.diferencia > 0 ? '+' : ''}${data.diferencia} pts (${status})`)
    })

    // Obtener todas las fechas con eliminaciones
    const gameDates = await prisma.gameDate.findMany({
      where: { 
        tournamentId: tournament.id,
        status: 'completed'
      },
      include: {
        eliminations: {
          include: {
            eliminatedPlayer: true,
            eliminatorPlayer: true
          },
          orderBy: { position: 'desc' }
        }
      },
      orderBy: { dateNumber: 'asc' }
    })

    // Buscar jugadores problemáticos
    const players = {}
    for (const playerName of Object.keys(DISCREPANCIAS)) {
      const [firstName, ...lastNameParts] = playerName.split(' ')
      const lastName = lastNameParts.join(' ')
      
      const player = await prisma.player.findFirst({
        where: {
          OR: [
            { firstName, lastName },
            { firstName, lastName: ` ${lastName}` },
            { firstName, lastName: `  ${lastName}` }
          ]
        }
      })
      
      if (player) {
        players[playerName] = player
        console.log(`✅ ${playerName}: ${player.id}`)
      } else {
        console.log(`❌ ${playerName}: No encontrado`)
      }
    }

    console.log('\n🔍 ANÁLISIS FECHA POR FECHA:')
    console.log('Buscando eliminaciones que podrían estar intercambiadas...')

    // Analizar cada fecha
    for (const gameDate of gameDates) {
      console.log(`\n📅 FECHA ${gameDate.dateNumber}:`)
      
      // Obtener eliminaciones de jugadores problemáticos en esta fecha
      const problematicEliminations = gameDate.eliminations.filter(elim => {
        const playerName = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`
        return Object.keys(DISCREPANCIAS).includes(playerName) ||
               Object.keys(DISCREPANCIAS).includes(playerName.replace('  ', ' '))
      })

      if (problematicEliminations.length > 0) {
        console.log(`   Eliminaciones de jugadores problemáticos:`)
        problematicEliminations.forEach(elim => {
          const playerName = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`
          console.log(`   - ${playerName}: Pos ${elim.position} = ${elim.points} pts (ID: ${elim.id})`)
        })

        // Buscar patrones de intercambio
        if (problematicEliminations.length >= 2) {
          console.log(`   🔄 POSIBLE INTERCAMBIO en Fecha ${gameDate.dateNumber}:`)
          
          // Verificar si hay combinaciones que sumen las diferencias
          for (let i = 0; i < problematicEliminations.length; i++) {
            for (let j = i + 1; j < problematicEliminations.length; j++) {
              const elim1 = problematicEliminations[i]
              const elim2 = problematicEliminations[j]
              
              const player1 = `${elim1.eliminatedPlayer.firstName} ${elim1.eliminatedPlayer.lastName}`
              const player2 = `${elim2.eliminatedPlayer.firstName} ${elim2.eliminatedPlayer.lastName}`
              
              const diff = Math.abs(elim1.points - elim2.points)
              
              console.log(`      ${player1} (${elim1.points} pts) ↔ ${player2} (${elim2.points} pts) = ${diff} pts diferencia`)
              
              // Verificar si este intercambio ayudaría
              const disc1 = DISCREPANCIAS[player1] || DISCREPANCIAS[player1.replace('  ', ' ')]
              const disc2 = DISCREPANCIAS[player2] || DISCREPANCIAS[player2.replace('  ', ' ')]
              
              if (disc1 && disc2) {
                const newDiff1 = disc1.diferencia + (elim2.points - elim1.points)
                const newDiff2 = disc2.diferencia + (elim1.points - elim2.points)
                
                if (Math.abs(newDiff1) < Math.abs(disc1.diferencia) && Math.abs(newDiff2) < Math.abs(disc2.diferencia)) {
                  console.log(`      ⭐ INTERCAMBIO BENEFICIOSO:`)
                  console.log(`         ${player1}: ${disc1.diferencia} → ${newDiff1}`)
                  console.log(`         ${player2}: ${disc2.diferencia} → ${newDiff2}`)
                }
              }
            }
          }
        }
      }
    }

    // Análisis específico: buscar eliminaciones de 19, 12, y 6 puntos
    console.log('\n🎯 BÚSQUEDA ESPECÍFICA DE PUNTOS:')
    console.log('Buscando eliminaciones de 19, 12, y 6 puntos que podrían estar mal asignadas...')

    const targetPoints = [19, 12, 6, 10, 2]
    
    for (const points of targetPoints) {
      console.log(`\n   Eliminaciones de ${points} puntos:`)
      
      for (const gameDate of gameDates) {
        const eliminationsWithPoints = gameDate.eliminations.filter(e => e.points === points)
        
        eliminationsWithPoints.forEach(elim => {
          const playerName = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName}`
          const isProblematic = Object.keys(DISCREPANCIAS).includes(playerName) ||
                               Object.keys(DISCREPANCIAS).includes(playerName.replace('  ', ' '))
          
          const marker = isProblematic ? '⚠️ ' : '   '
          console.log(`   ${marker}Fecha ${gameDate.dateNumber}: ${playerName} - Pos ${elim.position} (ID: ${elim.id})`)
        })
      }
    }

    // Sugerencias de corrección
    console.log('\n' + '='.repeat(100))
    console.log('🔧 SUGERENCIAS DE CORRECCIÓN')
    console.log('='.repeat(100))
    
    console.log('\nBasado en el análisis, se necesita:')
    console.log('1. Jose Luis Toral debe PERDER 19 puntos')
    console.log('2. Sean Willis debe GANAR 12 puntos') 
    console.log('3. Fernando Peña debe GANAR 6 puntos')
    console.log('4. Miguel Chiesa debe PERDER 10 puntos')
    console.log('5. Juan Antonio Cortez debe GANAR 2 puntos')
    
    console.log('\nTOTAL: Se necesitan intercambiar 29 puntos de exceso → 20 puntos faltantes')
    
    console.log('\nAcciones recomendadas:')
    console.log('- Identificar eliminaciones específicas mal asignadas')
    console.log('- Realizar intercambios entre jugadores con exceso/déficit')
    console.log('- Re-validar totales después de cada corrección')

  } catch (error) {
    console.error('❌ Error durante el análisis:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar análisis
identifyMisassignedEliminations()
  .catch(console.error)