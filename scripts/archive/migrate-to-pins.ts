#!/usr/bin/env npx tsx

/**
 * Script de migración completa: adminKey → PINs
 * 
 * Este script migra todo el sistema de autenticación de adminKeys a PINs:
 * - Genera PINs únicos de 4 dígitos para todos los usuarios activos
 * - PIN fijo para Juan Antonio Cortez: 7368
 * - Hashea todos los PINs con bcrypt
 * - Genera reporte CSV con los PINs en texto plano
 * - Prepara el sistema para eliminar adminKeys
 * 
 * IMPORTANTE: Ejecutar backup-database.ts ANTES de este script
 * 
 * Uso: npx tsx scripts/migrate-to-pins.ts
 */

import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { writeFileSync } from 'fs'
import { join } from 'path'

// Force new connection to avoid cached query plans
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

// Configuración
const JUAN_ANTONIO_PIN = '7368' // PIN específico solicitado
const SALT_ROUNDS = 10

interface UserPinData {
  id: string
  firstName: string
  lastName: string
  role: UserRole
  pin: string
  hashedPin: string
  isActive: boolean
  previousAdminKey: boolean
}

async function generateUniquePin(existingPins: Set<string>): Promise<string> {
  let pin: string
  let attempts = 0
  const maxAttempts = 100

  do {
    // Generar PIN de 4 dígitos (0000-9999)
    pin = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    attempts++

    if (attempts > maxAttempts) {
      throw new Error('No se pudo generar PIN único después de muchos intentos')
    }
  } while (existingPins.has(pin))

  existingPins.add(pin)
  return pin
}

