#!/usr/bin/env tsx

/**
 * Script to fix Date 8 eliminations based on real data
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
  ['Julio Betu', 'unknown'], // Need to identify
  ['Agustin Guerrero', 'unknown'], // Need to identify
  ['Carlos jr', 'unknown'], // Need to identify
  ['Juan Tapia', 'cmfbl19ge0007p8db9bphj9j7'],
  ['Javier Martinez', 'cmfbl1axu0013p8dbz8lt3c9u'],
  ['Sean Willis', 'cmfbl1ajk000vp8dbzfs1govt'],
  ['Juan Fernando Ochoa', 'cmfbl1abh000pp8dbtb7gbx1f'],
  ['Damian Amador', 'cmfbl1a2t000lp8dbfxf99gyb'],
  ['Daniel Vela', 'cmfbl1agu000tp8dbbyqfrghw'],
  ['Jorge Tamayo', 'cmfbl19s2000dp8dbyogiettf'],
  ['Juan Guajardo', 'unknown'], // Need to identify
  ['Joffre Palacios', 'cmfbl1a5j000np8dbpesoje76'],
  ['Jose Luis Toral', 'cmfbl1bg8001bp8db63ct0xsu'],
  ['Carlos Chacón', 'cmfbl19xg000hp8dbmfmgx4kt'],
  ['Milton Tapia', 'cmfbl19b10003p8db4jdy8zri']
])

// Real eliminations for Date 8
const realEliminations = [
  { position: 23, eliminated: 'Milton Tapia', eliminator: 'Juan Antonio Cortez', points: 1 },
  { position: 22, eliminated: 'Carlos Chacón', eliminator: 'Sean Willis', points: 2 },
  { position: 21, eliminated: 'Jose Luis Toral', eliminator: 'Diego Behar', points: 3 },
  { position: 20, eliminated: 'Joffre Palacios', eliminator: 'Juan Fernando Ochoa', points: 4 },
  // Skip positions with unknown players for now
  // { position: 18, eliminated: 'Jorge Tamayo', eliminator: 'Julio Betu', points: 6 }, // Julio Betu unknown
  // { position: 17, eliminated: 'Daniel Vela', eliminator: 'Agustin Guerrero', points: 7 }, // Agustin unknown
  { position: 16, eliminated: 'Damian Amador', eliminator: 'Mono Benites', points: 8 },
  // { position: 15, eliminated: 'Juan Fernando Ochoa', eliminator: 'Julio Betu', points: 9 }, // Julio Betu unknown
  { position: 14, eliminated: 'Sean Willis', eliminator: 'Roddy Naranjo', points: 10 },
  { position: 13, eliminated: 'Javier Martinez', eliminator: 'Ruben Cadena', points: 11 },
  { position: 12, eliminated: 'Juan Tapia', eliminator: 'Diego Behar', points: 12 },
  // Skip positions with unknown players
  { position: 8, eliminated: 'Meche Garrido', eliminator: 'Fernando Peña', points: 17 },
  { position: 7, eliminated: 'Juan Antonio Cortez', eliminator: 'Miguel Chiesa', points: 18 },
  { position: 6, eliminated: 'Diego Behar', eliminator: 'Fernando Peña', points: 19 },
  { position: 5, eliminated: 'Mono Benites', eliminator: 'Ruben Cadena', points: 20 },
  { position: 4, eliminated: 'Ruben Cadena', eliminator: 'Roddy Naranjo', points: 21 },
  { position: 3, eliminated: 'Roddy Naranjo', eliminator: 'Fernando Peña', points: 24 },
  { position: 2, eliminated: 'Miguel Chiesa', eliminator: 'Fernando Peña', points: 27 },
  { position: 1, eliminated: 'Fernando Peña', eliminator: null, points: 30 } // Winner
]

async function fixDate8Eliminations() {
  console.log('🔧 Fixing Date 8 eliminations based on real data...')
  
  try {
    // First, clear existing eliminations for Date 8
    console.log('🧹 Clearing existing eliminations for Date 8...')
    const deleteResult = await prisma.elimination.deleteMany({
      where: { gameDateId: 8 }
    })
    console.log(`✅ Cleared ${deleteResult.count} existing eliminations`)
    
    // Register new eliminations
    let successCount = 0
    let skipCount = 0
    
    for (const elimination of realEliminations) {
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
          eliminationTime: new Date('2025-07-22T12:00:00Z').toISOString()
        }
      })
      
      console.log(`✅ Position ${elimination.position}: ${elimination.eliminated} (${elimination.points} pts)`)
      successCount++
    }
    
    console.log(`\\n📊 Summary:`)
    console.log(`✅ Successfully created: ${successCount} eliminations`)
    console.log(`⏭️  Skipped (unknown players): ${skipCount} eliminations`)
    
    // Update game date status to completed
    await prisma.gameDate.update({
      where: { id: 8 },
      data: { status: 'completed' }
    })
    
    console.log('✅ Updated Date 8 status to completed')
    
    console.log('\\n🎉 Date 8 eliminations fixed successfully!')
    
  } catch (error) {
    console.error('❌ Error fixing Date 8:', error)
  }
}

// Run the script
fixDate8Eliminations()
  .finally(() => {
    prisma.$disconnect()
  })