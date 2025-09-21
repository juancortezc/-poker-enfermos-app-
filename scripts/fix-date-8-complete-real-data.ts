#!/usr/bin/env tsx

/**
 * Complete fix for Date 8 using real data provided by user
 * This will replace ALL Date 8 data with the correct real data
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Player name to ID mapping (from previous scripts)
const playerMap = new Map([
  ['Fernando Peña', 'cmfbl1ama000xp8dblmchx37p'],
  ['Miguel Chiesa', 'cmfbl1ae6000rp8dbj5erik9j'],
  ['Roddy Naranjo', 'cmfbl195n0001p8dbwge7v0a6'],
  ['Ruben Cadena', 'cmfbl1a05000jp8dbvv09hppc'],
  ['Mono Benites', 'cmfbl19uq000fp8dbnvdeekj6'],
  ['Diego Behar', 'cmfbl19pd000bp8dbhwudzwur'],
  ['Juan Antonio Cortez', 'cmfbl1c0w001lp8dbef0p6on3'],
  ['Meche Garrido', 'cmfbl1b9r0019p8db1ii11dat'],
  ['Juan Tapia', 'cmfbl19ge0007p8db9bphj9j7'],
  ['Javier Martinez', 'cmfbl1axu0013p8dbz8lt3c9u'],
  ['Sean Willis', 'cmfbl1ajk000vp8dbzfs1govt'],
  ['Juan Fernando Ochoa', 'cmfbl1abh000pp8dbtb7gbx1f'],
  ['Damian Amador', 'cmfbl1a2t000lp8dbfxf99gyb'],
  ['Daniel Vela', 'cmfbl1agu000tp8dbbyqfrghw'],
  ['Jorge Tamayo', 'cmfbl19s2000dp8dbyogiettf'],
  ['Juan Guajardo', 'cmfbl19dp0005p8dbimtmb5g1'],
  ['Joffre Palacios', 'cmfbl1a5j000np8dbpesoje76'],
  ['Jose Luis Toral', 'cmfbl1bg8001bp8db63ct0xsu'],
  ['Carlos Chacón', 'cmfbl19xg000hp8dbmfmgx4kt'],
  ['Milton Tapia', 'cmfbl19b10003p8db4jdy8zri'],
  ['Agustin Guerrero', 'cmfbl1b3b0017p8dbexmswzk3'],
  ['Julio Betu', 'cmfbl1blp001fp8dbh9niq4a5'],
  ['Carlos jr', 'cmfbl1biw001dp8dbs420b2x6']
])

// Real eliminations for Date 8 (correct data from user)
const realDate8Eliminations = [
  { position: 23, eliminated: 'Milton Tapia', eliminator: 'Juan Antonio Cortez', points: 1 },
  { position: 22, eliminated: 'Carlos Chacón', eliminator: 'Sean Willis', points: 2 },
  { position: 21, eliminated: 'Jose Luis Toral', eliminator: 'Diego Behar', points: 3 },
  { position: 20, eliminated: 'Joffre Palacios', eliminator: 'Juan Fernando Ochoa', points: 4 },
  { position: 19, eliminated: 'Juan Guajardo', eliminator: 'Agustin Guerrero', points: 5 },
  { position: 18, eliminated: 'Jorge Tamayo', eliminator: 'Julio Betu', points: 6 },
  { position: 17, eliminated: 'Daniel Vela', eliminator: 'Agustin Guerrero', points: 7 },
  { position: 16, eliminated: 'Damian Amador', eliminator: 'Mono Benites', points: 8 },
  { position: 15, eliminated: 'Juan Fernando Ochoa', eliminator: 'Julio Betu', points: 9 },
  { position: 14, eliminated: 'Sean Willis', eliminator: 'Roddy Naranjo', points: 10 },
  { position: 13, eliminated: 'Javier Martinez', eliminator: 'Ruben Cadena', points: 11 },
  { position: 12, eliminated: 'Juan Tapia', eliminator: 'Diego Behar', points: 12 },
  { position: 11, eliminated: 'Carlos jr', eliminator: 'Roddy Naranjo', points: 13 },
  { position: 10, eliminated: 'Agustin Guerrero', eliminator: 'Roddy Naranjo', points: 14 },
  { position: 9, eliminated: 'Julio Betu', eliminator: 'Mono Benites', points: 16 },
  { position: 8, eliminated: 'Meche Garrido', eliminator: 'Fernando Peña', points: 17 },
  { position: 7, eliminated: 'Juan Antonio Cortez', eliminator: 'Miguel Chiesa', points: 18 },
  { position: 6, eliminated: 'Diego Behar', eliminator: 'Fernando Peña', points: 19 },
  { position: 5, eliminated: 'Mono Benites', eliminator: 'Ruben Cadena', points: 20 },
  { position: 4, eliminated: 'Ruben Cadena', eliminator: 'Roddy Naranjo', points: 21 },
  { position: 3, eliminated: 'Roddy Naranjo', eliminator: 'Fernando Peña', points: 24 },
  { position: 2, eliminated: 'Miguel Chiesa', eliminator: 'Fernando Peña', points: 27 },
  { position: 1, eliminated: 'Fernando Peña', eliminator: null, points: 30 } // Winner
]

async function fixDate8CompleteRealData() {
  console.log('🔧 Completely fixing Date 8 with real data...')
  
  try {
    // Step 1: Clear ALL existing Date 8 eliminations
    console.log('\n🧹 Step 1: Clearing all existing Date 8 eliminations...')
    const deleteResult = await prisma.elimination.deleteMany({
      where: { gameDateId: 8 }
    })
    console.log(`✅ Cleared ${deleteResult.count} existing eliminations`)
    
    // Step 2: Register all real eliminations
    console.log('\n📝 Step 2: Registering all real eliminations...')
    let successCount = 0
    let skipCount = 0
    
    for (const elimination of realDate8Eliminations) {
      const eliminatedId = playerMap.get(elimination.eliminated)
      const eliminatorId = elimination.eliminator ? playerMap.get(elimination.eliminator) : null
      
      if (!eliminatedId) {
        console.log(`⏭️  Skipping position ${elimination.position}: Player "${elimination.eliminated}" not found`)
        skipCount++
        continue
      }
      
      if (elimination.eliminator && !eliminatorId) {
        console.log(`⏭️  Skipping position ${elimination.position}: Eliminator "${elimination.eliminator}" not found`)
        skipCount++
        continue
      }
      
      // Create elimination - handle null eliminator for winner
      const finalEliminatorId = eliminatorId || eliminatedId // Use self-elimination for winner
      
      const newElimination = await prisma.elimination.create({
        data: {
          gameDateId: 8,
          position: elimination.position,
          eliminatedPlayerId: eliminatedId,
          eliminatorPlayerId: finalEliminatorId,
          points: elimination.points,
          eliminationTime: new Date('2025-06-22T12:00:00Z').toISOString()
        }
      })
      
      console.log(`✅ Position ${elimination.position}: ${elimination.eliminated} (${elimination.points} pts)`)
      successCount++
    }
    
    console.log(`\n📊 Summary:`)
    console.log(`✅ Successfully created: ${successCount} eliminations`)
    console.log(`⏭️  Skipped (player not found): ${skipCount} eliminations`)
    
    // Step 3: Verify the fix
    console.log('\n🔍 Step 3: Verifying Date 8 fix...')
    
    const verifyEliminations = await prisma.elimination.findMany({
      where: { gameDateId: 8 },
      include: {
        eliminatedPlayer: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { position: 'asc' }
    })
    
    console.log('\n📊 Verified Date 8 eliminations:')
    verifyEliminations.forEach(e => {
      const name = `${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName}`
      console.log(`Position ${e.position}: ${name} (${e.points} pts)`)
    })
    
    console.log(`\n✅ Total eliminations: ${verifyEliminations.length}`)
    
    // Step 4: Check impact on problem players
    console.log('\n📈 Step 4: Checking impact on problem players...')
    
    const problemPlayers = ['Daniel Vela', 'Jorge Tamayo', 'Juan Fernando Ochoa', 'Milton Tapia']
    
    for (const playerName of problemPlayers) {
      const nameParts = playerName.split(' ')
      const player = await prisma.player.findFirst({
        where: {
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(' ')
        }
      })
      
      if (player) {
        const allEliminations = await prisma.elimination.findMany({
          where: {
            eliminatedPlayerId: player.id,
            gameDate: {
              tournament: { number: 28 }
            }
          }
        })
        
        const totalPoints = allEliminations.reduce((sum, e) => sum + e.points, 0)
        console.log(`${playerName}: ${totalPoints} total points`)
      }
    }
    
    console.log('\n🎉 Date 8 completely fixed with real data!')
    
  } catch (error) {
    console.error('❌ Error fixing Date 8:', error)
  }
}

// Run the complete fix
fixDate8CompleteRealData()
  .catch(error => {
    console.error('❌ Fix failed:', error)
  })
  .finally(() => {
    prisma.$disconnect()
  })