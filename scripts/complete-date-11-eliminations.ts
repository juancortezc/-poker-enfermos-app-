#!/usr/bin/env tsx

/**
 * Script to complete Date 11 with eliminations from position 17 down to position 2
 * This will test the auto-completion functionality when only 2 players remain
 */

const adminKey = '$2b$10$uImcSJVGJTmUiOOwzZ5K6uStLtC.KYpLUZIiivzYFKGxUeA6aiOBa'
const baseUrl = 'http://localhost:3001'

// Player IDs from the game date 11
const players = [
  { id: "cmfbl19xg000hp8dbmfmgx4kt", name: "Carlos Chacón" },
  { id: "cmfbl1a2t000lp8dbfxf99gyb", name: "Damian Amador" }, // Already eliminated at 19
  { id: "cmfbl1agu000tp8dbbyqfrghw", name: "Daniel Vela" },
  { id: "cmfbl19pd000bp8dbhwudzwur", name: "Diego Behar" },
  { id: "cmfbl1ama000xp8dblmchx37p", name: "Fernando Peña" },
  { id: "cmfbl19j30009p8dbppitimmz", name: "Freddy Lopez" },
  { id: "cmfbl1axu0013p8dbz8lt3c9u", name: "Javier Martinez" },
  { id: "cmfbl1a5j000np8dbpesoje76", name: "Joffre Palacios" },
  { id: "cmfbl19s2000dp8dbyogiettf", name: "Jorge Tamayo" },
  { id: "cmfbl1bg8001bp8db63ct0xsu", name: "Jose Luis Toral" },
  { id: "cmfbl1aoz000zp8db4thegvmo", name: "Jose Patricio Moreno" },
  { id: "cmfbl1c0w001lp8dbef0p6on3", name: "Juan Antonio Cortez" },
  { id: "cmfbl1abh000pp8dbtb7gbx1f", name: "Juan Fernando Ochoa" },
  { id: "cmfbl1b9r0019p8db1ii11dat", name: "Meche Garrido" },
  { id: "cmfbl1ae6000rp8dbj5erik9j", name: "Miguel Chiesa" },
  { id: "cmfbl19b10003p8db4jdy8zri", name: "Milton Tapia" }, // Already eliminated at 20
  { id: "cmfbl19uq000fp8dbnvdeekj6", name: "Mono Benites" },
  { id: "cmfbl195n0001p8dbwge7v0a6", name: "Roddy Naranjo" },
  { id: "cmfbl1a05000jp8dbvv09hppc", name: "Ruben Cadena" },
  { id: "cmfbl1ajk000vp8dbzfs1govt", name: "Sean Willis" }
]

