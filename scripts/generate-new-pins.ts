import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

// Define players with their new PINs
const playerPins = [
  { id: 'cmfbl1b3b0017p8dbexmswzk3', name: 'Agustin Guerrero', pin: '2341' },
  { id: 'cmfbl1brn001jp8db92rbqqg9', name: 'Alejandro Perez', pin: '3456' },
  { id: 'cmfbl1b0l0015p8dbk7us4l69', name: 'Apolinar Externo', pin: '4678' },
  { id: 'cmfbl19xg000hp8dbmfmgx4kt', name: 'Carlos Chacón', pin: '5789' },
  { id: 'cmfbl1biw001dp8dbs420b2x6', name: 'Carlos jr', pin: '6890' },
  { id: 'cmfbl1a2t000lp8dbfxf99gyb', name: 'Damian Amador', pin: '7901' },
  { id: 'cmfbl1agu000tp8dbbyqfrghw', name: 'Daniel Vela', pin: '8012' },
  { id: 'cmfh9k3vg0001p8grkg6a3jpn', name: 'Felipe Proano', pin: '9123' },
  { id: 'cmfbl1ama000xp8dblmchx37p', name: 'Fernando Peña', pin: '1234' },
  { id: 'cmfbl19j30009p8dbppitimmz', name: 'Freddy Lopez', pin: '2345' },
  { id: 'cmffupcev0000p8wqut8kn71v', name: 'Invitado Genérico', pin: '3467' },
  { id: 'cmfbl1aro0011p8dbbpksrzy1', name: 'Invitado SN', pin: '4578' },
  { id: 'cmfbl1a5j000np8dbpesoje76', name: 'Joffre Palacios', pin: '5689' },
  { id: 'cmfvjlxva0000p8fm86fs09ml', name: 'Jose Patricio Moreno (Inv)', pin: '6790' },
  { id: 'cmfbl1aoz000zp8db4thegvmo', name: 'Jose Patricio Moreno', pin: '7801' },
  { id: 'cmfbl19dp0005p8dbimtmb5g1', name: 'Juan Guajardo', pin: '8912' },
  { id: 'cmfbl19ge0007p8db9bphj9j7', name: 'Juan Tapia', pin: '9023' },
  { id: 'cmfbl1blp001fp8dbh9niq4a5', name: 'Julio Betu', pin: '1345' },
  { id: 'cmfbl1ae6000rp8dbj5erik9j', name: 'Miguel Chiesa', pin: '2456' },
  { id: 'cmfbl19b10003p8db4jdy8zri', name: 'Milton Tapia', pin: '3568' },
  { id: 'cmfbl195n0001p8dbwge7v0a6', name: 'Roddy Naranjo', pin: '4679' },
  { id: 'cmfbl1a05000jp8dbvv09hppc', name: 'Ruben Cadena', pin: '5780' },
  { id: 'cmfbl1ajk000vp8dbzfs1govt', name: 'Sean Willis', pin: '6891' },
  { id: 'cmfbl1bos001hp8db64v2q566', name: 'Sebastian Caicedo', pin: '7902' }
]

async function generateAndUpdatePins() {
  console.log('🔄 Starting PIN updates for', playerPins.length, 'players...\n')
  
  const results = []
  
  for (const player of playerPins) {
    try {
      // Hash the PIN
      const hashedPIN = await bcrypt.hash(player.pin, 10)
      
      // Update the player's PIN
      await prisma.player.update({
        where: { id: player.id },
        data: { pin: hashedPIN }
      })
      
      console.log(`✅ ${player.name} - PIN: ${player.pin}`)
      results.push({ name: player.name, pin: player.pin, status: 'success' })
      
    } catch (error) {
      console.error(`❌ Error updating ${player.name}:`, error)
      results.push({ name: player.name, pin: player.pin, status: 'error', error })
    }
  }
  
  console.log('\n📋 FINAL SUMMARY:')
  console.log('================')
  results.forEach(result => {
    console.log(`${result.name}: ${result.pin} ${result.status === 'success' ? '✅' : '❌'}`)
  })
  
  const successful = results.filter(r => r.status === 'success').length
  const failed = results.filter(r => r.status === 'error').length
  
  console.log(`\n📊 Results: ${successful} successful, ${failed} failed`)
  
  return results
}

generateAndUpdatePins()
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })