#!/usr/bin/env tsx

/**
 * Script to register the real eliminations for Date 11 based on actual game results
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const adminKey = '$2b$10$uImcSJVGJTmUiOOwzZ5K6uStLtC.KYpLUZIiivzYFKGxUeA6aiOBa'
const baseUrl = 'http://localhost:3001'

// Player name to ID mapping
const playerMap = new Map([
  ['Diego', 'cmfbl19pd000bp8dbhwudzwur'],
  ['Sean', 'cmfbl1ajk000vp8dbzfs1govt'],
  ['Juan Fernando', 'cmfbl1abh000pp8dbtb7gbx1f'],
  ['Jorge', 'cmfbl19s2000dp8dbyogiettf'],
  ['Ruben', 'cmfbl1a05000jp8dbvv09hppc'],
  ['Freddy', 'cmfbl19j30009p8dbppitimmz'],
  ['Meche', 'cmfbl1b9r0019p8db1ii11dat'],
  ['Milton', 'cmfbl19b10003p8db4jdy8zri'],
  ['Miguel', 'cmfbl1ae6000rp8dbj5erik9j'],
  ['Jose Luis', 'cmfbl1bg8001bp8db63ct0xsu'],
  ['Mono', 'cmfbl19uq000fp8dbnvdeekj6'], // Assuming Anfres = Mono Benites
  ['Carlos', 'cmfbl19xg000hp8dbmfmgx4kt'],
  ['Damian', 'cmfbl1a2t000lp8dbfxf99gyb'],
  ['Javier', 'cmfbl1axu0013p8dbz8lt3c9u'],
  ['Fernando', 'cmfbl1ama000xp8dblmchx37p'],
  ['Juan Antonio', 'cmfbl1c0w001lp8dbef0p6on3'],
  ['Jose Patricio', 'cmfbl1aoz000zp8db4thegvmo'],
  ['Daniel', 'cmfbl1agu000tp8dbbyqfrghw'],
  ['Joffre', 'cmfbl1a5j000np8dbpesoje76'],
  ['Roddy', 'cmfbl195n0001p8dbwge7v0a6']
])

// Real eliminations from the game
const realEliminations = [
  { position: 20, eliminated: 'Diego', eliminator: 'Sean' },
  { position: 19, eliminated: 'Juan Fernando', eliminator: 'Jorge' },
  { position: 18, eliminated: 'Ruben', eliminator: 'Freddy' },
  { position: 17, eliminated: 'Meche', eliminator: 'Milton' },
  { position: 16, eliminated: 'Miguel', eliminator: 'Freddy' },
  { position: 15, eliminated: 'Sean', eliminator: 'Jose Luis' },
  { position: 14, eliminated: 'Mono', eliminator: 'Jose Luis' }, // Mono Benites
  { position: 13, eliminated: 'Damian', eliminator: 'Carlos' },
  { position: 12, eliminated: 'Javier', eliminator: 'Freddy' },
  { position: 11, eliminated: 'Fernando', eliminator: 'Freddy' },
  { position: 10, eliminated: 'Juan Antonio', eliminator: 'Jose Patricio' },
  { position: 9, eliminated: 'Jose Patricio', eliminator: 'Daniel' },
  { position: 8, eliminated: 'Milton', eliminator: 'Freddy' },
  { position: 7, eliminated: 'Joffre', eliminator: 'Jorge' },
  { position: 6, eliminated: 'Roddy', eliminator: 'Daniel' },
  { position: 5, eliminated: 'Jose Luis', eliminator: 'Carlos' },
  { position: 4, eliminated: 'Carlos', eliminator: 'Freddy' },
  { position: 3, eliminated: 'Freddy', eliminator: 'Jorge' },
  { position: 2, eliminated: 'Daniel', eliminator: 'Jorge' },
  // Jorge is the winner (position 1) - should be auto-created
]

async function clearExistingEliminations() {
  console.log('🧹 Clearing existing eliminations for Date 11...')
  
  try {
    const result = await prisma.elimination.deleteMany({
      where: { gameDateId: 11 }
    })
    
    console.log(`✅ Cleared ${result.count} existing eliminations`)
    return true
  } catch (error) {
    console.error('❌ Error clearing eliminations:', error)
    return false
  }
}

async function registerElimination(position: number, eliminatedName: string, eliminatorName: string) {
  const eliminatedId = playerMap.get(eliminatedName)
  const eliminatorId = playerMap.get(eliminatorName)
  
  if (!eliminatedId) {
    console.error(`❌ Position ${position}: Player "${eliminatedName}" not found in mapping`)
    return null
  }
  
  if (!eliminatorId) {
    console.error(`❌ Position ${position}: Eliminator "${eliminatorName}" not found in mapping`)
    return null
  }
  
  console.log(`Registering position ${position}: ${eliminatedName} eliminated by ${eliminatorName}`)
  
  const response = await fetch(`${baseUrl}/api/eliminations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      gameDateId: 11,
      eliminatedPlayerId: eliminatedId,
      eliminatorPlayerId: eliminatorId,
      position: position
    })
  })

  if (response.ok) {
    const result = await response.json()
    console.log(`✅ Position ${position}: ${result.eliminatedPlayer.firstName} eliminated by ${result.eliminatorPlayer.firstName} (${result.points} pts)`)
    return result
  } else {
    const error = await response.text()
    console.error(`❌ Failed at position ${position}:`, error)
    return null
  }
}

async function registerRealEliminations() {
  console.log('🏆 Registering real eliminations for Date 11...\n')
  
  // First clear existing eliminations
  const cleared = await clearExistingEliminations()
  if (!cleared) {
    console.log('❌ Failed to clear existing eliminations, stopping')
    return
  }
  
  let successCount = 0
  let failCount = 0
  
  for (const elimination of realEliminations) {
    const result = await registerElimination(
      elimination.position,
      elimination.eliminated,
      elimination.eliminator
    )
    
    if (result) {
      successCount++
      
      // Check for auto-completion after position 2
      if (elimination.position === 2) {
        console.log('\n🎯 Position 2 registered - checking for auto-completion...')
        
        // Small delay to let the auto-completion process
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Check if Jorge (winner) was automatically created
        const finalEliminations = await fetch(`${baseUrl}/api/eliminations/game-date/11`, {
          headers: {
            'Authorization': `Bearer ${adminKey}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (finalEliminations.ok) {
          const eliminations = await finalEliminations.json()
          const winner = eliminations.find((e: any) => e.position === 1)
          
          if (winner) {
            console.log(`🏆 AUTO-COMPLETED WINNER: ${winner.eliminatedPlayer.firstName} ${winner.eliminatedPlayer.lastName} (${winner.points} points)`)
            
            // Check game date status
            const gameStatusResponse = await fetch(`${baseUrl}/api/game-dates/11`, {
              headers: {
                'Authorization': `Bearer ${adminKey}`,
                'Content-Type': 'application/json'
              }
            })
            
            if (gameStatusResponse.ok) {
              const gameData = await gameStatusResponse.json()
              console.log('📊 Game date status:', gameData.gameDate.status)
            }
          } else {
            console.log('❌ Winner not auto-created')
          }
        }
      }
    } else {
      failCount++
    }
    
    // Small delay between eliminations
    await new Promise(resolve => setTimeout(resolve, 300))
  }
  
  console.log(`\n📊 Registration Summary:`)
  console.log(`✅ Successful: ${successCount}`)
  console.log(`❌ Failed: ${failCount}`)
  console.log(`📝 Total: ${realEliminations.length}`)
  
  if (failCount === 0) {
    console.log('\n🎉 All real eliminations registered successfully!')
  }
}

// Run the script
registerRealEliminations()
  .catch(error => {
    console.error('❌ Script failed:', error)
  })
  .finally(() => {
    prisma.$disconnect()
  })