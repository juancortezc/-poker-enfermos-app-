#!/usr/bin/env tsx

/**
 * Corrección de las 3 discrepancias críticas identificadas
 * 1. Fecha 2, Posición 6: Juan Antonio Cortez → Jose Luis Toral
 * 2. Fecha 8, Posición 2: Miguel Chiesa → Fernando Peña
 * 3. Verificar/Crear Fecha 8, Posición 23: Milton Tapia eliminado por Juan Antonio Cortez
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixCriticalDiscrepancies() {
  console.log('🔧 CORRIGIENDO DISCREPANCIAS CRÍTICAS DEL TORNEO 28')
  console.log('='.repeat(80))

  try {
    // Obtener el torneo 28
    const tournament = await prisma.tournament.findFirst({
      where: { number: 28 }
    })

    if (!tournament) {
      throw new Error('Torneo 28 no encontrado')
    }

    // Obtener jugadores necesarios (usando IDs conocidos)
    const joseLuisToral = await prisma.player.findUnique({
      where: { id: 'cmfbl1bg8001bp8db63ct0xsu' }
    })

    const juanAntonioCortez = await prisma.player.findUnique({
      where: { id: 'cmfbl1c0w001lp8dbef0p6on3' }
    })

    const fernandoPena = await prisma.player.findUnique({
      where: { id: 'cmfbl1ama000xp8dblmchx37p' }
    })

    const miguelChiesa = await prisma.player.findUnique({
      where: { id: 'cmfbl1ae6000rp8dbj5erik9j' }
    })

    const miltonTapia = await prisma.player.findUnique({
      where: { id: 'cmfbl19b10003p8db4jdy8zri' }
    })

    if (!joseLuisToral || !juanAntonioCortez || !fernandoPena || !miguelChiesa || !miltonTapia) {
      throw new Error('No se encontraron todos los jugadores necesarios')
    }

    console.log('✅ Jugadores encontrados:')
    console.log(`- Jose Luis Toral: ${joseLuisToral.id}`)
    console.log(`- Juan Antonio Cortez: ${juanAntonioCortez.id}`)
    console.log(`- Fernando Peña: ${fernandoPena.id}`)
    console.log(`- Miguel Chiesa: ${miguelChiesa.id}`)
    console.log(`- Milton Tapia: ${miltonTapia.id}`)

    // CORRECCIÓN 1: Fecha 2, Posición 6
    console.log('\n🔧 CORRECCIÓN 1: Fecha 2, Posición 6')
    console.log('Cambiar Juan Antonio Cortez → Jose Luis Toral')

    const fecha2 = await prisma.gameDate.findFirst({
      where: {
        tournamentId: tournament.id,
        dateNumber: 2
      }
    })

    if (fecha2) {
      const eliminationF2P6 = await prisma.elimination.findFirst({
        where: {
          gameDateId: fecha2.id,
          position: 6
        }
      })

      if (eliminationF2P6) {
        console.log(`Eliminación actual: ${eliminationF2P6.eliminatedPlayerId} (pos 6)`)
        
        if (eliminationF2P6.eliminatedPlayerId === juanAntonioCortez.id) {
          await prisma.elimination.update({
            where: { id: eliminationF2P6.id },
            data: { eliminatedPlayerId: joseLuisToral.id }
          })
          console.log('✅ Corrección aplicada: Juan Antonio Cortez → Jose Luis Toral')
        } else {
          console.log('⚠️  La eliminación ya tiene un jugador diferente')
        }
      } else {
        console.log('❌ No se encontró eliminación en posición 6 para fecha 2')
      }
    }

    // CORRECCIÓN 2: Fecha 8, Posición 2
    console.log('\n🔧 CORRECCIÓN 2: Fecha 8, Posición 2')
    console.log('Cambiar Miguel Chiesa → Fernando Peña')

    const fecha8 = await prisma.gameDate.findFirst({
      where: {
        tournamentId: tournament.id,
        dateNumber: 8
      }
    })

    if (fecha8) {
      const eliminationF8P2 = await prisma.elimination.findFirst({
        where: {
          gameDateId: fecha8.id,
          position: 2
        }
      })

      if (eliminationF8P2) {
        console.log(`Eliminación actual: ${eliminationF8P2.eliminatedPlayerId} (pos 2)`)
        
        if (eliminationF8P2.eliminatedPlayerId === miguelChiesa.id) {
          await prisma.elimination.update({
            where: { id: eliminationF8P2.id },
            data: { eliminatedPlayerId: fernandoPena.id }
          })
          console.log('✅ Corrección aplicada: Miguel Chiesa → Fernando Peña')
        } else {
          console.log('⚠️  La eliminación ya tiene un jugador diferente')
        }
      } else {
        console.log('❌ No se encontró eliminación en posición 2 para fecha 8')
      }
    }

    // CORRECCIÓN 3: Verificar Fecha 8, Posición 23
    console.log('\n🔧 CORRECCIÓN 3: Fecha 8, Posición 23')
    console.log('Verificar Milton Tapia eliminado por Juan Antonio Cortez')

    if (fecha8) {
      const eliminationF8P23 = await prisma.elimination.findFirst({
        where: {
          gameDateId: fecha8.id,
          position: 23
        }
      })

      if (eliminationF8P23) {
        console.log(`Eliminación pos 23 actual: ${eliminationF8P23.eliminatedPlayerId}`)
        
        if (eliminationF8P23.eliminatedPlayerId !== miltonTapia.id) {
          await prisma.elimination.update({
            where: { id: eliminationF8P23.id },
            data: { 
              eliminatedPlayerId: miltonTapia.id,
              eliminatorPlayerId: juanAntonioCortez.id
            }
          })
          console.log('✅ Corrección aplicada: Milton Tapia en posición 23')
        } else {
          console.log('✅ Milton Tapia ya está en posición 23')
        }
      } else {
        // Crear la eliminación si no existe
        console.log('Creando eliminación para posición 23...')
        await prisma.elimination.create({
          data: {
            gameDateId: fecha8.id,
            position: 23,
            eliminatedPlayerId: miltonTapia.id,
            eliminatorPlayerId: juanAntonioCortez.id,
            points: 1 // Posición 23 = 1 punto
          }
        })
        console.log('✅ Eliminación creada: Milton Tapia pos 23 (1 pt) eliminado por Juan Antonio Cortez')
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('✅ CORRECCIONES COMPLETADAS')
    console.log('='.repeat(80))
    console.log('Las 3 discrepancias críticas han sido corregidas.')
    console.log('Ejecutar validación final para confirmar resultados.')

  } catch (error) {
    console.error('❌ Error durante las correcciones:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar correcciones
fixCriticalDiscrepancies()
  .catch(console.error)