#!/usr/bin/env tsx

/**
 * Corrección específica de discrepancias identificadas
 * 1. Sean Willis: NO debe ser ganador en Fecha 7
 * 2. Verificar otras eliminaciones incorrectas
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixSpecificDiscrepancies() {
  console.log('🔧 CORRECCIÓN ESPECÍFICA DE DISCREPANCIAS')
  console.log('Basado en análisis detallado de jugadores problemáticos')
  console.log('='.repeat(80))

  try {
    // Obtener torneo 28
    const tournament = await prisma.tournament.findFirst({
      where: { number: 28 }
    })

    if (!tournament) {
      throw new Error('Torneo 28 no encontrado')
    }

    // PROBLEMA 1: Sean Willis no debe ser ganador en Fecha 7
    console.log('\n🔧 CORRECCIÓN 1: Sean Willis en Fecha 7')
    console.log('Sean Willis NO debe ser ganador (Posición 1, 29 pts)')
    
    const fecha7 = await prisma.gameDate.findFirst({
      where: {
        tournamentId: tournament.id,
        dateNumber: 7
      }
    })

    if (fecha7) {
      const seanWillis = await prisma.player.findFirst({
        where: { 
          firstName: 'Sean',
          lastName: 'Willis'
        }
      })

      if (seanWillis) {
        // Buscar eliminación incorrecta de Sean Willis como ganador
        const incorrectElimination = await prisma.elimination.findFirst({
          where: {
            gameDateId: fecha7.id,
            eliminatedPlayerId: seanWillis.id,
            position: 1
          }
        })

        if (incorrectElimination) {
          console.log(`❌ ELIMINACIÓN INCORRECTA ENCONTRADA:`)
          console.log(`Sean Willis como ganador (Pos 1, ${incorrectElimination.points} pts)`)
          
          // Encontrar quién REALMENTE debería ser el ganador de Fecha 7
          const allF7Eliminations = await prisma.elimination.findMany({
            where: { gameDateId: fecha7.id },
            include: { eliminatedPlayer: true },
            orderBy: { position: 'asc' }
          })

          console.log('\nTodas las eliminaciones Fecha 7:')
          allF7Eliminations.forEach(elim => {
            console.log(`Pos ${elim.position}: ${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName} (${elim.points} pts)`)
          })

          // ELIMINAR la eliminación incorrecta de Sean Willis como ganador
          await prisma.elimination.delete({
            where: { id: incorrectElimination.id }
          })
          
          console.log('✅ Eliminación incorrecta de Sean Willis ELIMINADA')
        } else {
          console.log('⚠️  No se encontró eliminación de Sean Willis como ganador en Fecha 7')
        }
      }
    }

    // PROBLEMA 2: Verificar y corregir Juan Antonio Cortez
    console.log('\n🔧 VERIFICACIÓN 2: Juan Antonio Cortez')
    
    const juanAntonioCortez = await prisma.player.findFirst({
      where: { 
        firstName: 'Juan Antonio',
        lastName: 'Cortez'
      }
    })

    if (juanAntonioCortez) {
      console.log(`✅ Juan Antonio Cortez encontrado: ${juanAntonioCortez.id}`)
      
      // Calcular sus puntos actuales
      const allEliminations = await prisma.elimination.findMany({
        where: { eliminatedPlayerId: juanAntonioCortez.id },
        include: { gameDate: true }
      })

      let totalPuntos = 0
      console.log('Eliminaciones de Juan Antonio Cortez:')
      allEliminations.forEach(elim => {
        console.log(`Fecha ${elim.gameDate.dateNumber}, Pos ${elim.position}: ${elim.points} pts`)
        totalPuntos += elim.points
      })
      
      console.log(`Total actual: ${totalPuntos} pts (esperado: 119 pts)`)
      console.log(`Diferencia: ${totalPuntos - 119} pts`)
    } else {
      console.log('❌ Juan Antonio Cortez no encontrado')
    }

    // PROBLEMA 3: Verificar Jose Luis Toral con doble espacio
    console.log('\n🔧 VERIFICACIÓN 3: Jose Luis Toral')
    
    const joseLuisToral = await prisma.player.findFirst({
      where: { 
        firstName: 'Jose Luis',
        lastName: { contains: 'Toral' }
      }
    })

    if (joseLuisToral) {
      console.log(`✅ Jose Luis Toral encontrado: ${joseLuisToral.firstName} "${joseLuisToral.lastName}" (${joseLuisToral.id})`)
      
      // Calcular sus puntos actuales
      const allEliminations = await prisma.elimination.findMany({
        where: { eliminatedPlayerId: joseLuisToral.id },
        include: { gameDate: true }
      })

      let totalPuntos = 0
      console.log('Eliminaciones de Jose Luis Toral:')
      allEliminations.forEach(elim => {
        console.log(`Fecha ${elim.gameDate.dateNumber}, Pos ${elim.position}: ${elim.points} pts`)
        totalPuntos += elim.points
      })
      
      console.log(`Total actual: ${totalPuntos} pts (esperado: 74 pts)`)
      console.log(`Diferencia: ${totalPuntos - 74} pts`)
    } else {
      console.log('❌ Jose Luis Toral no encontrado')
    }

    // PROBLEMA 4: Verificar eliminaciones duplicadas en general
    console.log('\n🔧 VERIFICACIÓN 4: Eliminaciones duplicadas')
    
    const duplicateEliminations = await prisma.$queryRaw`
      SELECT 
        gd.date_number as fecha,
        p.first_name,
        p.last_name,
        COUNT(*) as cantidad
      FROM eliminations e
      JOIN game_dates gd ON e.game_date_id = gd.id
      JOIN players p ON e.eliminated_player_id = p.id
      WHERE gd.tournament_id = ${tournament.id}
      GROUP BY gd.date_number, p.first_name, p.last_name
      HAVING COUNT(*) > 1
      ORDER BY gd.date_number, cantidad DESC
    `

    if (Array.isArray(duplicateEliminations) && duplicateEliminations.length > 0) {
      console.log('❌ ELIMINACIONES DUPLICADAS ENCONTRADAS:')
      duplicateEliminations.forEach((dup: any) => {
        console.log(`Fecha ${dup.fecha}: ${dup.first_name} ${dup.last_name} - ${dup.cantidad} eliminaciones`)
      })
    } else {
      console.log('✅ No se encontraron eliminaciones duplicadas')
    }

    console.log('\n' + '='.repeat(80))
    console.log('CORRECCIONES APLICADAS')
    console.log('='.repeat(80))
    console.log('1. ✅ Eliminación incorrecta de Sean Willis como ganador F7 removida')
    console.log('2. ⚠️  Verificar manualmente otras discrepancias restantes')
    console.log('3. 🔄 Re-ejecutar validación para confirmar mejoras')

  } catch (error) {
    console.error('❌ Error durante las correcciones:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar correcciones
fixSpecificDiscrepancies()
  .catch(console.error)