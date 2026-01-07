import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Mapeo de nombres del PDF a nombres en la BD
const NAME_MAPPING: Record<string, string> = {
  'Esteban G.': 'Meche G.',
  'Jose Luis T.': 'Jose Luis  T.',  // doble espacio
  'Juan Fernando .': 'Juan Fernando  .'  // doble espacio
}

// Función para normalizar nombres usando el mapeo
function normalizeName(pdfName: string): string {
  return NAME_MAPPING[pdfName] || pdfName
}

// Matriz de referencia del PDF
const PDF_MATRIX: Record<string, Record<string, number>> = {
  'Mono B.': { 'Carlos C.': 1, 'Damian A.': 2, 'Daniel V.': 1, 'Freddy L.': 1, 'Joffre P.': 1, 'Jorge T.': 1, 'Juan Antonio C.': 1, 'Juan Fernando .': 1, 'Juan T.': 2, 'Miguel C.': 1, 'Milton T.': 1, 'Sean W.': 1 },
  'Carlos C.': { 'Damian A.': 1, 'Daniel V.': 1, 'Diego B.': 1, 'Jose Luis T.': 2, 'Juan Antonio C.': 2, 'Juan T.': 1, 'Roddy N.': 2, 'Sean W.': 1, 'Invitado S.': 1, 'Javier M.': 1 },
  'Damian A.': { 'Joffre P.': 1, 'Jorge T.': 1, 'Invitado S.': 1, 'Apolinar E.': 1 },
  'Daniel V.': { 'Ruben C.': 1, 'Roddy N.': 1, 'Juan G.': 1 },
  'Diego B.': { 'Daniel V.': 1, 'Esteban G.': 1, 'Juan T.': 2, 'Juan Antonio C.': 1, 'Miguel C.': 1 },
  'Esteban G.': { 'Mono B.': 1, 'Damian A.': 1, 'Daniel V.': 1, 'Joffre P.': 1, 'Jorge T.': 1, 'Jose Luis T.': 2, 'Juan Antonio C.': 1, 'Juan Fernando .': 2, 'Milton T.': 1, 'Roddy N.': 2, 'Invitado S.': 1 },
  'Fernando P.': { 'Mono B.': 1, 'Daniel V.': 1, 'Diego B.': 1, 'Esteban G.': 1, 'Jorge T.': 1, 'Miguel C.': 2, 'Roddy N.': 2, 'Fernando P.': 1 },
  'Freddy L.': { 'Mono B.': 3, 'Carlos C.': 4, 'Damian A.': 1, 'Daniel V.': 1, 'Diego B.': 2, 'Fernando P.': 3, 'Javier M.': 1, 'Jorge T.': 1, 'Juan Antonio C.': 1, 'Juan G.': 2, 'Juan T.': 1, 'Miguel C.': 3, 'Milton T.': 3, 'Ruben C.': 2, 'Sean W.': 2, 'Invitado S.': 3, 'Freddy L.': 2, 'Apolinar E.': 1, 'Carlos j.': 1, 'Jose Patricio M.': 1, 'Alejandro P.': 1 },
  'Javier M.': { 'Diego B.': 1, 'Juan Antonio C.': 1, 'Milton T.': 1 },
  'Joffre P.': { 'Mono B.': 1, 'Daniel V.': 1, 'Freddy L.': 1, 'Sean W.': 3 },
  'Jorge T.': { 'Damian A.': 1, 'Daniel V.': 1, 'Diego B.': 1, 'Freddy L.': 1, 'Joffre P.': 1, 'Jose Luis T.': 1, 'Juan Antonio C.': 1, 'Juan Fernando .': 2, 'Miguel C.': 2, 'Milton T.': 2, 'Sean W.': 1, 'Invitado S.': 2 },
  'Jose Luis T.': { 'Mono B.': 1, 'Carlos C.': 1 },
  'Jose Patricio M.': { 'Freddy L.': 1, 'Joffre P.': 1, 'Jose Luis T.': 2, 'Juan Antonio C.': 1, 'Miguel C.': 1, 'Juan Fernando .': 1 },
  'Juan Antonio C.': { 'Damian A.': 1, 'Daniel V.': 1, 'Fernando P.': 1, 'Freddy L.': 1, 'Javier M.': 1, 'Jorge T.': 1, 'Jose Patricio M.': 1, 'Juan Fernando .': 1, 'Miguel C.': 2, 'Milton T.': 2, 'Sean W.': 1, 'Juan Antonio C.': 2 },
  'Juan Fernando .': { 'Mono B.': 1, 'Daniel V.': 1, 'Diego B.': 1, 'Joffre P.': 1, 'Jorge T.': 1, 'Juan T.': 1, 'Miguel C.': 1, 'Roddy N.': 1, 'Ruben C.': 1, 'Juan Fernando .': 1, 'Jose Patricio M.': 1 },
  'Juan G.': { 'Daniel V.': 1, 'Milton T.': 1 },
  'Juan T.': { 'Mono B.': 1, 'Damian A.': 2, 'Fernando P.': 1, 'Freddy L.': 1, 'Javier M.': 1, 'Juan Antonio C.': 1, 'Juan Fernando .': 1, 'Miguel C.': 1, 'Sean W.': 1 },
  'Miguel C.': { 'Damian A.': 1, 'Juan Antonio C.': 2, 'Jose Luis T.': 2, 'Milton T.': 1, 'Sean W.': 1, 'Daniel V.': 1 },
  'Milton T.': { 'Mono B.': 1, 'Carlos C.': 1, 'Esteban G.': 1, 'Fernando P.': 1, 'Joffre P.': 1, 'Jorge T.': 1, 'Juan Antonio C.': 1 },
  'Roddy N.': { 'Carlos C.': 1, 'Damian A.': 1, 'Esteban G.': 1, 'Fernando P.': 2, 'Freddy L.': 1, 'Javier M.': 2, 'Joffre P.': 3, 'Juan Antonio C.': 1, 'Miguel C.': 1, 'Milton T.': 1, 'Ruben C.': 2, 'Sean W.': 1, 'Invitado S.': 2, 'Meche G.': 1, 'Juan Fernando .': 1, 'Roddy N.': 1, 'Jorge T.': 1, 'Carlos j.': 1, 'Agustin G.': 1 },
  'Ruben C.': { 'Mono B.': 1, 'Carlos C.': 1, 'Damian A.': 1, 'Daniel V.': 1, 'Diego B.': 1, 'Fernando P.': 1, 'Freddy L.': 1, 'Javier M.': 1, 'Jorge T.': 1, 'Juan Antonio C.': 1, 'Juan T.': 1, 'Miguel C.': 1, 'Ruben C.': 1, 'Felipe P.': 1 },
  'Sean W.': { 'Carlos C.': 1, 'Diego B.': 1, 'Freddy L.': 1, 'Javier M.': 1, 'Juan Antonio C.': 1, 'Sean W.': 1 },
  'Invitado S.': { 'Daniel V.': 2, 'Diego B.': 1, 'Esteban G.': 1, 'Fernando P.': 2, 'Joffre P.': 2, 'Jorge T.': 2, 'Juan Antonio C.': 1, 'Juan Fernando .': 2, 'Juan T.': 1, 'Miguel C.': 1, 'Milton T.': 1, 'Sean W.': 1, 'Invitado S.': 1 }
}

