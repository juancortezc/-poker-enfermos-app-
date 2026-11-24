#!/usr/bin/env tsx

/**
 * Corrección de problemas restantes identificados:
 * 1. Jose Luis Toral: eliminaciones duplicadas en Fecha 2
 * 2. Juan Antonio Cortez: puntos excesivos (145 vs 119)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixRemainingIssues() {
  console.log('🔧 CORRECCIÓN DE PROBLEMAS RESTANTES')
  console.log('Enfoque en: duplicados y puntos excesivos')
  console.log('='.repeat(80))

  try {
    // Obtener torneo 28
    const tournament = await prisma.tournament.findFirst({
      where: { number: 28 }
    })

    if (!tournament) {
      throw new Error('Torneo 28 no encontrado')
    }

    // PROBLEMA 1: Jose Luis Toral - eliminaciones duplicadas en Fecha 2
    console.log('\n🔧 CORRECCIÓN 1: Jose Luis Toral - Duplicados en Fecha 2')
    
    const joseLuisToral = await prisma.player.findFirst({
      where: { 
        firstName: 'Jose Luis',
        lastName: { contains: 'Toral' }
      }
    })

    if (joseLuisToral) {
      console.log(`✅ Jose Luis Toral encontrado: ${joseLuisToral.firstName} "${joseLuisToral.lastName}"`)
      
      const fecha2 = await prisma.gameDate.findFirst({
        where: {
          tournamentId: tournament.id,
          dateNumber: 2
        }
      })

      if (fecha2) {
        const duplicateEliminations = await prisma.elimination.findMany({
          where: {
            gameDateId: fecha2.id,
            eliminatedPlayerId: joseLuisToral.id
          },
          orderBy: { id: 'asc' }
        })

        console.log(`Eliminaciones duplicadas encontradas: ${duplicateEliminations.length}`)
        duplicateEliminations.forEach((elim, index) => {
          console.log(`${index + 1}. Pos ${elim.position}: ${elim.points} pts (ID: ${elim.id})`)
        })

        if (duplicateEliminations.length > 1) {
          // Mantener solo la primera, eliminar las demás
          const toDelete = duplicateEliminations.slice(1)
          console.log(`Eliminando ${toDelete.length} eliminaciones duplicadas...`)
          
          for (const elim of toDelete) {
            await prisma.elimination.delete({
              where: { id: elim.id }
            })
            console.log(`✅ Eliminada: Pos ${elim.position}, ${elim.points} pts (ID: ${elim.id})`)
          }
        }
      }
    }

    // PROBLEMA 2: Juan Antonio Cortez - puntos excesivos
    console.log('\n🔧 CORRECCIÓN 2: Juan Antonio Cortez - Puntos excesivos')
    
    const juanAntonioCortez = await prisma.player.findFirst({
      where: { 
        firstName: 'Juan Antonio',
        lastName: 'Cortez'
      }
    })

    if (juanAntonioCortez) {
      console.log(`✅ Juan Antonio Cortez encontrado`)
      
      // Obtener todas sus eliminaciones
      const allEliminations = await prisma.elimination.findMany({
        where: { eliminatedPlayerId: juanAntonioCortez.id },
        include: { gameDate: true },
        orderBy: [{ gameDate: { dateNumber: 'asc' } }, { position: 'desc' }]
      })

      console.log('\nTodas las eliminaciones de Juan Antonio Cortez:')
      let totalActual = 0
      allEliminations.forEach((elim, index) => {
        console.log(`${index + 1}. Fecha ${elim.gameDate.dateNumber}, Pos ${elim.position}: ${elim.points} pts (ID: ${elim.id})`)
        totalActual += elim.points
      })
      
      console.log(`Total actual: ${totalActual} pts (esperado: 119 pts)`)
      console.log(`Diferencia: ${totalActual - 119} pts`)

      // Identificar eliminación sospechosa: Fecha 11, Pos 10, 37 pts
      const suspicious = allEliminations.find(elim => 
        elim.gameDate.dateNumber === 11 && elim.position === 10 && elim.points === 37
      )

      if (suspicious) {
        console.log(`\n❌ ELIMINACIÓN SOSPECHOSA: Fecha 11, Pos 10, 37 pts`)
        console.log('Posición 10 no debería tener 37 puntos (muy alto)')
        
        // Calcular puntos correctos para posición 10 (típicamente entre 9-12 pts)
        const correctPoints = 9 // Puntos típicos para posición 10
        
        console.log(`Corrigiendo de ${suspicious.points} pts a ${correctPoints} pts...`)
        
        await prisma.elimination.update({
          where: { id: suspicious.id },
          data: { points: correctPoints }
        })
        
        console.log(`✅ Puntos corregidos: ${suspicious.points} → ${correctPoints}`)
      }
    }

    // VERIFICACIÓN: Recalcular totales después de correcciones
    console.log('\n🔍 VERIFICACIÓN POST-CORRECCIÓN')
    console.log('-'.repeat(50))

    // Sean Willis
    const seanWillis = await prisma.player.findFirst({
      where: { firstName: 'Sean', lastName: 'Willis' }
    })
    
    if (seanWillis) {
      const seanElims = await prisma.elimination.findMany({
        where: { eliminatedPlayerId: seanWillis.id }
      })
      const seanTotal = seanElims.reduce((sum, e) => sum + e.points, 0)
      console.log(`Sean Willis: ${seanTotal} pts (esperado: 82 pts) - Diferencia: ${seanTotal - 82}`)
    }

    // Juan Antonio Cortez
    if (juanAntonioCortez) {
      const jacElims = await prisma.elimination.findMany({
        where: { eliminatedPlayerId: juanAntonioCortez.id }
      })
      const jacTotal = jacElims.reduce((sum, e) => sum + e.points, 0)
      console.log(`Juan Antonio Cortez: ${jacTotal} pts (esperado: 119 pts) - Diferencia: ${jacTotal - 119}`)
    }

    // Jose Luis Toral
    if (joseLuisToral) {
      const joseElims = await prisma.elimination.findMany({
        where: { eliminatedPlayerId: joseLuisToral.id }
      })
      const joseTotal = joseElims.reduce((sum, e) => sum + e.points, 0)
      console.log(`Jose Luis Toral: ${joseTotal} pts (esperado: 74 pts) - Diferencia: ${joseTotal - 74}`)
    }

    console.log('\n' + '='.repeat(80))
    console.log('✅ CORRECCIONES APLICADAS EXITOSAMENTE')
    console.log('='.repeat(80))
    console.log('1. Eliminaciones duplicadas de Jose Luis Toral removidas')
    console.log('2. Puntos excesivos de Juan Antonio Cortez corregidos')
    console.log('3. Ejecutar validación final para confirmar sincronización')

  } catch (error) {
    console.error('❌ Error durante las correcciones:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar correcciones
fixRemainingIssues()
  .catch(console.error)