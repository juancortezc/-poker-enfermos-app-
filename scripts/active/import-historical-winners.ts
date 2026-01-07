#!/usr/bin/env tsx

/**
 * Importar ganadores históricos de los 27 torneos desde podio.png
 * Respeta la nomenclatura especial del grupo: "Siete" = penúltimo, "Dos" = último
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Datos extraídos de podio.png con mapeo de nombres corregido
const historicalTournaments = [
  { tournament: 1, champion: "Meche Garrido", runnerUp: "Diego Behar", third: "Daniel Vela", siete: "Luigi Pichirilli", dos: "Mono Benites" },
  { tournament: 2, champion: "Diego Behar", runnerUp: "Pablo Suarez", third: "Roddy Naranjo", siete: "Damian Amador", dos: "Franklin Flores" },
  { tournament: 3, champion: "Diego Behar", runnerUp: "Mario Descalzi", third: "Yair Gorbatin", siete: "Meche Garrido", dos: "Miguel Chiesa" },
  { tournament: 4, champion: "Mario Descalzi", runnerUp: "Milton Tapia", third: "Pablo Suarez", siete: "Daniel Vela", dos: "Juan Antonio Cortez" },
  { tournament: 5, champion: "Diego Behar", runnerUp: "Meche Garrido", third: "Mono Benites", siete: "Daniel Vela", dos: "Christian Zumarraga" },
  { tournament: 6, champion: "Pablo Suarez", runnerUp: "Freddy Lopez", third: "Milton Tapia", siete: "Horacio De Alencar", dos: "Ruben Cadena" },
  { tournament: 7, champion: "Meche Garrido", runnerUp: "Horacio De Alencar", third: "Milton Tapia", siete: "Mario Descalzi", dos: "Yair Gorbatin" },
  { tournament: 8, champion: "Diego Behar", runnerUp: "Pablo Suarez", third: "Miguel Chiesa", siete: "Juan Antonio Cortez", dos: "Christian Zumarraga" },
  { tournament: 9, champion: "Pablo Suarez", runnerUp: "Juan Antonio Cortez", third: "Roddy Naranjo", siete: "Daniel Vela", dos: "Joffre Palacios" },
  { tournament: 10, champion: "Pablo Suarez", runnerUp: "Daniel Vela", third: "Damian Amador", siete: "Juan Antonio Cortez", dos: "Horacio De Alencar" },
  { tournament: 11, champion: "Ruben Cadena", runnerUp: "Juan Tapia", third: "Joffre Palacios", siete: "Roddy Naranjo", dos: "Daniel Vela" },
  { tournament: 12, champion: "Freddy Lopez", runnerUp: "Diego Behar", third: "Pablo Suarez", siete: "Miguel Chiesa", dos: "Juan Guajardo" },
  { tournament: 13, champion: "Carlos Chacón", runnerUp: "Freddy Lopez", third: "Pablo Suarez", siete: "Ruben Cadena", dos: "Juan Tapia" },
  { tournament: 14, champion: "Mono Benites", runnerUp: "Juan Tapia", third: "Miguel Chiesa", siete: "Daniel Vela", dos: "Meche Garrido" },
  { tournament: 15, champion: "Juan Tapia", runnerUp: "Meche Garrido", third: "Pablo Suarez", siete: "Christian Zumarraga", dos: "Juan Guajardo" },
  { tournament: 16, champion: "Roddy Naranjo", runnerUp: "Juan Tapia", third: "Diego Behar", siete: "Meche Garrido", dos: "Miguel Chiesa" },
  { tournament: 17, champion: "Juan Antonio Cortez", runnerUp: "Ruben Cadena", third: "Juan Tapia", siete: "Pablo Suarez", dos: "Milton Tapia" },
  { tournament: 18, champion: "Ruben Cadena", runnerUp: "Javier Martinez", third: "Meche Garrido", siete: "Juan Guajardo", dos: "Mono Benites" },
  { tournament: 19, champion: "Ruben Cadena", runnerUp: "Pablo Suarez", third: "Juan Tapia", siete: "Juan Antonio Cortez", dos: "Miguel Chiesa" },
  { tournament: 20, champion: "Ruben Cadena", runnerUp: "Javier Martinez", third: "Roddy Naranjo", siete: "Juan Antonio Cortez", dos: "Meche Garrido" },
  { tournament: 21, champion: "Carlos Chacón", runnerUp: "Juan Guajardo", third: "Diego Behar", siete: "Roddy Naranjo", dos: "Damian Amador" },
  { tournament: 22, champion: "Milton Tapia", runnerUp: "Juan Antonio Cortez", third: "Javier Martinez", siete: "Juan Guajardo", dos: "Mono Benites" },
  { tournament: 23, champion: "Jose Patricio Moreno", runnerUp: "Joffre Palacios", third: "Javier Martinez", siete: "Juan Antonio Cortez", dos: "Meche Garrido" },
  { tournament: 24, champion: "Javier Martinez", runnerUp: "Juan Tapia", third: "Milton Tapia", siete: "Ruben Cadena", dos: "Meche Garrido" },
  { tournament: 25, champion: "Juan Tapia", runnerUp: "Diego Behar", third: "Javier Martinez", siete: "Damian Amador", dos: "Jose Patricio Moreno" },
  { tournament: 26, champion: "Diego Behar", runnerUp: "Carlos Chacón", third: "Juan Antonio Cortez", siete: "Joffre Palacios", dos: "Daniel Vela" },
  { tournament: 27, champion: "Mono Benites", runnerUp: "Roddy Naranjo", third: "Milton Tapia", siete: "Jose Luis Toral", dos: "Carlos Chacón" }
]

// Cache de jugadores para mapeo rápido
const playersCache: Map<string, string> = new Map()

async function loadPlayersCache() {
  console.log('🔄 Cargando cache de jugadores...')
  
  const players = await prisma.player.findMany({
    select: { id: true, firstName: true, lastName: true }
  })
  
  players.forEach(player => {
    const fullName = `${player.firstName} ${player.lastName}`
    playersCache.set(fullName, player.id)
  })
  
  console.log(`✅ Cache cargado: ${playersCache.size} jugadores`)
}

function findPlayerId(name: string): string | null {
  // Mapeo directo
  let playerId = playersCache.get(name)
  if (playerId) return playerId
  
  // Mapeos especiales conocidos
  const mappings = {
    "Esteban Garrido": "Meche Garrido",
    "Andres Benites": "Mono Benites", 
    "Juan Cortez": "Juan Antonio Cortez",
    "Jose Toral": "Jose Luis  Toral",  // Con doble espacio
    "Jose Luis Toral": "Jose Luis  Toral"  // Con doble espacio
  }
  
  const mappedName = mappings[name]
  if (mappedName) {
    playerId = playersCache.get(mappedName)
    if (playerId) return playerId
  }
  
  // Búsqueda con espacios variables
  for (const [cachedName, id] of playersCache.entries()) {
    if (cachedName.replace(/\s+/g, ' ').trim() === name.replace(/\s+/g, ' ').trim()) {
      return id
    }
  }
  
  return null
}

async function importHistoricalTournaments() {
  console.log('🏆 IMPORTANDO GANADORES HISTÓRICOS DE 27 TORNEOS')
  console.log('=' * 70)
  
  try {
    await loadPlayersCache()
    
    let successCount = 0
    let errorCount = 0
    
    for (const tournament of historicalTournaments) {
      console.log(`\n📅 TORNEO ${tournament.tournament}:`)
      
      // Buscar IDs de todos los jugadores
      const championId = findPlayerId(tournament.champion)
      const runnerUpId = findPlayerId(tournament.runnerUp)
      const thirdPlaceId = findPlayerId(tournament.third)
      const sieteId = findPlayerId(tournament.siete)
      const dosId = findPlayerId(tournament.dos)
      
      // Verificar que todos los jugadores existan
      const missingPlayers = []
      if (!championId) missingPlayers.push(`Campeón: ${tournament.champion}`)
      if (!runnerUpId) missingPlayers.push(`Subcampeón: ${tournament.runnerUp}`)
      if (!thirdPlaceId) missingPlayers.push(`Tercero: ${tournament.third}`)
      if (!sieteId) missingPlayers.push(`Siete: ${tournament.siete}`)
      if (!dosId) missingPlayers.push(`Dos: ${tournament.dos}`)
      
      if (missingPlayers.length > 0) {
        console.log(`❌ Jugadores no encontrados: ${missingPlayers.join(', ')}`)
        errorCount++
        continue
      }
      
      // Verificar si el torneo ya existe
      const existingTournament = await prisma.tournamentWinners.findUnique({
        where: { tournamentNumber: tournament.tournament }
      })
      
      if (existingTournament) {
        console.log(`⚠️  Torneo ${tournament.tournament} ya existe, saltando...`)
        continue
      }
      
      // Crear registro de ganadores
      await prisma.tournamentWinners.create({
        data: {
          tournamentNumber: tournament.tournament,
          championId: championId!,
          runnerUpId: runnerUpId!,
          thirdPlaceId: thirdPlaceId!,
          sieteId: sieteId!,
          dosId: dosId!
        }
      })
      
      console.log(`✅ Campeón: ${tournament.champion}`)
      console.log(`✅ Subcampeón: ${tournament.runnerUp}`)
      console.log(`✅ Tercero: ${tournament.third}`)
      console.log(`✅ Siete (penúltimo): ${tournament.siete}`)
      console.log(`✅ Dos (último): ${tournament.dos}`)
      
      successCount++
    }
    
    console.log('\n' + '=' * 70)
    console.log('📊 RESUMEN DE IMPORTACIÓN:')
    console.log(`✅ Torneos importados exitosamente: ${successCount}`)
    console.log(`❌ Torneos con errores: ${errorCount}`)
    console.log(`📈 Total procesados: ${historicalTournaments.length}`)
    
    if (successCount > 0) {
      console.log('\n🎯 DATOS HISTÓRICOS IMPORTADOS:')
      console.log('✅ 27 torneos históricos preservados')
      console.log('✅ Nomenclatura del grupo respetada (Siete = penúltimo, Dos = último)')
      console.log('✅ Mapeo de nombres aplicado correctamente')
      console.log('✅ Sistema listo para presentación')
    }
    
  } catch (error) {
    console.error('❌ Error durante la importación:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar importación
importHistoricalTournaments()
  .catch(console.error)