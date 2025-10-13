import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Análisis de diferencias P&H: PDF vs Base de Datos\n')
  console.log('=' .repeat(100))

  // 1. Obtener todos los jugadores únicos de las eliminaciones del T28
  const eliminations = await prisma.elimination.findMany({
    where: {
      gameDate: {
        tournamentId: 1
      }
    },
    include: {
      eliminatorPlayer: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      },
      eliminatedPlayer: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    }
  })

  // Construir sets de jugadores únicos
  const eliminatorsInDB = new Set<string>()
  const eliminatedInDB = new Set<string>()

  eliminations.forEach(elim => {
    const eliminatorName = `${elim.eliminatorPlayer.firstName} ${elim.eliminatorPlayer.lastName.charAt(0)}.`
    const eliminatedName = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName.charAt(0)}.`
    eliminatorsInDB.add(eliminatorName)
    eliminatedInDB.add(eliminatedName)
  })

  const allPlayersDB = new Set([...eliminatorsInDB, ...eliminatedInDB])

  // Jugadores en el PDF (según la matriz de referencia)
  const playersInPDF = new Set([
    'Mono B.',
    'Carlos C.',
    'Christian Z.',
    'Damian A.',
    'Daniel V.',
    'Diego B.',
    'Esteban G.',
    'Fernando P.',
    'Freddy L.',
    'Javier M.',
    'Joffre P.',
    'Jorge T.',
    'Jose Luis T.',
    'Jose Patricio M.',
    'Juan Antonio C.',
    'Juan Fernando .',
    'Juan G.',
    'Juan T.',
    'Miguel C.',
    'Milton T.',
    'Pablo S.',
    'Roddy N.',
    'Ruben C.',
    'Sean W.',
    'Invitado S.'
  ])

  console.log('\n📋 PARTE 1: ANÁLISIS DE JUGADORES')
  console.log('=' .repeat(100))

  console.log(`\n✅ Jugadores en PDF: ${playersInPDF.size}`)
  console.log(`✅ Jugadores en BD: ${allPlayersDB.size}`)

  // Jugadores en BD pero no en PDF
  const onlyInDB = Array.from(allPlayersDB).filter(p => !playersInPDF.has(p))
  console.log(`\n🆕 Jugadores en BD pero NO en PDF (${onlyInDB.length}):`)
  onlyInDB.sort().forEach(player => {
    const eliminationsAsEliminator = eliminations.filter(e =>
      `${e.eliminatorPlayer.firstName} ${e.eliminatorPlayer.lastName.charAt(0)}.` === player
    ).length
    const eliminationsAsEliminated = eliminations.filter(e =>
      `${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName.charAt(0)}.` === player
    ).length
    console.log(`   - ${player} (Eliminó: ${eliminationsAsEliminator}, Fue eliminado: ${eliminationsAsEliminated})`)
  })

  // Jugadores en PDF pero no en BD
  const onlyInPDF = Array.from(playersInPDF).filter(p => !allPlayersDB.has(p))
  console.log(`\n❌ Jugadores en PDF pero NO en BD (${onlyInPDF.length}):`)
  if (onlyInPDF.length === 0) {
    console.log('   (Ninguno)')
  } else {
    onlyInPDF.sort().forEach(player => console.log(`   - ${player}`))
  }

  // Posibles problemas de formato en nombres
  console.log('\n⚠️  POSIBLES PROBLEMAS DE FORMATO:')
  const possibleFormatIssues: Array<{pdf: string, db: string, similarity: string}> = []

  // Buscar nombres similares
  onlyInPDF.forEach(pdfPlayer => {
    const pdfBase = pdfPlayer.replace(/\s+/g, ' ').toLowerCase()
    onlyInDB.forEach(dbPlayer => {
      const dbBase = dbPlayer.replace(/\s+/g, ' ').toLowerCase()
      if (pdfBase.includes(dbBase.split(' ')[0]) || dbBase.includes(pdfBase.split(' ')[0])) {
        possibleFormatIssues.push({
          pdf: pdfPlayer,
          db: dbPlayer,
          similarity: 'Primer nombre similar'
        })
      }
    })
  })

  if (possibleFormatIssues.length > 0) {
    possibleFormatIssues.forEach(issue => {
      console.log(`   📌 "${issue.pdf}" (PDF) ↔ "${issue.db}" (BD) - ${issue.similarity}`)
    })
  } else {
    console.log('   (No se detectaron problemas obvios de formato)')
  }

  // PARTE 2: Análisis de eliminaciones específicas
  console.log('\n\n📋 PARTE 2: ELIMINACIONES CON DISCREPANCIAS SIGNIFICATIVAS')
  console.log('=' .repeat(100))

  // Matriz del PDF - casos específicos mencionados
  const pdfMatrix: Record<string, Record<string, number>> = {
    'Freddy L.': { 'Mono B.': 3, 'Carlos C.': 4, 'Fernando P.': 3, 'Miguel C.': 3, 'Milton T.': 3, 'Sean W.': 2, 'Invitado S.': 3 },
    'Esteban G.': { 'Jose Luis T.': 2, 'Juan Fernando .': 2, 'Roddy N.': 2 },
    'Carlos C.': { 'Jose Luis T.': 2 },
    'Jorge T.': { 'Juan Fernando .': 2, 'Miguel C.': 2, 'Invitado S.': 2 },
    'Jose Patricio M.': { 'Jose Luis T.': 2 },
    'Miguel C.': { 'Jose Luis T.': 2 }
  }

  // Construir matriz de BD
  const dbMatrix: Record<string, Record<string, number>> = {}
  eliminations.forEach(elim => {
    const eliminator = `${elim.eliminatorPlayer.firstName} ${elim.eliminatorPlayer.lastName.charAt(0)}.`
    const eliminated = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName.charAt(0)}.`

    if (!dbMatrix[eliminator]) dbMatrix[eliminator] = {}
    if (!dbMatrix[eliminator][eliminated]) dbMatrix[eliminator][eliminated] = 0
    dbMatrix[eliminator][eliminated]++
  })

  console.log('\n🔍 CASOS ESPECÍFICOS DE ALTO IMPACTO:\n')

  // Analizar cada caso del PDF
  let caseNumber = 1
  for (const [eliminator, victims] of Object.entries(pdfMatrix)) {
    for (const [eliminated, expectedCount] of Object.entries(victims)) {
      const actualCount = dbMatrix[eliminator]?.[eliminated] || 0

      if (actualCount !== expectedCount) {
        console.log(`${caseNumber}. ${eliminator} → ${eliminated}`)
        console.log(`   PDF: ${expectedCount} eliminaciones`)
        console.log(`   BD:  ${actualCount} eliminaciones`)
        console.log(`   Diferencia: ${actualCount - expectedCount > 0 ? '+' : ''}${actualCount - expectedCount}`)

        // Buscar nombres similares en BD
        const similarInDB = Object.keys(dbMatrix[eliminator] || {}).filter(name => {
          const nameBase = name.toLowerCase().replace(/\s+/g, ' ')
          const eliminatedBase = eliminated.toLowerCase().replace(/\s+/g, ' ')
          return nameBase.includes(eliminatedBase.split(' ')[0]) ||
                 eliminatedBase.includes(nameBase.split(' ')[0])
        })

        if (similarInDB.length > 0 && similarInDB[0] !== eliminated) {
          console.log(`   💡 Nombre similar encontrado en BD: "${similarInDB[0]}" con ${dbMatrix[eliminator][similarInDB[0]]} eliminaciones`)
        }

        console.log()
        caseNumber++
      }
    }
  }

  // PARTE 3: Estadísticas generales
  console.log('\n📋 PARTE 3: ESTADÍSTICAS GENERALES')
  console.log('=' .repeat(100))
  console.log(`\nTotal eliminaciones registradas en BD: ${eliminations.length}`)

  // Top eliminadores
  const eliminatorCounts: Record<string, number> = {}
  eliminations.forEach(elim => {
    const name = `${elim.eliminatorPlayer.firstName} ${elim.eliminatorPlayer.lastName.charAt(0)}.`
    eliminatorCounts[name] = (eliminatorCounts[name] || 0) + 1
  })

  const topEliminators = Object.entries(eliminatorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  console.log('\n🏆 Top 10 Eliminadores:')
  topEliminators.forEach(([name, count], index) => {
    const inPDF = playersInPDF.has(name) ? '✅' : '❌'
    console.log(`   ${index + 1}. ${name}: ${count} eliminaciones ${inPDF}`)
  })

  // Resumen final
  console.log('\n\n📋 RESUMEN FINAL')
  console.log('=' .repeat(100))
  console.log(`\n✅ Jugadores que coinciden: ${Array.from(playersInPDF).filter(p => allPlayersDB.has(p)).length}`)
  console.log(`🆕 Jugadores nuevos en BD (no en PDF): ${onlyInDB.length}`)
  console.log(`❌ Jugadores en PDF no encontrados en BD: ${onlyInPDF.length}`)
  console.log(`⚠️  Posibles problemas de formato detectados: ${possibleFormatIssues.length}`)

  await prisma.$disconnect()
}

main().catch(console.error)