// Eliminations to register (from position 17 down to 2)
const eliminations = [
  { position: 17, eliminated: "cmfbl1agu000tp8dbbyqfrghw", eliminator: "cmfbl19j30009p8dbppitimmz" }, // Daniel Vela by Freddy Lopez
  { position: 16, eliminated: "cmfbl19xg000hp8dbmfmgx4kt", eliminator: "cmfbl1a5j000np8dbpesoje76" }, // Carlos Chacón by Joffre Palacios  
  { position: 15, eliminated: "cmfbl1ama000xp8dblmchx37p", eliminator: "cmfbl195n0001p8dbwge7v0a6" }, // Fernando Peña by Roddy Naranjo
  { position: 14, eliminated: "cmfbl1axu0013p8dbz8lt3c9u", eliminator: "cmfbl19j30009p8dbppitimmz" }, // Javier Martinez by Freddy Lopez
  { position: 13, eliminated: "cmfbl1a5j000np8dbpesoje76", eliminator: "cmfbl195n0001p8dbwge7v0a6" }, // Joffre Palacios by Roddy Naranjo
  { position: 12, eliminated: "cmfbl19s2000dp8dbyogiettf", eliminator: "cmfbl19j30009p8dbppitimmz" }, // Jorge Tamayo by Freddy Lopez
  { position: 11, eliminated: "cmfbl1bg8001bp8db63ct0xsu", eliminator: "cmfbl195n0001p8dbwge7v0a6" }, // Jose Luis Toral by Roddy Naranjo
  { position: 10, eliminated: "cmfbl1aoz000zp8db4thegvmo", eliminator: "cmfbl19j30009p8dbppitimmz" }, // Jose Patricio Moreno by Freddy Lopez
  { position: 9, eliminated: "cmfbl1c0w001lp8dbef0p6on3", eliminator: "cmfbl195n0001p8dbwge7v0a6" }, // Juan Antonio Cortez by Roddy Naranjo
  { position: 8, eliminated: "cmfbl1abh000pp8dbtb7gbx1f", eliminator: "cmfbl19j30009p8dbppitimmz" }, // Juan Fernando Ochoa by Freddy Lopez
  { position: 7, eliminated: "cmfbl1b9r0019p8db1ii11dat", eliminator: "cmfbl195n0001p8dbwge7v0a6" }, // Meche Garrido by Roddy Naranjo
  { position: 6, eliminated: "cmfbl1ae6000rp8dbj5erik9j", eliminator: "cmfbl19j30009p8dbppitimmz" }, // Miguel Chiesa by Freddy Lopez
  { position: 5, eliminated: "cmfbl19uq000fp8dbnvdeekj6", eliminator: "cmfbl195n0001p8dbwge7v0a6" }, // Mono Benites by Roddy Naranjo
  { position: 4, eliminated: "cmfbl1a05000jp8dbvv09hppc", eliminator: "cmfbl19j30009p8dbppitimmz" }, // Ruben Cadena by Freddy Lopez
  { position: 3, eliminated: "cmfbl1ajk000vp8dbzfs1govt", eliminator: "cmfbl195n0001p8dbwge7v0a6" }, // Sean Willis by Roddy Naranjo
  { position: 2, eliminated: "cmfbl19j30009p8dbppitimmz", eliminator: "cmfbl195n0001p8dbwge7v0a6" }, // Freddy Lopez by Roddy Naranjo (should auto-declare Roddy winner)
]

async function registerElimination(position: number, eliminatedId: string, eliminatorId: string) {
  console.log(`Registering elimination at position ${position}...`)
  
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
    console.log(`✅ Position ${position}: ${result.eliminatedPlayer.firstName} ${result.eliminatedPlayer.lastName} eliminated by ${result.eliminatorPlayer.firstName} ${result.eliminatorPlayer.lastName} (${result.points} pts)`)
    return result
  } else {
    const error = await response.text()
    console.error(`❌ Failed at position ${position}:`, error)
    return null
  }
}

async function completeEliminations() {
  console.log('🏆 Completing Date 11 eliminations from position 17 to 2...\n')
  
  for (const elimination of eliminations) {
    const result = await registerElimination(
      elimination.position, 
      elimination.eliminated, 
      elimination.eliminator
    )
    
    if (!result) {
      console.log('❌ Stopping due to error')
      break
    }
    
    // Small delay between eliminations
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Check if the game auto-completed after position 2
    if (elimination.position === 2) {
      console.log('\n🎯 Position 2 elimination registered - checking for auto-completion...')
      
      // Check game date status
      const statusResponse = await fetch(`${baseUrl}/api/game-dates/11`, {
        headers: {
          'Authorization': `Bearer ${adminKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (statusResponse.ok) {
        const gameDate = await statusResponse.json()
        console.log('📊 Game date status:', gameDate.gameDate.status)
        
        if (gameDate.gameDate.status === 'completed') {
          console.log('🎉 Game automatically completed after position 2!')
          
          // Get final eliminations to see the winner
          const eliminationsResponse = await fetch(`${baseUrl}/api/eliminations/game-date/11`, {
            headers: {
              'Authorization': `Bearer ${adminKey}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (eliminationsResponse.ok) {
            const finalEliminations = await eliminationsResponse.json()
            const winner = finalEliminations.find((e: any) => e.position === 1)
            if (winner) {
              console.log(`🏆 WINNER: ${winner.eliminatedPlayer.firstName} ${winner.eliminatedPlayer.lastName} (${winner.points} points)`)
            }
          }
        }
      }
    }
  }
  
  console.log('\n✅ Elimination testing completed!')
}

// Run the script
completeEliminations().catch(error => {
  console.error('❌ Script failed:', error)
})