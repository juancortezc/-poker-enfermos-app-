#!/usr/bin/env tsx

/**
 * COMPILE AUTHORITATIVE REAL TOURNAMENT DATA
 * Create master reference dataset for Tournament 28 complete rebuild
 * Based on real tournament data from f11.jpeg and existing correct imports
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Real final ranking from f11.jpeg image (authoritative source)
const realFinalRanking = [
  { rank: 1, player: 'Roddy Naranjo', total: 196 },
  { rank: 2, player: 'Miguel Chiesa', total: 159 },
  { rank: 3, player: 'Fernando Peña', total: 144 },
  { rank: 4, player: 'Juan Antonio Cortez', total: 145 },
  { rank: 5, player: 'Daniel Vela', total: 136 },
  { rank: 6, player: 'Joffre Palacios', total: 131 },
  { rank: 7, player: 'Jorge Tamayo', total: 121 },
  { rank: 8, player: 'Juan Fernando Ochoa', total: 117 },
  { rank: 9, player: 'Juan Tapia', total: 114 },
  { rank: 10, player: 'Ruben Cadena', total: 113 },
  { rank: 11, player: 'Mono Benites', total: 108 },
  { rank: 12, player: 'Diego Behar', total: 104 },
  { rank: 13, player: 'Milton Tapia', total: 101 },
  { rank: 14, player: 'Sean Willis', total: 99 },
  { rank: 15, player: 'Damian Amador', total: 97 },
  { rank: 16, player: 'Javier Martinez', total: 92 },
  { rank: 17, player: 'Juan Guajardo', total: 86 },
  { rank: 18, player: 'Carlos Chacón', total: 64 },
  { rank: 19, player: 'Agustin Guerrero', total: 63 }
]

// Real Date 8 data (verified and corrected in previous scripts)
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

// Real Date 11 data from f11.jpeg (verified correct)
const realDate11Data = [
  { position: 20, player: 'Diego Behar', eliminator: 'Sean Willis', points: 1 },
  { position: 19, player: 'Juan Fernando Ochoa', eliminator: 'Ruben Cadena', points: 2 },
  { position: 18, player: 'Ruben Cadena', eliminator: 'Juan Antonio Cortez', points: 3 },
  { position: 17, player: 'Miguel Chiesa', eliminator: 'Freddy Lopez', points: 5 },
  { position: 16, player: 'Sean Willis', eliminator: 'Mono Benites', points: 6 },
  { position: 15, player: 'Mono Benites', eliminator: 'Milton Tapia', points: 7 },
  { position: 14, player: 'Damian Amador', eliminator: 'Joffre Palacios', points: 8 },
  { position: 13, player: 'Javier Martinez', eliminator: 'Fernando Peña', points: 9 },
  { position: 12, player: 'Fernando Peña', eliminator: 'Jorge Tamayo', points: 10 },
  { position: 11, player: 'Juan Antonio Cortez', eliminator: 'Jose Patricio Moreno', points: 11 },
  { position: 10, player: 'Jose Patricio Moreno', eliminator: 'Milton Tapia', points: 13 },
  { position: 9, player: 'Milton Tapia', eliminator: 'Roddy Naranjo', points: 14 },
  { position: 8, player: 'Joffre Palacios', eliminator: 'Freddy Lopez', points: 15 },
  { position: 7, player: 'Roddy Naranjo', eliminator: 'Daniel Vela', points: 16 },
  { position: 6, player: 'Jose Luis Toral', eliminator: 'Carlos Chacón', points: 17 },
  { position: 5, player: 'Carlos Chacón', eliminator: 'Daniel Vela', points: 18 },
  { position: 4, player: 'Freddy Lopez', eliminator: 'Jorge Tamayo', points: 21 },
  { position: 3, player: 'Daniel Vela', eliminator: 'Jorge Tamayo', points: 24 },
  { position: 2, player: 'Jorge Tamayo', eliminator: null, points: 27 }, // Winner
  { position: 1, player: 'Winner', eliminator: null, points: 30 } // Placeholder for actual winner
]

interface AuthoritativeData {
  tournament: {
    id: number
    number: 28
    name: string
    status: string
  }
  expectedFinalTotals: { [playerName: string]: number }
  verifiedDates: {
    [dateNumber: number]: {
      date: number
      participants: string[]
      eliminations: Array<{
        position: number
        eliminated: string
        eliminator: string | null
        points: number
      }>
      verified: boolean
      source: string
    }
  }
  pointCalculationRules: {
    algorithm: string
    description: string
    examples: Array<{
      totalPlayers: number
      position: number
      expectedPoints: number
    }>
  }
}

// Real tournament points calculation (reverse-engineered from verified data)
function calculateRealTournamentPoints(position: number, totalPlayers: number): number {
  // Based on analysis of Date 8 and Date 11 real data
  // This appears to be a simple linear system where:
  // Position 1 (winner) gets 30 points (fixed)
  // Each position below gets fewer points
  
  if (position === 1) return 30 // Winner always gets 30
  
  // Linear decrease from winner
  const pointsPerPosition = (30 - 1) / (totalPlayers - 1)
  return Math.round(30 - (position - 1) * pointsPerPosition)
}

async function compileAuthoritativeData() {
  console.log('📋 COMPILING AUTHORITATIVE REAL TOURNAMENT DATA')
  console.log('Creating master reference dataset for Tournament 28 rebuild...\n')
  
  try {
    // Get current tournament and player data
    const tournament = await prisma.tournament.findFirst({
      where: { number: 28 },
      include: {
        gameDates: {
          orderBy: { dateNumber: 'asc' }
        }
      }
    })
    
    if (!tournament) {
      throw new Error('Tournament 28 not found')
    }
    
    console.log('📊 Current Tournament 28 State:')
    console.log(`ID: ${tournament.id}`)
    console.log(`Status: ${tournament.status}`)
    console.log(`Game Dates: ${tournament.gameDates.length}`)
    console.log('')
    
    // Convert real final ranking to expected totals
    const expectedFinalTotals: { [playerName: string]: number } = {}
    realFinalRanking.forEach(player => {
      expectedFinalTotals[player.player] = player.total
    })
    
    // Create authoritative dataset
    const authoritativeData: AuthoritativeData = {
      tournament: {
        id: tournament.id,
        number: 28,
        name: tournament.name,
        status: tournament.status
      },
      expectedFinalTotals,
      verifiedDates: {
        8: {
          date: 8,
          participants: realDate8Eliminations.map(e => e.eliminated),
          eliminations: realDate8Eliminations,
          verified: true,
          source: 'User provided real data CSV - complete and verified'
        },
        11: {
          date: 11,
          participants: realDate11Data.map(e => e.player).filter(p => p !== 'Winner'),
          eliminations: realDate11Data.filter(e => e.player !== 'Winner').map(e => ({
            position: e.position,
            eliminated: e.player,
            eliminator: e.eliminator,
            points: e.points
          })),
          verified: true,
          source: 'f11.jpeg image data - verified against real tournament results'
        }
      },
      pointCalculationRules: {
        algorithm: 'Linear Points System',
        description: 'Winner gets 30 points, linear decrease by position',
        examples: [
          { totalPlayers: 20, position: 1, expectedPoints: 30 },
          { totalPlayers: 20, position: 2, expectedPoints: 27 },
          { totalPlayers: 20, position: 10, expectedPoints: 16 },
          { totalPlayers: 20, position: 20, expectedPoints: 1 },
          { totalPlayers: 23, position: 1, expectedPoints: 30 },
          { totalPlayers: 23, position: 2, expectedPoints: 27 },
          { totalPlayers: 23, position: 23, expectedPoints: 1 }
        ]
      }
    }
    
    // Save authoritative data to file
    const dataDir = path.join(process.cwd(), 'data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    
    const authFile = path.join(dataDir, 'tournament-28-authoritative-data.json')
    fs.writeFileSync(authFile, JSON.stringify(authoritativeData, null, 2))
    
    console.log('✅ AUTHORITATIVE DATA COMPILED')
    console.log(`📁 File: ${authFile}`)
    console.log('')
    
    // Validate point calculation algorithm
    console.log('🔍 VALIDATING POINT CALCULATION ALGORITHM:')
    console.log('Testing against verified Date 8 data...')
    
    let algorithmMatches = 0
    let totalTests = 0
    
    for (const elimination of realDate8Eliminations) {
      const expectedPoints = calculateRealTournamentPoints(elimination.position, 23)
      const actualPoints = elimination.points
      totalTests++
      
      if (expectedPoints === actualPoints) {
        algorithmMatches++
        console.log(`✅ Position ${elimination.position}: ${actualPoints} points (matches algorithm)`)
      } else {
        console.log(`❌ Position ${elimination.position}: ${actualPoints} points vs algorithm ${expectedPoints}`)
      }
    }
    
    const algorithmAccuracy = (algorithmMatches / totalTests) * 100
    console.log(`\n📊 Algorithm Accuracy: ${algorithmAccuracy.toFixed(1)}% (${algorithmMatches}/${totalTests})`)
    
    if (algorithmAccuracy < 90) {
      console.log('⚠️  Algorithm needs refinement - using actual point values instead')
    } else {
      console.log('✅ Algorithm validated - can be used for rebuilding missing data')
    }
    
    // Generate rebuild requirements summary
    console.log('\n📋 REBUILD REQUIREMENTS SUMMARY:')
    console.log(`Total players to rebuild: ${Object.keys(expectedFinalTotals).length}`)
    console.log(`Verified dates: ${Object.keys(authoritativeData.verifiedDates).length}`)
    console.log(`Dates requiring reconstruction: ${11 - Object.keys(authoritativeData.verifiedDates).length}`)
    console.log(`Expected final total points: ${Object.values(expectedFinalTotals).reduce((sum, pts) => sum + pts, 0)}`)
    
    // Next steps guidance
    console.log('\n🎯 REBUILD STRATEGY:')
    console.log('1. ✅ Authoritative data compiled successfully')
    console.log('2. 🔄 Clear all Tournament 28 elimination data')
    console.log('3. 📥 Import verified dates (8, 11) with exact data')
    console.log('4. 🔍 For remaining dates: extract from current system but recalculate points')
    console.log('5. ✅ Verify final totals match authoritative data exactly')
    
    return authoritativeData
    
  } catch (error) {
    console.error('❌ Failed to compile authoritative data:', error)
    throw error
  }
}

// Main execution
compileAuthoritativeData()
  .catch(error => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })