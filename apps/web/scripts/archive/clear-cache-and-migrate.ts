#!/usr/bin/env npx tsx

/**
 * Script para limpiar cache de PostgreSQL y ejecutar migración
 */

import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { writeFileSync } from 'fs'
import { join } from 'path'

async function clearCacheAndMigrate() {
  console.log('🔄 Limpiando cache de PostgreSQL y ejecutando migración...\n')

  const prisma = new PrismaClient()

  try {
    // Limpiar plan cache de PostgreSQL
    console.log('🧹 Ejecutando DISCARD ALL para limpiar cache...')
    await prisma.$executeRaw`DISCARD ALL`
    
    // Disconnect y reconnect
    await prisma.$disconnect()
    
    // Nueva conexión limpia
    const freshPrisma = new PrismaClient()
    
    console.log('📋 Verificando conexión con query simple...')
    const count = await freshPrisma.player.count()
    console.log(`   ✅ Conexión establecida: ${count} players encontrados`)
    
    // Ahora ejecutar la migración con conexión limpia
    console.log('\n🚀 Ejecutando migración con conexión limpia...')
    
    const allUsers = await freshPrisma.player.findMany({
      where: {
        isActive: true
      },
      orderBy: [
        { role: 'asc' },
        { firstName: 'asc' }
      ]
    })

    console.log(`✅ Usuarios encontrados: ${allUsers.length}`)

    // Configuración
    const JUAN_ANTONIO_PIN = '7368'
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

    // Identificar Juan Antonio
    const juanAntonio = allUsers.find(user => 
      user.firstName.toLowerCase().includes('juan') && 
      user.lastName.toLowerCase().includes('cortez')
    )

    console.log('\n🔍 Juan Antonio Cortez:')
    if (juanAntonio) {
      console.log(`   ✅ Encontrado: ${juanAntonio.firstName} ${juanAntonio.lastName}`)
      console.log(`   📌 PIN asignado: ${JUAN_ANTONIO_PIN}`)
    } else {
      console.log('   ⚠️  No encontrado')
    }

    // Generar PINs únicos
    console.log('\n🎲 Generando PINs únicos...')
    const existingPins = new Set<string>()
    const userPinData: UserPinData[] = []

    // Reservar PIN de Juan Antonio
    if (juanAntonio) {
      existingPins.add(JUAN_ANTONIO_PIN)
    }

    async function generateUniquePin(existingPins: Set<string>): Promise<string> {
      let pin: string
      let attempts = 0

      do {
        pin = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
        attempts++
        if (attempts > 100) throw new Error('No se pudo generar PIN único')
      } while (existingPins.has(pin))

      existingPins.add(pin)
      return pin
    }

    // Procesar cada usuario
    for (const user of allUsers) {
      let pin: string

      if (user.id === juanAntonio?.id) {
        pin = JUAN_ANTONIO_PIN
      } else {
        pin = await generateUniquePin(existingPins)
      }

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

    // Actualizar base de datos
    console.log('\n💾 Actualizando base de datos en transacción...')
    
    await freshPrisma.$transaction(async (tx) => {
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

      console.log(`   ✅ Actualizados ${updatedCount} usuarios`)
    })

    // Generar reportes
    console.log('\n📄 Generando reportes...')
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    
    // Crear directorio reports
    try {
      const { mkdirSync } = await import('fs')
      mkdirSync(join(process.cwd(), 'reports'), { recursive: true })
    } catch (error) {
      // Directory exists
    }

    // Reporte CSV
    const csvFileName = `pins-report-${timestamp}.csv`
    const csvPath = join(process.cwd(), 'reports', csvFileName)
    
    const csvHeader = 'ID,Nombre,Apellido,Rol,PIN,Tenía AdminKey,Activo\n'
    const csvRows = userPinData.map(user => 
      `${user.id},"${user.firstName}","${user.lastName}",${user.role},${user.pin},${user.previousAdminKey ? 'Sí' : 'No'},${user.isActive ? 'Sí' : 'No'}`
    ).join('\n')

    const csvContent = csvHeader + csvRows
    writeFileSync(csvPath, csvContent)

    // Reporte detallado
    const detailedReportPath = join(process.cwd(), 'reports', `migration-details-${timestamp}.json`)
    const roleStats = {
      Comision: userPinData.filter(u => u.role === 'Comision').length,
      Enfermo: userPinData.filter(u => u.role === 'Enfermo').length,
      Invitado: userPinData.filter(u => u.role === 'Invitado').length
    }

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

    console.log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE!')
    console.log('\n📊 Resumen:')
    console.log(`   👥 Total usuarios: ${userPinData.length}`)
    console.log(`   🔑 Con adminKey previo: ${userPinData.filter(u => u.previousAdminKey).length}`)
    console.log(`   📌 Juan Antonio PIN: ${juanAntonio ? JUAN_ANTONIO_PIN : 'No encontrado'}`)

    console.log('\n📁 Archivos generados:')
    console.log(`   📊 CSV: ${csvPath}`)
    console.log(`   📋 Detallado: ${detailedReportPath}`)

    await freshPrisma.$disconnect()

  } catch (error) {
    console.error('\n❌ ERROR:', error)
    process.exit(1)
  }
}

clearCacheAndMigrate()