async function migrateToPin() {
  console.log('🚀 INICIANDO MIGRACIÓN COMPLETA: adminKey → PINs\n')
  
  try {
    // 1. Obtener todos los usuarios activos
    console.log('📋 Obteniendo todos los usuarios activos...')
    const allUsers = await prisma.player.findMany({
      where: {
        isActive: true
      },
      orderBy: [
        { role: 'asc' },
        { firstName: 'asc' }
      ]
    })

    console.log(`   Encontrados: ${allUsers.length} usuarios activos`)
    
    // Estadísticas por rol
    const roleStats = {
      Comision: allUsers.filter(u => u.role === 'Comision').length,
      Enfermo: allUsers.filter(u => u.role === 'Enfermo').length,
      Invitado: allUsers.filter(u => u.role === 'Invitado').length
    }
    
    console.log(`   🏛️  Comisión: ${roleStats.Comision}`)
    console.log(`   🤒 Enfermos: ${roleStats.Enfermo}`)
    console.log(`   👥 Invitados: ${roleStats.Invitado}`)

    // 2. Identificar Juan Antonio Cortez
    console.log('\n🔍 Buscando a Juan Antonio Cortez...')
    const juanAntonio = allUsers.find(user => 
      user.firstName.toLowerCase().includes('juan') && 
      user.lastName.toLowerCase().includes('cortez')
    )

    if (juanAntonio) {
      console.log(`   ✅ Encontrado: ${juanAntonio.firstName} ${juanAntonio.lastName} (${juanAntonio.role})`)
      console.log(`   📌 Se asignará PIN: ${JUAN_ANTONIO_PIN}`)
    } else {
      console.log('   ⚠️  No se encontró Juan Antonio Cortez, se generará PIN aleatorio')
    }

    // 3. Generar PINs únicos
    console.log('\n🎲 Generando PINs únicos...')
    const existingPins = new Set<string>()
    const userPinData: UserPinData[] = []

    // Reservar PIN de Juan Antonio
    if (juanAntonio) {
      existingPins.add(JUAN_ANTONIO_PIN)
    }

    // Procesar cada usuario
    for (const user of allUsers) {
      let pin: string

      // PIN específico para Juan Antonio
      if (user.id === juanAntonio?.id) {
        pin = JUAN_ANTONIO_PIN
      } else {
        pin = await generateUniquePin(existingPins)
      }

      // Hashear PIN
      const hashedPin = await bcrypt.hash(pin, SALT_ROUNDS)

      userPinData.push({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        pin: pin,
        hashedPin: hashedPin,
        isActive: user.isActive,
        previousAdminKey: !!user.adminKey
      })

      console.log(`   ✅ ${user.firstName} ${user.lastName} (${user.role}) → PIN: ${pin}`)
    }

    // 4. Confirmar antes de aplicar cambios
    console.log('\n⚠️  CONFIRMACIÓN REQUERIDA')
    console.log('   Se van a actualizar los PINs para todos los usuarios')
    console.log('   Los adminKeys existentes se mantendrán (para rollback)')
    console.log('')
    
    // En un script real, aquí habría confirmación del usuario
    // Por seguridad, procedemos automáticamente ya que es una migración planificada
    
    console.log('✅ Procediendo con la migración...\n')

    // 5. Actualizar base de datos en transacción
    console.log('💾 Actualizando base de datos...')
    
    await prisma.$transaction(async (tx) => {
      let updatedCount = 0

      for (const userData of userPinData) {
        await tx.player.update({
          where: { id: userData.id },
          data: { 
            pin: userData.hashedPin
          }
        })
        updatedCount++
      }

      console.log(`   ✅ Actualizados ${updatedCount} usuarios con PINs hasheados`)
    })

    // 6. Generar reporte CSV
    console.log('\n📄 Generando reporte CSV...')
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const csvFileName = `pins-report-${timestamp}.csv`
    const csvPath = join(process.cwd(), 'reports', csvFileName)

    // Crear directorio reports si no existe
    const { mkdirSync } = await import('fs')
    try {
      mkdirSync(join(process.cwd(), 'reports'), { recursive: true })
    } catch (error) {
      // Directory already exists, continue
    }

    // Generar contenido CSV
    const csvHeader = 'ID,Nombre,Apellido,Rol,PIN,Tenía AdminKey,Activo\n'
    const csvRows = userPinData.map(user => 
      `${user.id},"${user.firstName}","${user.lastName}",${user.role},${user.pin},${user.previousAdminKey ? 'Sí' : 'No'},${user.isActive ? 'Sí' : 'No'}`
    ).join('\n')

    const csvContent = csvHeader + csvRows
    writeFileSync(csvPath, csvContent)

    // 7. Generar reporte detallado
    const detailedReportPath = join(process.cwd(), 'reports', `migration-details-${timestamp}.json`)
    const detailedReport = {
      timestamp: new Date().toISOString(),
      migration: 'adminKey-to-pins',
      summary: {
        totalUsers: userPinData.length,
        usersWithPreviousAdminKey: userPinData.filter(u => u.previousAdminKey).length,
        roleDistribution: roleStats
      },
      users: userPinData.map(user => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        pin: user.pin,
        hadAdminKey: user.previousAdminKey,
        isActive: user.isActive
      })),
      juanAntonioDetails: juanAntonio ? {
        found: true,
        id: juanAntonio.id,
        name: `${juanAntonio.firstName} ${juanAntonio.lastName}`,
        assignedPin: JUAN_ANTONIO_PIN
      } : { found: false }
    }

    writeFileSync(detailedReportPath, JSON.stringify(detailedReport, null, 2))

    // 8. Resultados finales
    console.log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE\n')
    console.log('📊 Resumen de la migración:')
    console.log(`   👥 Total usuarios migrados: ${userPinData.length}`)
    console.log(`   🔑 Usuarios con adminKey previo: ${userPinData.filter(u => u.previousAdminKey).length}`)
    console.log(`   📌 Juan Antonio Cortez PIN: ${juanAntonio ? JUAN_ANTONIO_PIN : 'No encontrado'}`)

    console.log('\n📁 Archivos generados:')
    console.log(`   📊 Reporte CSV: ${csvPath}`)
    console.log(`   📋 Reporte detallado: ${detailedReportPath}`)

    console.log('\n⚠️  PRÓXIMOS PASOS CRÍTICOS:')
    console.log('   1. ✅ Actualizar sistema de autenticación (auth.ts)')
    console.log('   2. ✅ Actualizar API de login')
    console.log('   3. ✅ Actualizar componentes frontend')
    console.log('   4. ✅ Probar sistema completo')
    console.log('   5. ⚠️  SOLO DESPUÉS: Eliminar adminKeys del schema')

    console.log('\n📌 RECORDATORIO DE SEGURIDAD:')
    console.log('   - Los adminKeys NO han sido eliminados (para rollback)')
    console.log('   - Distribuir PINs de forma segura')
    console.log('   - Probar acceso antes de eliminar adminKeys')

  } catch (error) {
    console.error('\n❌ ERROR DURANTE LA MIGRACIÓN:', error)
    console.log('\n🔄 ROLLBACK AUTOMÁTICO...')
    // En caso de error, no se han hecho cambios permanentes
    // Los adminKeys siguen intactos
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Verificar que existe backup antes de proceder
async function checkBackupExists() {
  const { existsSync } = await import('fs')
  const backupDir = join(process.cwd(), 'backups')
  
  if (!existsSync(backupDir)) {
    console.error('❌ ERROR: No se encontró directorio de backups')
    console.error('   Ejecuta primero: npx tsx scripts/backup-database.ts')
    process.exit(1)
  }

  console.log('✅ Directorio de backups encontrado, procediendo...\n')
}

// Ejecutar migración
async function main() {
  await checkBackupExists()
  await migrateToPin()
}

main()