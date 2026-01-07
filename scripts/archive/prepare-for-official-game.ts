/**
 * Script para preparar la base de datos antes del juego oficial
 *
 * Limpia:
 * - TimerState de test
 * - TimerActions de test
 * - Eliminations de test
 * - Resetea GameDate.status a 'CREATED'
 *
 * Preserva:
 * - Tournament
 * - GameDate (solo resetea status)
 * - BlindLevels
 * - Players
 *
 * IMPORTANTE: Ejecutar ANTES del juego oficial para limpiar datos de prueba
 */

import { PrismaClient } from '@prisma/client'
import * as readline from 'readline'

const prisma = new PrismaClient()

interface CleanupStats {
  timerStatesDeleted: number
  timerActionsDeleted: number
  eliminationsDeleted: number
  gameDateReset: boolean
  gameDateId: number | null
  dateNumber: number | null
}

async function confirmAction(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(`${message} (escribe "SI" para confirmar): `, (answer) => {
      rl.close()
      resolve(answer.trim().toUpperCase() === 'SI')
    })
  })
}

async function prepareForOfficialGame(): Promise<CleanupStats> {
  const stats: CleanupStats = {
    timerStatesDeleted: 0,
    timerActionsDeleted: 0,
    eliminationsDeleted: 0,
    gameDateReset: false,
    gameDateId: null,
    dateNumber: null,
  }

  console.log('\n🔍 Buscando fecha de juego activa o en progreso...\n')

  // Buscar GameDate activa o en progreso
  const activeGameDate = await prisma.gameDate.findFirst({
    where: {
      OR: [
        { status: 'in_progress' },
        { status: 'CREATED' }
      ]
    },
    include: {
      tournament: true,
      timerState: true,
    },
    orderBy: {
      scheduledDate: 'desc'
    }
  })

  if (!activeGameDate) {
    console.log('❌ No se encontró ninguna fecha activa o en progreso')
    return stats
  }

  stats.gameDateId = activeGameDate.id
  stats.dateNumber = activeGameDate.dateNumber

  console.log(`📅 Fecha encontrada:`)
  console.log(`   - ID: ${activeGameDate.id}`)
  console.log(`   - Número: ${activeGameDate.dateNumber}`)
  console.log(`   - Torneo: ${activeGameDate.tournament.number}`)
  console.log(`   - Status: ${activeGameDate.status}`)
  console.log(`   - Fecha programada: ${activeGameDate.scheduledDate}`)

  // Contar registros a eliminar
  const timerStateCount = activeGameDate.timerState ? 1 : 0
  const timerActionsCount = activeGameDate.timerState
    ? await prisma.timerAction.count({
        where: { timerStateId: activeGameDate.timerState.id }
      })
    : 0
  const eliminationsCount = await prisma.elimination.count({
    where: { gameDateId: activeGameDate.id }
  })

  console.log(`\n📊 Registros a limpiar:`)
  console.log(`   - TimerState: ${timerStateCount}`)
  console.log(`   - TimerActions: ${timerActionsCount}`)
  console.log(`   - Eliminations: ${eliminationsCount}`)
  console.log(`   - GameDate status: ${activeGameDate.status} → CREATED`)

  console.log(`\n⚠️  ADVERTENCIA: Esta acción eliminará TODOS los datos de prueba`)
  console.log(`   y preparará la fecha para el juego oficial.\n`)

  const confirmed = await confirmAction('¿Deseas continuar?')

  if (!confirmed) {
    console.log('\n❌ Operación cancelada por el usuario')
    return stats
  }

  console.log('\n🧹 Iniciando limpieza...\n')

  // 1. Eliminar TimerActions
  if (activeGameDate.timerState) {
    const deletedActions = await prisma.timerAction.deleteMany({
      where: { timerStateId: activeGameDate.timerState.id }
    })
    stats.timerActionsDeleted = deletedActions.count
    console.log(`✅ TimerActions eliminadas: ${stats.timerActionsDeleted}`)
  }

  // 2. Eliminar TimerState
  if (activeGameDate.timerState) {
    await prisma.timerState.delete({
      where: { id: activeGameDate.timerState.id }
    })
    stats.timerStatesDeleted = 1
    console.log(`✅ TimerState eliminado: 1`)
  }

  // 3. Eliminar Eliminations
  const deletedEliminations = await prisma.elimination.deleteMany({
    where: { gameDateId: activeGameDate.id }
  })
  stats.eliminationsDeleted = deletedEliminations.count
  console.log(`✅ Eliminations eliminadas: ${stats.eliminationsDeleted}`)

  // 4. Resetear GameDate status y timestamps
  await prisma.gameDate.update({
    where: { id: activeGameDate.id },
    data: {
      status: 'CREATED',
      startedAt: null,
      completedAt: null,
    }
  })
  stats.gameDateReset = true
  console.log(`✅ GameDate reseteada a CREATED`)

  return stats
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║  PREPARAR BASE DE DATOS PARA JUEGO OFICIAL                ║')
  console.log('╚════════════════════════════════════════════════════════════╝')

  try {
    const stats = await prepareForOfficialGame()

    if (stats.gameDateId) {
      console.log('\n╔════════════════════════════════════════════════════════════╗')
      console.log('║  RESUMEN DE LIMPIEZA                                       ║')
      console.log('╚════════════════════════════════════════════════════════════╝')
      console.log(`\nFecha limpiada: #${stats.dateNumber}`)
      console.log(`  - TimerStates eliminados: ${stats.timerStatesDeleted}`)
      console.log(`  - TimerActions eliminadas: ${stats.timerActionsDeleted}`)
      console.log(`  - Eliminations eliminadas: ${stats.eliminationsDeleted}`)
      console.log(`  - GameDate reseteada: ${stats.gameDateReset ? 'SÍ' : 'NO'}`)

      console.log('\n✅ Base de datos lista para el juego oficial')
      console.log('\n📋 Próximos pasos:')
      console.log('   1. Verificar en /registro que aparece el botón "INICIAR FECHA"')
      console.log('   2. Verificar que no hay timer activo')
      console.log('   3. Iniciar la fecha cuando estén listos para jugar')
    } else {
      console.log('\nℹ️  No se realizaron cambios')
    }

  } catch (error) {
    console.error('\n❌ Error durante la limpieza:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    console.log('\n✅ Script completado exitosamente\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error)
    process.exit(1)
  })
