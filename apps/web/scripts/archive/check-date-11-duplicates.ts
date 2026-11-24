#!/usr/bin/env tsx

/**
 * Script to check Date 11 for duplicate position 20
 * Real should be Diego - Sean in position 20
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDate11Duplicates() {
  console.log('🔍 Checking Date 11 for duplicate position 20...')
  
  const date11Eliminations = await prisma.elimination.findMany({
    where: { gameDateId: 11 },
    include: {
      eliminatedPlayer: {
        select: { firstName: true, lastName: true }
      }
    },
    orderBy: { position: 'asc' }
  })
  
  console.log('📊 All Date 11 eliminations:')
  date11Eliminations.forEach(e => {
    const name = `${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName}`
    console.log(`Position ${e.position}: ${name} (${e.points} pts) [ID: ${e.id}]`)
  })
  
  // Find position 20 duplicates
  const position20 = date11Eliminations.filter(e => e.position === 20)
  
  if (position20.length > 1) {
    console.log('\n❌ DUPLICATE POSITION 20 FOUND:')
    position20.forEach(e => {
      const name = `${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName}`
      console.log(`  - ${name} (ID: ${e.id}, Points: ${e.points})`)
    })
  }
  
  // Check for Diego and Sean in position 20
  const diego = position20.find(e => e.eliminatedPlayer.firstName === 'Diego')
  const sean = position20.find(e => e.eliminatedPlayer.firstName === 'Sean')
  
  console.log('\n🎯 Position 20 analysis:')
  if (diego) console.log(`Diego found in position 20: ${diego.eliminatedPlayer.firstName} ${diego.eliminatedPlayer.lastName}`)
  if (sean) console.log(`Sean found in position 20: ${sean.eliminatedPlayer.firstName} ${sean.eliminatedPlayer.lastName}`)
  
  if (!diego && !sean) {
    console.log('❌ Neither Diego nor Sean found in position 20')
  }
  
  // Check what the real data should be according to f11.jpeg
  console.log('\n📋 Expected from real data:')
  console.log('Position 20 should be: Diego Sean (1 point)')
  
  return { position20, duplicateCount: position20.length }
}

// Run the check
checkDate11Duplicates()
  .catch(error => {
    console.error('❌ Check failed:', error)
  })
  .finally(() => {
    prisma.$disconnect()
  })