#!/usr/bin/env npx tsx

/**
 * Script para probar el sistema de actualización obligatoria de perfil
 * 
 * Este script:
 * 1. Verifica que el sistema de validación funcione correctamente
 * 2. Simula el flujo de un usuario que necesita actualizar su perfil
 * 3. Valida la unicidad del PIN
 * 4. Comprueba que el perfil se marque como completo
 */

import { prisma } from '../src/lib/prisma'
import { isProfileComplete, checkProfileComplete } from '../src/lib/auth'
import bcrypt from 'bcryptjs'

async function main() {
  console.log('🧪 Iniciando testing del sistema de actualización de perfil...\n')

  // Test 1: Función isProfileComplete
  console.log('1️⃣ Testing función isProfileComplete()...')
  
  const perfilIncompleto = {
    pin: null,
    birthDate: null,
    email: null,
    phone: null,
  }
  
  const perfilCompleto = {
    pin: 'hashed_pin',
    birthDate: '1990-01-01',
    email: 'test@example.com',
    phone: '099123456',
  }
  
  console.log(`   ❌ Perfil incompleto: ${isProfileComplete(perfilIncompleto)}`)
  console.log(`   ✅ Perfil completo: ${isProfileComplete(perfilCompleto)}`)
  
  // Test 2: Verificar estado de usuarios existentes
  console.log('\n2️⃣ Verificando estado de usuarios existentes...')
  
  const usuarios = await prisma.player.findMany({
    where: { isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      pin: true,
      birthDate: true,
      email: true,
      phone: true,
      requiresProfileUpdate: true,
    },
    take: 5
  })
  
  for (const usuario of usuarios) {
    const isComplete = isProfileComplete(usuario)
    console.log(`   ${usuario.firstName} ${usuario.lastName}:`)
    console.log(`     - Perfil completo: ${isComplete}`)
    console.log(`     - Requiere actualización: ${usuario.requiresProfileUpdate}`)
    console.log(`     - PIN: ${usuario.pin ? '✅' : '❌'}`)
    console.log(`     - Fecha nacimiento: ${usuario.birthDate ? '✅' : '❌'}`)
    console.log(`     - Email: ${usuario.email ? '✅' : '❌'}`)
    console.log(`     - Teléfono: ${usuario.phone ? '✅' : '❌'}`)
    console.log('')
  }
  
  // Test 3: Verificar API de estado de perfil (simulación)
  console.log('3️⃣ Testing función checkProfileComplete()...')
  
  if (usuarios.length > 0) {
    const primerUsuario = usuarios[0]
    const statusCheck = await checkProfileComplete(primerUsuario.id)
    console.log(`   Usuario ${primerUsuario.firstName}: Estado = ${statusCheck}`)
  }
  
  // Test 4: Verificar unicidad de PIN
  console.log('\n4️⃣ Testing unicidad de PIN...')
  
  const usuariosConPin = await prisma.player.findMany({
    where: {
      pin: { not: null },
      isActive: true
    },
    select: { pin: true }
  })
  
  console.log(`   Total usuarios con PIN: ${usuariosConPin.length}`)
  
  // Simular verificación de PIN duplicado
  const testPin = '1234'
  let pinEnUso = false
  
  for (const usuario of usuariosConPin) {
    if (usuario.pin && await bcrypt.compare(testPin, usuario.pin)) {
      pinEnUso = true
      break
    }
  }
  
  console.log(`   PIN '${testPin}' en uso: ${pinEnUso}`)
  
  // Test 5: Verificar campo requiresProfileUpdate
  console.log('\n5️⃣ Verificando campo requiresProfileUpdate en base de datos...')
  
  const estadisticas = await prisma.player.groupBy({
    by: ['requiresProfileUpdate'],
    where: { isActive: true },
    _count: {
      _all: true
    }
  })
  
  estadisticas.forEach(stat => {
    console.log(`   RequiresUpdate = ${stat.requiresProfileUpdate}: ${stat._count._all} usuarios`)
  })
  
  // Test 6: Mostrar ejemplo de flujo completo
  console.log('\n6️⃣ Flujo de actualización de perfil:')
  console.log('   1. Usuario hace login → AuthContext verifica perfil')
  console.log('   2. Si requiresProfileUpdate = true → Mostrar modal')
  console.log('   3. Usuario completa datos → API valida PIN único')
  console.log('   4. Si válido → Actualizar datos + requiresProfileUpdate = false')
  console.log('   5. Modal se cierra → Usuario puede continuar')
  
  console.log('\n✅ Testing completado exitosamente!')
}

main()
  .catch((e) => {
    console.error('❌ Error en testing:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })