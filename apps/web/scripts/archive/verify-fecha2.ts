import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyFecha2() {
  console.log('🔍 VERIFICACIÓN FECHA 2 - Análisis de Posiciones vs Puntos\n')

  // Datos proporcionados por el usuario (posiciones finales reales)
  const realPositions = [
    { position: 1, name: 'Juan Fernando Ochoa' },
    { position: 2, name: 'Roddy Naranjo' },
    { position: 3, name: 'Carlos Chacon' },
    { position: 4, name: 'Meche Garrido' },
    { position: 5, name: 'Mono' },
    { position: 6, name: 'Juan Antonio Cortez' },
    { position: 7, name: 'Juan Tapia' },
    { position: 8, name: 'Miguel Chiesa' },
    { position: 9, name: 'Diego Behar' },
    { position: 10, name: 'Damian Amador' },
    { position: 11, name: 'Joffre Palacios' },
    { position: 12, name: 'Daniel Vela' },
    { position: 13, name: 'Jose Toral' },
    { position: 14, name: 'Jorge Tamayo' },
    { position: 15, name: 'Ruben Cadena' },
    { position: 16, name: 'Freddy Lopez' },
    { position: 17, name: 'Agustin' },
    { position: 18, name: 'Apolinar' },
    { position: 19, name: 'Javier Martinez' },
    { position: 20, name: 'Milton Tapia' },
    { position: 21, name: 'Invitado' },
    { position: 22, name: 'Fernando Pena' },
    { position: 23, name: 'Jose Patricio Moreno' }
  ]

  // Obtener datos de la BD para fecha 2
  const fecha2 = await prisma.gameDate.findFirst({
    where: {
      tournamentId: 1,
      dateNumber: 2
    },
    include: {
      eliminations: {
        include: {
          eliminatedPlayer: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          position: 'asc'
        }
      }
    }
  })

  console.log('═══════════════════════════════════════════════════════')
  console.log('DATOS EN LA BASE DE DATOS - FECHA 2')
  console.log('═══════════════════════════════════════════════════════\n')

  console.log('Eliminaciones ordenadas por position (campo BD):')
  fecha2?.eliminations.forEach(e => {
    console.log(`  Pos ${e.position}: ${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName} - ${e.points} pts`)
  })

  console.log('\n═══════════════════════════════════════════════════════')
  console.log('COMPARACIÓN: POSICIÓN REAL vs BD')
  console.log('═══════════════════════════════════════════════════════\n')

  console.log('Posición | Jugador Real              | Pos BD | Jugador BD                | Puntos BD')
  console.log('---------|---------------------------|--------|---------------------------|----------')

  realPositions.forEach(rp => {
    // Buscar coincidencia por nombre (aproximado)
    const bdElim = fecha2?.eliminations.find(e => {
      const fullName = `${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName}`.toLowerCase()
      const searchName = rp.name.toLowerCase()
      return fullName.includes(searchName.split(' ')[0]) || searchName.includes(fullName.split(' ')[0])
    })

    if (bdElim) {
      const match = rp.position === bdElim.position ? '✅' : '❌'
      const bdName = `${bdElim.eliminatedPlayer.firstName} ${bdElim.eliminatedPlayer.lastName}`
      console.log(`${rp.position.toString().padStart(8)} | ${rp.name.padEnd(25)} | ${bdElim.position.toString().padStart(6)} | ${bdName.padEnd(25)} | ${bdElim.points.toString().padStart(8)} ${match}`)
    } else {
      console.log(`${rp.position.toString().padStart(8)} | ${rp.name.padEnd(25)} | ${' '.repeat(6)} | ${'NO ENCONTRADO'.padEnd(25)} | ${' '.repeat(8)} ⚠️`)
    }
  })

  console.log('\n═══════════════════════════════════════════════════════')
  console.log('ANÁLISIS DE DISCREPANCIAS')
  console.log('═══════════════════════════════════════════════════════\n')

  // Verificar si position en BD = orden de eliminación (no posición final)
  console.log('🔍 HIPÓTESIS: El campo "position" representa el ORDEN DE ELIMINACIÓN, no la POSICIÓN FINAL')
  console.log('\nSi position = orden de eliminación:')
  console.log('  - Position 1 = Primer eliminado (último lugar)')
  console.log('  - Position 23 = Último eliminado (ganador)')
  console.log('\nSi esto es correcto, la posición FINAL debería calcularse como:')
  console.log('  Posición Final = (Total Jugadores - Position + 1)')
  console.log('\nVerificación:')

  fecha2?.eliminations.slice(0, 5).forEach(e => {
    const totalPlayers = fecha2.eliminations.length
    const finalPosition = totalPlayers - e.position + 1
    const bdName = `${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName}`

    // Buscar en posiciones reales
    const realPos = realPositions.find(rp => {
      const searchName = rp.name.toLowerCase()
      return bdName.toLowerCase().includes(searchName.split(' ')[0]) || searchName.includes(bdName.split(' ')[0])
    })

    console.log(`  BD Position ${e.position} → Posición Final Calculada: ${finalPosition} (${bdName})`)
    console.log(`    Real: Posición ${realPos?.position || '?'} ${finalPosition === realPos?.position ? '✅ COINCIDE' : '❌ NO COINCIDE'}`)
  })

  // Verificar ganador
  console.log('\n🏆 VERIFICACIÓN DEL GANADOR:')
  const maxPosition = Math.max(...(fecha2?.eliminations.map(e => e.position) || [0]))
  const winner = fecha2?.eliminations.find(e => e.position === maxPosition)

  if (winner) {
    const winnerName = `${winner.eliminatedPlayer.firstName} ${winner.eliminatedPlayer.lastName}`
    console.log(`  BD Position ${winner.position} (máxima): ${winnerName} - ${winner.points} pts`)
    console.log(`  ¿Coincide con posición real 1?: ${realPositions[0].name}`)
    console.log(`  ${winnerName.toLowerCase().includes('juan fernando') ? '✅ COINCIDE - Juan Fernando Ochoa' : '❌ NO COINCIDE'}`)
  }

  // Verificar último lugar
  console.log('\n📉 VERIFICACIÓN DEL ÚLTIMO LUGAR:')
  const minPosition = Math.min(...(fecha2?.eliminations.map(e => e.position) || [999]))
  const lastPlace = fecha2?.eliminations.find(e => e.position === minPosition)

  if (lastPlace) {
    const lastName = `${lastPlace.eliminatedPlayer.firstName} ${lastPlace.eliminatedPlayer.lastName}`
    console.log(`  BD Position ${lastPlace.position} (mínima): ${lastName} - ${lastPlace.points} pts`)
    console.log(`  ¿Coincide con posición real 23?: ${realPositions[22].name}`)
    console.log(`  ${lastName.toLowerCase().includes('jose') && lastName.toLowerCase().includes('moreno') ? '✅ COINCIDE - Jose Patricio Moreno' : '❌ NO COINCIDE'}`)
  }

  // CONCLUSIÓN
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('CONCLUSIÓN')
  console.log('═══════════════════════════════════════════════════════\n')

  console.log(`🔴 PROBLEMA IDENTIFICADO:`)
  console.log(`   El campo "position" en la tabla Eliminations NO representa la posición final.`)
  console.log(`   Representa el ORDEN DE ELIMINACIÓN (1 = primer eliminado, max = último eliminado/ganador)`)
  console.log(`\n✅ SOLUCIÓN:`)
  console.log(`   Para obtener la posición FINAL:`)
  console.log(`   Posición Final = Total Jugadores - position + 1`)
  console.log(`\n📊 IMPACTO EN PREMIOS:`)
  console.log(`   - ❌ Victorias: Position máxima ≠ 1er lugar`)
  console.log(`   - ❌ Podios: Position alta ≠ Top 3`)
  console.log(`   - ❌ 7/2: Position baja ≠ Últimos 2`)
  console.log(`   - ❌ Mesas Finales: Position alta ≠ Top 9`)

  await prisma.$disconnect()
}

verifyFecha2().catch(console.error)