interface Relation {
  eliminator: string
  eliminated: string
  pdfCount: number
  dbCount: number
  difference: number
  dates?: Array<{
    dateNumber: number
    scheduledDate: Date
    position: number
  }>
}

async function main() {
  console.log('🔍 VALIDACIÓN DE RELACIONES PADRE-HIJO: PDF vs BASE DE DATOS')
  console.log('=' .repeat(100))
  console.log()

  // 1. Obtener todas las eliminaciones del T28
  const eliminations = await prisma.elimination.findMany({
    where: {
      gameDate: {
        tournamentId: 1
      }
    },
    include: {
      gameDate: {
        select: {
          dateNumber: true,
          scheduledDate: true
        }
      },
      eliminatorPlayer: {
        select: {
          firstName: true,
          lastName: true
        }
      },
      eliminatedPlayer: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    }
  })

  // 2. Construir matriz de BD
  const dbMatrix: Record<string, Record<string, number>> = {}
  const dbDetails: Record<string, Record<string, Array<{ dateNumber: number, scheduledDate: Date, position: number }>>> = {}

  eliminations.forEach(elim => {
    const eliminator = `${elim.eliminatorPlayer.firstName} ${elim.eliminatorPlayer.lastName.charAt(0)}.`
    const eliminated = `${elim.eliminatedPlayer.firstName} ${elim.eliminatedPlayer.lastName.charAt(0)}.`

    if (!dbMatrix[eliminator]) {
      dbMatrix[eliminator] = {}
      dbDetails[eliminator] = {}
    }

    if (!dbMatrix[eliminator][eliminated]) {
      dbMatrix[eliminator][eliminated] = 0
      dbDetails[eliminator][eliminated] = []
    }

    dbMatrix[eliminator][eliminated]++
    dbDetails[eliminator][eliminated].push({
      dateNumber: elim.gameDate.dateNumber,
      scheduledDate: elim.gameDate.scheduledDate,
      position: elim.position
    })
  })

  // 3. Comparar cada relación del PDF contra la BD
  const correctRelations: Relation[] = []
  const discrepancies: Relation[] = []

  let totalRelations = 0

  for (const [pdfEliminator, victims] of Object.entries(PDF_MATRIX)) {
    const dbEliminator = normalizeName(pdfEliminator)

    for (const [pdfEliminated, pdfCount] of Object.entries(victims)) {
      const dbEliminated = normalizeName(pdfEliminated)
      const dbCount = dbMatrix[dbEliminator]?.[dbEliminated] || 0

      totalRelations++

      const relation: Relation = {
        eliminator: pdfEliminator,
        eliminated: pdfEliminated,
        pdfCount,
        dbCount,
        difference: dbCount - pdfCount,
        dates: dbDetails[dbEliminator]?.[dbEliminated] || []
      }

      if (dbCount === pdfCount) {
        correctRelations.push(relation)
      } else {
        discrepancies.push(relation)
      }
    }
  }

  // 4. Ordenar discrepancias por magnitud
  discrepancies.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))

  // 5. REPORTE: Discrepancias
  console.log('❌ DISCREPANCIAS ENCONTRADAS')
  console.log('=' .repeat(100))
  console.log()

  if (discrepancies.length === 0) {
    console.log('✅ ¡Perfecto! No se encontraron discrepancias. Todos los datos coinciden.\n')
  } else {
    discrepancies.forEach((rel, index) => {
      const emoji = rel.difference > 0 ? '➕' : '➖'
      const sign = rel.difference > 0 ? '+' : ''

      console.log(`${index + 1}. ${emoji} ${rel.eliminator} → ${rel.eliminated}`)
      console.log(`   PDF: ${rel.pdfCount} ${rel.pdfCount === 1 ? 'eliminación' : 'eliminaciones'}`)
      console.log(`   BD:  ${rel.dbCount} ${rel.dbCount === 1 ? 'eliminación' : 'eliminaciones'}`)
      console.log(`   Diferencia: ${sign}${rel.difference}`)

      if (rel.dates && rel.dates.length > 0) {
        console.log(`   📅 Registros en BD:`)
        rel.dates.forEach(d => {
          console.log(`      - Fecha ${d.dateNumber} (${d.scheduledDate.toISOString().split('T')[0]}) - Posición ${d.position}`)
        })
      } else {
        console.log(`   📅 No hay registros en BD (deberían haber ${rel.pdfCount})`)
      }

      console.log()
    })
  }

  // 6. REPORTE: Relaciones correctas (muestra solo un resumen)
  console.log('=' .repeat(100))
  console.log('✅ RELACIONES CORRECTAS (MUESTRA DE 10)')
  console.log('=' .repeat(100))
  console.log()

  correctRelations.slice(0, 10).forEach(rel => {
    console.log(`✓ ${rel.eliminator} → ${rel.eliminated}: ${rel.pdfCount} ${rel.pdfCount === 1 ? 'eliminación' : 'eliminaciones'}`)
  })

  if (correctRelations.length > 10) {
    console.log(`\n... y ${correctRelations.length - 10} relaciones correctas más`)
  }

  // 7. RESUMEN ESTADÍSTICO
  console.log('\n')
  console.log('=' .repeat(100))
  console.log('📊 RESUMEN ESTADÍSTICO')
  console.log('=' .repeat(100))
  console.log()
  console.log(`Total de relaciones validadas: ${totalRelations}`)
  console.log(`✅ Relaciones correctas: ${correctRelations.length} (${((correctRelations.length / totalRelations) * 100).toFixed(1)}%)`)
  console.log(`❌ Relaciones con discrepancias: ${discrepancies.length} (${((discrepancies.length / totalRelations) * 100).toFixed(1)}%)`)

  const missingInDB = discrepancies.filter(d => d.difference < 0).length
  const extraInDB = discrepancies.filter(d => d.difference > 0).length

  console.log()
  console.log(`   ➖ BD tiene MENOS eliminaciones que PDF: ${missingInDB}`)
  console.log(`   ➕ BD tiene MÁS eliminaciones que PDF: ${extraInDB}`)

  await prisma.$disconnect()
}

main().catch(console.error)
