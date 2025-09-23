#!/usr/bin/env tsx

/**
 * Crear jugadores históricos faltantes para los torneos 1-27
 * Estos jugadores aparecen en el podio histórico pero no están en la base de datos actual
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const historicalPlayers = [
  { firstName: "Pablo", lastName: "Suarez" },
  { firstName: "Mario", lastName: "Descalzi" },
  { firstName: "Yair", lastName: "Gorbatin" },
  { firstName: "Horacio", lastName: "De Alencar" },
  { firstName: "Christian", lastName: "Zumarraga" },
  { firstName: "Luigi", lastName: "Pichirilli" },
  { firstName: "Franklin", lastName: "Flores" }
]

async function createHistoricalPlayers() {
  console.log('🏆 CREANDO JUGADORES HISTÓRICOS PARA TORNEOS 1-27')
  console.log('=' * 70)
  
  try {
    for (const playerData of historicalPlayers) {
      // Verificar si el jugador ya existe
      const existingPlayer = await prisma.player.findFirst({
        where: {
          firstName: playerData.firstName,
          lastName: playerData.lastName
        }
      })
      
      if (existingPlayer) {
        console.log(`⚠️  ${playerData.firstName} ${playerData.lastName} ya existe`)
        continue
      }
      
      // Crear el jugador histórico
      const newPlayer = await prisma.player.create({
        data: {
          firstName: playerData.firstName,
          lastName: playerData.lastName,
          role: 'Enfermo',
          isActive: false,
          joinDate: '2010-01-01',
          joinYear: 2010,
          photoUrl: '/logo-grupo.png', // Logo del grupo para jugadores históricos
          aliases: []
        }
      })
      
      console.log(`✅ Creado: ${newPlayer.firstName} ${newPlayer.lastName} (${newPlayer.id})`)
    }
    
    console.log('\n📊 RESUMEN:')
    console.log(`✅ Jugadores históricos procesados: ${historicalPlayers.length}`)
    console.log('✅ Configuración aplicada:')
    console.log('   - Rol: Enfermo')
    console.log('   - Estado: Inactivo (isActive: false)')
    console.log('   - Fecha de ingreso: 2010-01-01')
    console.log('   - Imagen: Logo del grupo')
    
    console.log('\n🎯 PRÓXIMO PASO:')
    console.log('Ejecutar migración de base de datos y luego importar datos históricos')
    
  } catch (error) {
    console.error('❌ Error creando jugadores históricos:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar creación de jugadores
createHistoricalPlayers()
  .catch(console.error)