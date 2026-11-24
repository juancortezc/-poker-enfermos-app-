#!/usr/bin/env tsx

/**
 * Corrección final de la Fecha 8
 * Ganador: Fernando Peña (30 pts)
 * Segundo: Miguel Chiesa (27 pts) eliminado por Fernando Peña
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixFecha8Final() {
  console.log('🔧 CORRECCIÓN FINAL - FECHA 8')
  console.log('Ganador: Fernando Peña (30 pts)')
  console.log('Segundo: Miguel Chiesa (27 pts) eliminado por Fernando Peña')
  console.log('='.repeat(80))

  try {
    // Obtener torneo 28
    const tournament = await prisma.tournament.findFirst({
      where: { number: 28 }
    })

    if (!tournament) {
      throw new Error('Torneo 28 no encontrado')
    }

    // Obtener fecha 8
    const fecha8 = await prisma.gameDate.findFirst({
      where: {
        tournamentId: tournament.id,
        dateNumber: 8
      }
    })

    if (!fecha8) {
      throw new Error('Fecha 8 no encontrada')
    }

    // Obtener jugadores
    const fernandoPena = await prisma.player.findUnique({
      where: { id: 'cmfbl1ama000xp8dblmchx37p' }
    })

    const miguelChiesa = await prisma.player.findUnique({
      where: { id: 'cmfbl1ae6000rp8dbj5erik9j' }
    })

    if (!fernandoPena || !miguelChiesa) {
      throw new Error('Jugadores no encontrados')
    }

    console.log('✅ Jugadores encontrados:')
    console.log(`- Fernando Peña: ${fernandoPena.firstName} ${fernandoPena.lastName}`)
    console.log(`- Miguel Chiesa: ${miguelChiesa.firstName} ${miguelChiesa.lastName}`)

    // Verificar estado actual
    const eliminaciones = await prisma.elimination.findMany({
      where: {
        gameDateId: fecha8.id,
        position: { in: [1, 2] }
      },
      orderBy: { position: 'asc' }
    })

    console.log('\n📋 Estado actual:')
    for (const elim of eliminaciones) {
      const player = await prisma.player.findUnique({ where: { id: elim.eliminatedPlayerId } })
      const eliminator = elim.eliminatorPlayerId ? 
        await prisma.player.findUnique({ where: { id: elim.eliminatorPlayerId } }) : null
      
      console.log(`Pos ${elim.position}: ${player?.firstName} ${player?.lastName} (${elim.points} pts)` + 
        (eliminator ? ` eliminado por ${eliminator.firstName} ${eliminator.lastName}` : ' - GANADOR'))
    }

    // CORRECCIÓN: Posición 1 (Ganador - Fernando Peña)
    console.log('\n🔧 Corrigiendo posición 1 (Ganador)...')
    
    const pos1 = eliminaciones.find(e => e.position === 1)
    if (pos1) {
      if (pos1.eliminatedPlayerId !== fernandoPena.id) {
        await prisma.elimination.update({
          where: { id: pos1.id },
          data: {
            eliminatedPlayerId: fernandoPena.id,
            eliminatorPlayerId: null, // Ganador no tiene eliminador
            points: 30
          }
        })
        console.log('✅ Posición 1 corregida: Fernando Peña (30 pts) - GANADOR')
      } else {
        console.log('✅ Posición 1 ya es correcta: Fernando Peña')
      }
    }

    // CORRECCIÓN: Posición 2 (Segundo - Miguel Chiesa)
    console.log('\n🔧 Corrigiendo posición 2 (Segundo lugar)...')
    
    const pos2 = eliminaciones.find(e => e.position === 2)
    if (pos2) {
      if (pos2.eliminatedPlayerId !== miguelChiesa.id) {
        await prisma.elimination.update({
          where: { id: pos2.id },
          data: {
            eliminatedPlayerId: miguelChiesa.id,
            eliminatorPlayerId: fernandoPena.id, // Eliminado por Fernando
            points: 27
          }
        })
        console.log('✅ Posición 2 corregida: Miguel Chiesa (27 pts) eliminado por Fernando Peña')
      } else {
        // Verificar eliminador
        if (pos2.eliminatorPlayerId !== fernandoPena.id) {
          await prisma.elimination.update({
            where: { id: pos2.id },
            data: {
              eliminatorPlayerId: fernandoPena.id
            }
          })
          console.log('✅ Eliminador corregido: Miguel Chiesa eliminado por Fernando Peña')
        } else {
          console.log('✅ Posición 2 ya es correcta: Miguel Chiesa eliminado por Fernando Peña')
        }
      }
    }

    // Verificar estado final
    console.log('\n📋 Estado final:')
    const eliminacionesFinales = await prisma.elimination.findMany({
      where: {
        gameDateId: fecha8.id,
        position: { in: [1, 2] }
      },
      orderBy: { position: 'asc' }
    })

    for (const elim of eliminacionesFinales) {
      const player = await prisma.player.findUnique({ where: { id: elim.eliminatedPlayerId } })
      const eliminator = elim.eliminatorPlayerId ? 
        await prisma.player.findUnique({ where: { id: elim.eliminatorPlayerId } }) : null
      
      console.log(`Pos ${elim.position}: ${player?.firstName} ${player?.lastName} (${elim.points} pts)` + 
        (eliminator ? ` eliminado por ${eliminator.firstName} ${eliminator.lastName}` : ' - GANADOR'))
    }

    console.log('\n' + '='.repeat(80))
    console.log('✅ FECHA 8 CORREGIDA EXITOSAMENTE')
    console.log('Fernando Peña: Ganador (30 pts)')
    console.log('Miguel Chiesa: Segundo lugar (27 pts) eliminado por Fernando Peña')
    console.log('='.repeat(80))

  } catch (error) {
    console.error('❌ Error durante la corrección:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar corrección
fixFecha8Final()
  .catch(console.error)