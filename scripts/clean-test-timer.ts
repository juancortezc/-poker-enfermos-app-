#!/usr/bin/env npx tsx
/**
 * Script para limpiar el test de timer en producción
 *
 * OBJETIVO:
 * - Eliminar TimerState del test actual
 * - Resetear GameDate.status de 'in_progress' → 'CREATED'
 * - Preservar Tournament, Players, BlindLevels, Eliminations
 *
 * SEGURIDAD:
 * - Solo afecta la fecha activa (GameDate con status='in_progress')
 * - NO elimina eliminaciones (histórico intacto)
 * - Confirmación manual antes de ejecutar
 *
 * USO:
 * npx tsx scripts/clean-test-timer.ts
 */

import { PrismaClient } from '@prisma/client'
import * as readline from 'readline'

const prisma = new PrismaClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer)
    })
  })
}

async function main() {
  console.log('\n🔍 SCRIPT DE LIMPIEZA DE TIMER DE TEST\n')
  console.log('Este script va a:')
  console.log('✅ Eliminar TimerState del test')
  console.log('✅ Resetear GameDate.status a CREATED')
  console.log('✅ Preservar: Tournament, Players, BlindLevels, Eliminations\n')

  // 1. Buscar GameDate activa con timer
  const inProgressDates = await prisma.gameDate.findMany({
    where: {
      status: 'in_progress'
    },
    include: {
      tournament: true,
      timerStates: true,
      eliminations: true
    }
  })

  if (inProgressDates.length === 0) {
    console.log('✅ No hay fechas con status "in_progress". No hay nada que limpiar.\n')
    rl.close()
    return
  }

  console.log(`⚠️  Encontradas ${inProgressDates.length} fecha(s) en progreso:\n`)

  inProgressDates.forEach((date, index) => {
    console.log(`${index + 1}. GameDate ID: ${date.id}`)
    console.log(`   Torneo: ${date.tournament.name}`)
    console.log(`   Fecha #: ${date.dateNumber}`)
    console.log(`   Status: ${date.status}`)
    console.log(`   Timer: ${date.timerStates ? 'SÍ' : 'NO'}`)
    console.log(`   Eliminaciones: ${date.eliminations.length}`)
    console.log('')
  })

  const answer = await question('¿Deseas limpiar TODAS estas fechas? (escribe "SI" para confirmar): ')

  if (answer.trim().toUpperCase() !== 'SI') {
    console.log('\n❌ Operación cancelada por el usuario.\n')
    rl.close()
    return
  }

  console.log('\n🚀 Iniciando limpieza...\n')

  let cleaned = 0

  for (const date of inProgressDates) {
    console.log(`Procesando GameDate ${date.id}...`)

    // Eliminar TimerState si existe
    if (date.timerStates) {
      const timerState = await prisma.timerState.findFirst({
        where: { gameDateId: date.id }
      })

      if (timerState) {
        // Primero eliminar TimerActions (cascade debería hacerlo, pero por si acaso)
        await prisma.timerAction.deleteMany({
          where: { timerStateId: timerState.id }
        })

        // Eliminar TimerState
        await prisma.timerState.delete({
          where: { id: timerState.id }
        })

        console.log(`  ✅ TimerState eliminado (ID: ${timerState.id})`)
      }
    }

    // Resetear GameDate status a CREATED
    await prisma.gameDate.update({
      where: { id: date.id },
      data: {
        status: 'CREATED',
        actualDate: null
      }
    })

    console.log(`  ✅ GameDate ${date.id} reseteado a CREATED`)
    console.log(`  📊 Eliminaciones preservadas: ${date.eliminations.length}`)
    console.log('')

    cleaned++
  }

  console.log(`\n✅ Limpieza completada: ${cleaned} fecha(s) procesadas\n`)
  console.log('🎮 La fecha está lista para iniciar de nuevo esta noche.\n')
  console.log('NOTA: Las eliminaciones NO fueron borradas (histórico intacto).')
  console.log('Si deseas borrar eliminaciones también, usa Prisma Studio:\n')
  console.log('  npx prisma studio\n')

  rl.close()
}

main()
  .catch((error) => {
    console.error('\n❌ ERROR:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
