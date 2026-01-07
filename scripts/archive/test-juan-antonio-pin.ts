#!/usr/bin/env npx tsx

import { authenticateUserByPin } from '@/lib/auth'

async function testJuanAntonioPin() {
  console.log('🔍 Testing Juan Antonio PIN 7368...')
  
  try {
    const result = await authenticateUserByPin('7368')
    
    if (result) {
      console.log('✅ PIN 7368 authentication SUCCESSFUL!')
      console.log(`   👤 Usuario: ${result.firstName} ${result.lastName}`)
      console.log(`   🏛️  Rol: ${result.role}`)
      console.log(`   🆔 ID: ${result.id}`)
    } else {
      console.log('❌ PIN 7368 authentication FAILED')
    }
  } catch (error) {
    console.error('❌ Error testing PIN:', error)
  }
}

testJuanAntonioPin()