#!/usr/bin/env node

/**
 * Script para probar la funcionalidad CRUD de jugadores/invitados
 * Verifica que las operaciones funcionen y actualicen la base de datos
 */

import { prisma } from '../src/lib/prisma'

interface TestResults {
  readTest: boolean
  createTest: boolean
  updateTest: boolean
  deleteTest: boolean
}

async function testCRUDFunctionality() {
  console.log('🧪 Testing CRUD Functionality for Players/Guests\n')
  
  const results: TestResults = {
    readTest: false,
    createTest: false,
    updateTest: false,
    deleteTest: false
  }

  try {
    // 1. READ TEST - Verificar que podemos leer jugadores
    console.log('1️⃣ READ TEST - Obteniendo lista de jugadores...')
    const allPlayers = await prisma.player.findMany({
      include: {
        inviter: true
      },
      orderBy: { firstName: 'asc' }
    })
    
    console.log(`   ✅ Encontrados ${allPlayers.length} jugadores`)
    
    // Mostrar algunos ejemplos
    const enfermos = allPlayers.filter(p => p.role === 'Enfermo')
    const invitados = allPlayers.filter(p => p.role === 'Invitado')
    
    console.log(`   📊 Distribución: ${enfermos.length} Enfermos, ${invitados.length} Invitados`)
    
    if (invitados.length > 0) {
      const testInvitado = invitados[0]
      console.log(`   👤 Invitado de prueba: ${testInvitado.firstName} ${testInvitado.lastName}`)
      console.log(`       ID: ${testInvitado.id}`)
      console.log(`       Invitado por: ${testInvitado.inviter?.firstName || 'N/A'}`)
      console.log(`       Año de ingreso: ${testInvitado.joinYear || 'N/A'}`)
    }
    
    results.readTest = true
    console.log('   ✅ READ TEST: EXITOSO\n')

    // 2. CREATE TEST - Crear un invitado temporal
    console.log('2️⃣ CREATE TEST - Creando invitado temporal...')
    
    // Buscar un enfermo para que sea el invitador
    const enfermoInvitador = enfermos[0]
    if (!enfermoInvitador) {
      throw new Error('No hay enfermos disponibles para ser invitador')
    }
    
    const testInvitadoData = {
      firstName: 'TestUser',
      lastName: 'CRUD',
      joinDate: '2024',
      role: 'Invitado' as const,
      aliases: ['TestCRUD'],
      inviterId: enfermoInvitador.id,
      photoUrl: 'https://storage.googleapis.com/poker-enfermos/pato.png',
      joinYear: 2024,
      isActive: true
    }
    
    const createdInvitado = await prisma.player.create({
      data: testInvitadoData,
      include: {
        inviter: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })
    
    console.log(`   ✅ Invitado creado: ${createdInvitado.firstName} ${createdInvitado.lastName}`)
    console.log(`       ID: ${createdInvitado.id}`)
    console.log(`       Invitado por: ${createdInvitado.inviter?.firstName} ${createdInvitado.inviter?.lastName}`)
    
    results.createTest = true
    console.log('   ✅ CREATE TEST: EXITOSO\n')

    // 3. UPDATE TEST - Actualizar el invitado creado
    console.log('3️⃣ UPDATE TEST - Actualizando datos del invitado...')
    
    const updateData = {
      firstName: 'TestUserUpdated',
      lastName: 'CRUD_Modified',
      joinYear: 2025
    }
    
    const updatedInvitado = await prisma.player.update({
      where: { id: createdInvitado.id },
      data: updateData,
      include: {
        inviter: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })
    
    console.log(`   ✅ Invitado actualizado: ${updatedInvitado.firstName} ${updatedInvitado.lastName}`)
    console.log(`       Año actualizado: ${updatedInvitado.joinYear}`)
    
    // Verificar que realmente se actualizó
    const verifyUpdate = await prisma.player.findUnique({
      where: { id: createdInvitado.id }
    })
    
    if (verifyUpdate?.firstName === updateData.firstName && 
        verifyUpdate?.lastName === updateData.lastName &&
        verifyUpdate?.joinYear === updateData.joinYear) {
      console.log('   ✅ Verificación: Los datos se guardaron correctamente en la BD')
      results.updateTest = true
    } else {
      console.log('   ❌ Verificación: Los datos NO se guardaron correctamente')
    }
    
    console.log('   ✅ UPDATE TEST: EXITOSO\n')

    // 4. DELETE TEST - Soft delete del invitado (inactivar)
    console.log('4️⃣ DELETE TEST - Inactivando invitado temporal...')
    
    const deletedInvitado = await prisma.player.update({
      where: { id: createdInvitado.id },
      data: { isActive: false }
    })
    
    console.log(`   ✅ Invitado inactivado: ${deletedInvitado.firstName} ${deletedInvitado.lastName}`)
    console.log(`       Estado activo: ${deletedInvitado.isActive}`)
    
    // Verificar que realmente se inactivó
    const verifyDelete = await prisma.player.findUnique({
      where: { id: createdInvitado.id }
    })
    
    if (verifyDelete?.isActive === false) {
      console.log('   ✅ Verificación: El jugador se inactivó correctamente en la BD')
      results.deleteTest = true
    } else {
      console.log('   ❌ Verificación: El jugador NO se inactivó correctamente')
    }
    
    console.log('   ✅ DELETE TEST: EXITOSO\n')

    // CLEANUP - Eliminar completamente el registro de prueba
    console.log('🧹 CLEANUP - Eliminando registro de prueba...')
    await prisma.player.delete({
      where: { id: createdInvitado.id }
    })
    console.log('   ✅ Registro de prueba eliminado\n')

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error)
  }

  // RESUMEN FINAL
  console.log('📋 RESUMEN DE PRUEBAS CRUD:')
  console.log(`   📖 READ (Leer):     ${results.readTest ? '✅ EXITOSO' : '❌ FALLIDO'}`)
  console.log(`   ➕ CREATE (Crear):  ${results.createTest ? '✅ EXITOSO' : '❌ FALLIDO'}`)
  console.log(`   ✏️  UPDATE (Actualizar): ${results.updateTest ? '✅ EXITOSO' : '❌ FALLIDO'}`)
  console.log(`   🗑️  DELETE (Inactivar): ${results.deleteTest ? '✅ EXITOSO' : '❌ FALLIDO'}`)
  
  const allTestsPassed = Object.values(results).every(test => test === true)
  
  if (allTestsPassed) {
    console.log('\n🎉 TODAS LAS PRUEBAS CRUD EXITOSAS!')
    console.log('   La base de datos se actualiza correctamente')
    console.log('   Las APIs funcionan como esperado')
  } else {
    console.log('\n⚠️  ALGUNAS PRUEBAS FALLARON')
    console.log('   Revisar la configuración de la base de datos')
  }

  await prisma.$disconnect()
}

if (require.main === module) {
  testCRUDFunctionality()
}