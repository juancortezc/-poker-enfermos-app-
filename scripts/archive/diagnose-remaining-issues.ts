#!/usr/bin/env tsx

/**
 * Diagnóstico de problemas restantes después de las correcciones
 * Analizar por qué algunos jugadores no aparecen y diferencias en puntos
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Jugadores que deberían aparecer según t11.jpeg
const JUGADORES_OFICIALES = [
  'Roddy Naranjo', 'Freddy Lopez', 'Andres Benites', 'Fernando Peña',
  'Miguel Chiesa', 'Diego Behar', 'Ruben Cadena', 'Daniel Vela',
  'Joffre Palacios', 'Jorge Tamayo', 'Juan Antonio Cortez', 'Juan Fernando Ochoa',
  'Juan Tapia', 'Carlos Chacón', 'Javier Martinez', 'Damian Amador',
  'Milton Tapia', 'Sean Willis', 'Jose Luis Toral'
]

async function diagnoseRemainingIssues() {
  console.log('🔍 DIAGNÓSTICO DE PROBLEMAS RESTANTES')
  console.log('Analizando por qué algunos jugadores no aparecen en el sistema')
  console.log('='.repeat(80))

  try {
    // Obtener torneo 28
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

    // Verificar participantes del torneo
    console.log('\n📋 PARTICIPANTES DEL TORNEO 28:')
    console.log('-'.repeat(50))
    tournament.tournamentParticipants.forEach(participant => {
      const fullName = `${participant.player.firstName} ${participant.player.lastName}`
      console.log(`✅ ${fullName}`)
    })

    // Verificar jugadores faltantes
    console.log('\n❌ JUGADORES OFICIALES NO PARTICIPANTES DEL TORNEO:')
    console.log('-'.repeat(50))
    
    const participantNames = tournament.tournamentParticipants.map(p => 
      `${p.player.firstName} ${p.player.lastName}`
    )

    const faltantes = JUGADORES_OFICIALES.filter(oficial => 
      !participantNames.includes(oficial) && 
      !participantNames.includes(oficial.replace('  ', ' ')) && // Probar sin doble espacio
      !participantNames.includes(oficial.replace(' ', '  ')) // Probar con doble espacio
    )

    faltantes.forEach(faltante => {
      console.log(`❌ ${faltante}`)
    })

    // Buscar esos jugadores en la BD general
    console.log('\n🔍 BUSCANDO JUGADORES FALTANTES EN BD:')
    console.log('-'.repeat(50))
    
    for (const faltante of faltantes) {
      const [firstName, ...lastNameParts] = faltante.split(' ')
      const lastName = lastNameParts.join(' ')
      
      const player = await prisma.player.findFirst({
        where: {
          OR: [
            { firstName: firstName, lastName: lastName },
            { firstName: firstName, lastName: ` ${lastName}` }, // Con espacio
            { firstName: firstName, lastName: `  ${lastName}` }, // Con doble espacio
            { firstName: firstName, lastName: { contains: lastName } }
          ]
        }
      })

      if (player) {
        console.log(`🔍 ${faltante} → ENCONTRADO: ${player.firstName} ${player.lastName} (ID: ${player.id})`)
        
        // Verificar si es participante
        const isParticipant = await prisma.tournamentParticipant.findFirst({
          where: {
            tournamentId: tournament.id,
            playerId: player.id
          }
        })
        
        if (!isParticipant) {
          console.log(`   ⚠️  NO ES PARTICIPANTE del torneo 28`)
        }
      } else {
        console.log(`❌ ${faltante} → NO ENCONTRADO en BD`)
      }
    }

    // Analizar diferencias de puntos en jugadores existentes
    console.log('\n📊 ANÁLISIS DE PUNTOS - JUGADORES EXISTENTES:')
    console.log('-'.repeat(50))

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

    console.log(`Fechas completadas encontradas: ${gameDates.length}`)
    gameDates.forEach(date => {
      console.log(`- Fecha ${date.dateNumber}: ${date.eliminations.length} eliminaciones`)
    })

    // Calcular puntos para jugadores específicos con problemas
    const problematicPlayers = ['Fernando Peña', 'Miguel Chiesa', 'Juan Antonio Cortez']
    
    for (const playerName of problematicPlayers) {
      console.log(`\n🔍 DETALLES DE PUNTOS - ${playerName}:`)
      
      const player = await prisma.player.findFirst({
        where: {
          OR: [
            { firstName: playerName.split(' ')[0], lastName: playerName.split(' ').slice(1).join(' ') },
            { firstName: playerName.split(' ')[0], lastName: ` ${playerName.split(' ').slice(1).join(' ')}` }
          ]
        }
      })

      if (player) {
        const playerEliminations = gameDates.flatMap(date => 
          date.eliminations.filter(e => e.eliminatedPlayerId === player.id)
        )
        
        console.log(`   Eliminaciones encontradas: ${playerEliminations.length}`)
        let totalPuntos = 0
        
        playerEliminations.forEach(elim => {
          const fecha = gameDates.find(d => d.id === elim.gameDateId)?.dateNumber
          console.log(`   - Fecha ${fecha}: Posición ${elim.position} = ${elim.points} puntos`)
          totalPuntos += elim.points
        })
        
        console.log(`   TOTAL CALCULADO: ${totalPuntos} puntos`)
      }
    }

  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar diagnóstico
diagnoseRemainingIssues()
  .catch(console.error)