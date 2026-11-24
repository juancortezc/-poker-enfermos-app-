#!/usr/bin/env tsx

/**
 * Análisis detallado fecha por fecha de jugadores con discrepancias
 * Enfoque en: Juan Antonio Cortez (+26), Sean Willis (+17), Jose Luis Toral (+19), Miguel Chiesa (+10)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Datos oficiales esperados por jugador (extraídos de t11.jpeg)
const TOTALES_OFICIALES = {
  'Juan Antonio Cortez': 119,
  'Sean Willis': 82,
  'Jose Luis  Toral': 74, // Nombre con doble espacio en BD
  'Miguel Chiesa': 149,
  'Fernando Peña': 150
}

async function analyzeDiscrepancyPlayers() {
  console.log('🔍 ANÁLISIS DETALLADO - JUGADORES CON DISCREPANCIAS')
  console.log('Revisión fecha por fecha para identificar eliminaciones incorrectas')
  console.log('='.repeat(100))

  try {
    // Obtener torneo 28
    const tournament = await prisma.tournament.findFirst({
      where: { number: 28 }
    })

    if (!tournament) {
      throw new Error('Torneo 28 no encontrado')
    }

    // Obtener todas las fechas completadas con eliminaciones
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

    console.log(`Fechas completadas encontradas: ${gameDates.length}`)
    
    // Analizar cada jugador problemático
    for (const [playerName, expectedTotal] of Object.entries(TOTALES_OFICIALES)) {
      console.log('\n' + '='.repeat(80))
      console.log(`📊 ANÁLISIS DETALLADO: ${playerName}`)
      console.log(`Total oficial esperado: ${expectedTotal} puntos`)
      console.log('='.repeat(80))

      // Buscar el jugador
      const player = await prisma.player.findFirst({
        where: {
          OR: [
            { 
              firstName: playerName.split(' ')[0], 
              lastName: playerName.split(' ').slice(1).join(' ') 
            },
            { 
              firstName: playerName.split(' ')[0], 
              lastName: ` ${playerName.split(' ').slice(1).join(' ')}` 
            },
            { 
              firstName: playerName.split(' ')[0], 
              lastName: `  ${playerName.split(' ').slice(1).join(' ')}` 
            }
          ]
        }
      })

      if (!player) {
        console.log(`❌ Jugador "${playerName}" no encontrado en BD`)
        continue
      }

      console.log(`✅ Jugador encontrado: ${player.firstName} ${player.lastName} (ID: ${player.id})`)

      // Obtener todas las eliminaciones del jugador
      const playerEliminations = []
      let totalPuntos = 0

      console.log('\nELIMINACIONES POR FECHA:')
      console.log('FECHA | POSICIÓN | PUNTOS | ELIMINADOR                | HORA')
      console.log('------|----------|--------|--------------------------|---------')

      for (const gameDate of gameDates) {
        const eliminations = gameDate.eliminations.filter(e => e.eliminatedPlayerId === player.id)
        
        for (const elimination of eliminations) {
          const eliminatorName = elimination.eliminatorPlayer ? 
            `${elimination.eliminatorPlayer.firstName} ${elimination.eliminatorPlayer.lastName}` :
            'GANADOR'
          
          console.log(
            `${gameDate.dateNumber.toString().padStart(5)} | ` +
            `${elimination.position.toString().padStart(8)} | ` +
            `${elimination.points.toString().padStart(6)} | ` +
            `${eliminatorName.padEnd(25)} | ` +
            `${elimination.eliminationTime || 'N/A'}`
          )
          
          totalPuntos += elimination.points
          playerEliminations.push({
            fecha: gameDate.dateNumber,
            position: elimination.position,
            points: elimination.points,
            eliminator: eliminatorName,
            eliminationId: elimination.id
          })
        }
      }

      console.log('------|----------|--------|--------------------------|---------')
      console.log(`TOTAL CALCULADO: ${totalPuntos} puntos`)
      console.log(`TOTAL OFICIAL:   ${expectedTotal} puntos`)
      console.log(`DIFERENCIA:      ${totalPuntos - expectedTotal} puntos`)

      // Análisis de discrepancias
      if (totalPuntos !== expectedTotal) {
        console.log('\n🚨 DISCREPANCIAS DETECTADAS:')
        
        if (totalPuntos > expectedTotal) {
          console.log(`❌ PUNTOS EXTRAS: ${totalPuntos - expectedTotal} puntos de más`)
          console.log('Posibles problemas:')
          console.log('- Eliminaciones duplicadas')
          console.log('- Eliminaciones en fechas incorrectas')
          console.log('- Puntos incorrectos asignados')
        } else {
          console.log(`❌ PUNTOS FALTANTES: ${expectedTotal - totalPuntos} puntos de menos`)
          console.log('Posibles problemas:')
          console.log('- Eliminaciones faltantes')
          console.log('- Puntos incorrectamente bajos')
        }

        // Identificar eliminaciones sospechosas
        console.log('\n🔍 ELIMINACIONES SOSPECHOSAS:')
        
        // Buscar duplicados en la misma fecha
        const eliminationsByDate = playerEliminations.reduce((acc, elim) => {
          if (!acc[elim.fecha]) acc[elim.fecha] = []
          acc[elim.fecha].push(elim)
          return acc
        }, {} as Record<number, any[]>)

        Object.entries(eliminationsByDate).forEach(([fecha, eliminations]) => {
          if (eliminations.length > 1) {
            console.log(`⚠️  FECHA ${fecha}: ${eliminations.length} eliminaciones (DUPLICADO PROBABLE)`)
            eliminations.forEach(elim => {
              console.log(`   - Posición ${elim.position}: ${elim.points} pts (ID: ${elim.eliminationId})`)
            })
          }
        })

        // Buscar puntos inusuales
        const sortedPoints = playerEliminations.map(e => e.points).sort((a, b) => b - a)
        const averagePoints = sortedPoints.reduce((sum, p) => sum + p, 0) / sortedPoints.length
        
        console.log(`\n📊 ANÁLISIS DE PUNTOS:`)
        console.log(`Promedio: ${averagePoints.toFixed(1)} puntos`)
        console.log(`Máximo: ${Math.max(...sortedPoints)} puntos`)
        console.log(`Mínimo: ${Math.min(...sortedPoints)} puntos`)
        
        const unusualPoints = playerEliminations.filter(e => 
          e.points > averagePoints * 1.5 || e.points === 0
        )
        
        if (unusualPoints.length > 0) {
          console.log(`\n⚠️  PUNTOS INUSUALES:`)
          unusualPoints.forEach(elim => {
            console.log(`   - Fecha ${elim.fecha}, Pos ${elim.position}: ${elim.points} pts (${elim.points > averagePoints * 1.5 ? 'MUY ALTO' : 'CERO'})`)
          })
        }
      } else {
        console.log('\n✅ PERFECTO: Los puntos coinciden exactamente')
      }
    }

    // Resumen de problemas encontrados
    console.log('\n' + '='.repeat(100))
    console.log('RESUMEN DE PROBLEMAS IDENTIFICADOS')
    console.log('='.repeat(100))
    console.log('\nPara corregir las discrepancias, se requiere:')
    console.log('1. Eliminar eliminaciones duplicadas')
    console.log('2. Corregir puntos incorrectos')
    console.log('3. Verificar eliminaciones en fechas incorrectas')
    console.log('4. Validar que no falten eliminaciones legítimas')

  } catch (error) {
    console.error('❌ Error durante el análisis:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar análisis
analyzeDiscrepancyPlayers()
  .catch(console.error)