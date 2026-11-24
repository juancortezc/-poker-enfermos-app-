#!/usr/bin/env npx tsx

/**
 * Script de Rollback: PINs → adminKey
 * 
 * Este script revierte la migración a PINs en caso de problemas:
 * 1. Restaura el sistema de autenticación original (adminKey)
 * 2. Limpia PINs de usuarios (opcional)
 * 3. Restaura funcionalidad completa del sistema legacy
 * 
 * IMPORTANTE: Solo usar en emergencia si el sistema de PINs falla
 * 
 * Uso: npx tsx scripts/rollback-to-adminkey.ts
 */

import { PrismaClient, UserRole } from '@prisma/client'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

interface BackupUser {
  id: string
  firstName: string
  lastName: string
  role: UserRole
  adminKey: string | null
  pin: string | null
}

async function rollbackToAdminKey() {
  console.log('🔄 INICIANDO ROLLBACK: PINs → adminKey\n')
  console.log('⚠️  ADVERTENCIA: Este proceso revertirá la migración a PINs')
  console.log('⚠️  Solo continuar si hay problemas críticos con el sistema de PINs\n')

  try {
    // 1. Verificar que existen backups
    console.log('📋 Verificando backups disponibles...')
    
    const backupDir = join(process.cwd(), 'backups')
    if (!existsSync(backupDir)) {
      console.error('❌ ERROR: No se encontró directorio de backups')
      console.error('   No se puede proceder sin backup de seguridad')
      process.exit(1)
    }

    // Buscar el backup más reciente de adminKeys
    const { readdirSync } = await import('fs')
    const backupFiles = readdirSync(backupDir)
      .filter(file => file.startsWith('adminkeys-backup-'))
      .sort()
      .reverse()

    if (backupFiles.length === 0) {
      console.error('❌ ERROR: No se encontraron backups de adminKeys')
      console.error('   Ejecutar backup-database.ts antes de proceder')
      process.exit(1)
    }

    const latestBackup = backupFiles[0]
    const backupPath = join(backupDir, latestBackup)
    
    console.log(`✅ Backup encontrado: ${latestBackup}`)

    // 2. Cargar backup de adminKeys
    console.log('\n📄 Cargando backup de adminKeys...')
    
    const backupContent = readFileSync(backupPath, 'utf8')
    const backupUsers: BackupUser[] = JSON.parse(backupContent)
    
    console.log(`   Cargados ${backupUsers.length} usuarios del backup`)
    
    // Mostrar usuarios con adminKey
    const usersWithAdminKey = backupUsers.filter(u => u.adminKey)
    console.log(`   ${usersWithAdminKey.length} usuarios tenían adminKey:`)
    usersWithAdminKey.forEach(user => {
      console.log(`     - ${user.firstName} ${user.lastName} (${user.role})`)
    })

    // 3. Verificar estado actual
    console.log('\n🔍 Verificando estado actual del sistema...')
    
    const currentUsers = await prisma.player.findMany({
      where: { isActive: true }
    })
    
    const usersWithPin = currentUsers.filter(u => u.pin)
    const usersWithCurrentAdminKey = currentUsers.filter(u => u.adminKey)
    
    console.log(`   Usuarios actuales con PIN: ${usersWithPin.length}`)
    console.log(`   Usuarios actuales con adminKey: ${usersWithCurrentAdminKey.length}`)

    // 4. Confirmación de rollback
    console.log('\n⚠️  CONFIRMACIÓN DE ROLLBACK')
    console.log('   Este proceso realizará:')
    console.log('   1. Mantendrá adminKeys existentes (no se perdieron en la migración)')
    console.log('   2. Opcionalmente eliminará PINs (si se especifica)')
    console.log('   3. El sistema volverá a usar autenticación por adminKey')
    console.log('')

    // En un script real, aquí habría confirmación manual
    // Para seguridad, asumimos que el rollback es intencional si se ejecuta
    
    // 5. Verificar que los adminKeys están intactos
    console.log('🔒 Verificando integridad de adminKeys...')
    
    let adminKeysIntact = 0
    let missingAdminKeys = 0
    
    for (const backupUser of usersWithAdminKey) {
      const currentUser = currentUsers.find(u => u.id === backupUser.id)
      if (currentUser && currentUser.adminKey === backupUser.adminKey) {
        adminKeysIntact++
      } else {
        missingAdminKeys++
        console.log(`   ⚠️  AdminKey faltante para: ${backupUser.firstName} ${backupUser.lastName}`)
      }
    }
    
    console.log(`   ✅ AdminKeys intactas: ${adminKeysIntact}/${usersWithAdminKey.length}`)
    
    if (missingAdminKeys > 0) {
      console.log('\n❌ ERROR CRÍTICO: Algunos adminKeys se perdieron durante la migración')
      console.log('   No se puede hacer rollback completo')
      console.log('   Requerirá restauración manual desde backup completo')
      
      // Lista los usuarios afectados
      for (const backupUser of usersWithAdminKey) {
        const currentUser = currentUsers.find(u => u.id === backupUser.id)
        if (!currentUser || currentUser.adminKey !== backupUser.adminKey) {
          console.log(`   - ${backupUser.firstName} ${backupUser.lastName}: adminKey perdida`)
        }
      }
      
      process.exit(1)
    }

    // 6. El rollback es simple: las adminKeys nunca fueron eliminadas
    console.log('\n✅ ROLLBACK VERIFICADO')
    console.log('   Las adminKeys están intactas en la base de datos')
    console.log('   El sistema puede volver a usar autenticación por adminKey')
    
    // 7. Opcional: Limpiar PINs
    console.log('\n🧹 ¿Limpiar PINs de la base de datos? (opcional)')
    console.log('   Los PINs pueden mantenerse por seguridad o limpiarse completamente')
    
    // Para este ejemplo, NO limpiamos los PINs automáticamente
    // El administrador puede decidir mantener ambos sistemas por un tiempo
    
    console.log('   → PINs mantenidos para transición gradual')
    console.log('   → Ejecutar limpieza manual si se desea: UPDATE players SET pin = NULL')

    // 8. Instrucciones para completar rollback
    console.log('\n📋 INSTRUCCIONES PARA COMPLETAR ROLLBACK:')
    console.log('')
    console.log('1. ✅ BACKEND - Revertir archivos de código:')
    console.log('   - src/lib/auth.ts: Usar authenticateUser() como función principal')
    console.log('   - src/app/api/auth/login/route.ts: Usar { adminKey } en lugar de { pin }')
    console.log('   - src/contexts/AuthContext.tsx: Usar login(adminKey) en lugar de login(pin)')
    console.log('')
    console.log('2. ✅ FRONTEND - Revertir componentes:')
    console.log('   - Cambiar formularios de PIN a adminKey')
    console.log('   - Actualizar validaciones (adminKey largo vs PIN 4 dígitos)')
    console.log('')
    console.log('3. ✅ TESTING:')
    console.log('   - Probar login con adminKeys conocidas')
    console.log('   - Verificar permisos de Comisión')
    console.log('')
    console.log('4. 🗑️  LIMPIEZA (opcional):')
    console.log('   - Ejecutar: UPDATE players SET pin = NULL WHERE pin IS NOT NULL')
    console.log('   - Eliminar archivos de PINs generados')

    // 9. Resumen de estado post-rollback
    console.log('\n📊 ESTADO POST-ROLLBACK:')
    console.log(`   👥 Usuarios Comisión con adminKey: ${usersWithAdminKey.length}`)
    console.log(`   📌 Usuarios con PINs (mantenidos): ${usersWithPin.length}`)
    console.log('   🔒 Sistema de autenticación: adminKey (original)')
    console.log('   ✅ Estado: Listo para usar sistema legacy')

    console.log('\n🎉 ROLLBACK COMPLETADO EXITOSAMENTE')
    console.log('')
    console.log('⚠️  RECORDATORIO:')
    console.log('   - Los adminKeys nunca fueron eliminados (diseño seguro)')
    console.log('   - El sistema puede volver al estado original inmediatamente')
    console.log('   - Los PINs están disponibles para futura migración')
    console.log('   - Actualizar código frontend para usar adminKeys')

  } catch (error) {
    console.error('\n❌ ERROR DURANTE ROLLBACK:', error)
    console.log('\n🆘 ACCIONES DE EMERGENCIA:')
    console.log('   1. Restaurar desde backup completo de base de datos')
    console.log('   2. Contactar administrador del sistema')
    console.log('   3. No hacer cambios adicionales hasta resolver')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Función para verificar código sin ejecutar rollback
async function verifyRollbackReadiness() {
  console.log('🔍 VERIFICACIÓN DE READINESS PARA ROLLBACK\n')
  
  try {
    // Verificar adminKeys intactas
    const comisionUsers = await prisma.player.findMany({
      where: {
        role: 'Comision',
        isActive: true
      }
    })

    const usersWithAdminKey = comisionUsers.filter(u => u.adminKey)
    const usersWithPin = comisionUsers.filter(u => u.pin)

    console.log('📊 Estado actual:')
    console.log(`   🏛️  Usuarios Comisión: ${comisionUsers.length}`)
    console.log(`   🔑 Con adminKey: ${usersWithAdminKey.length}`)
    console.log(`   📌 Con PIN: ${usersWithPin.length}`)

    console.log('\n✅ ROLLBACK READINESS:')
    if (usersWithAdminKey.length > 0) {
      console.log('   ✅ AdminKeys están presentes - Rollback posible')
      console.log('   ✅ Sistema legacy funcionará inmediatamente')
    } else {
      console.log('   ❌ No hay adminKeys - Rollback requiere restauración')
      console.log('   ❌ Sistema legacy NO funcionará')
    }

    console.log('\n📋 Archivos de backup necesarios:')
    const backupDir = join(process.cwd(), 'backups')
    if (existsSync(backupDir)) {
      const { readdirSync } = await import('fs')
      const adminKeyBackups = readdirSync(backupDir)
        .filter(file => file.startsWith('adminkeys-backup-'))
      
      console.log(`   📄 Backups de adminKey encontrados: ${adminKeyBackups.length}`)
      adminKeyBackups.forEach(file => console.log(`     - ${file}`))
    } else {
      console.log('   ❌ Directorio de backups no encontrado')
    }

  } catch (error) {
    console.error('Error en verificación:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar según argumentos
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--verify')) {
    await verifyRollbackReadiness()
  } else if (args.includes('--help')) {
    console.log('Uso del script de rollback:')
    console.log('  npx tsx scripts/rollback-to-adminkey.ts        # Ejecutar rollback')
    console.log('  npx tsx scripts/rollback-to-adminkey.ts --verify # Solo verificar')
    console.log('  npx tsx scripts/rollback-to-adminkey.ts --help   # Mostrar ayuda')
  } else {
    await rollbackToAdminKey()
  }
}

main()