import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Matriz de referencia extraída de "Padres e Hijos.pdf"
// Filas = Eliminador (quien elimina), Columnas = Eliminado (quien es eliminado)
const REFERENCE_MATRIX: Record<string, Record<string, number>> = {
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

interface Discrepancy {
  eliminador: string
  eliminado: string
  expectedCount: number
  actualCount: number
  difference: number
  gameDateDetails?: Array<{
    dateNumber: number
    scheduledDate: Date
    position: number
  }>
}

async function main() {
  console.log('🔍 Verificando matriz P&H de Torneo 28...\n')

  // 1. Obtener todas las eliminaciones del Torneo 28
  const eliminations = await prisma.elimination.findMany({
    where: {
      gameDate: {
        tournamentId: 1 // Torneo 28
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

  console.log(`📊 Total eliminaciones en BD: ${eliminations.length}\n`)

  // 2. Construir matriz desde la base de datos
  const dbMatrix: Record<string, Record<string, number>> = {}
  const dbGameDateDetails: Record<string, Record<string, Array<{ dateNumber: number, scheduledDate: Date, position: number }>>> = {}

  eliminations.forEach(elim => {
    if (!elim.eliminatorPlayerId || !elim.eliminatorPlayer) return

    const eliminadorName = getPlayerDisplayName(elim.eliminatorPlayer)
    const eliminadoName = getPlayerDisplayName(elim.eliminatedPlayer)

    if (!dbMatrix[eliminadorName]) {
      dbMatrix[eliminadorName] = {}
      dbGameDateDetails[eliminadorName] = {}
    }

    if (!dbMatrix[eliminadorName][eliminadoName]) {
      dbMatrix[eliminadorName][eliminadoName] = 0
      dbGameDateDetails[eliminadorName][eliminadoName] = []
    }

    dbMatrix[eliminadorName][eliminadoName]++
    dbGameDateDetails[eliminadorName][eliminadoName].push({
      dateNumber: elim.gameDate.dateNumber,
      scheduledDate: elim.gameDate.scheduledDate,
      position: elim.position
    })
  })

  // 3. Comparar matrices
  const discrepancies: Discrepancy[] = []

  // Iterar sobre la matriz de referencia
  for (const [eliminador, victims] of Object.entries(REFERENCE_MATRIX)) {
    for (const [eliminado, expectedCount] of Object.entries(victims)) {
      const actualCount = dbMatrix[eliminador]?.[eliminado] || 0

      if (actualCount !== expectedCount) {
        discrepancies.push({
          eliminador,
          eliminado,
          expectedCount,
          actualCount,
          difference: actualCount - expectedCount,
          gameDateDetails: dbGameDateDetails[eliminador]?.[eliminado] || []
        })
      }
    }
  }

  // 4. Buscar eliminaciones en BD que no están en la matriz de referencia
  for (const [eliminador, victims] of Object.entries(dbMatrix)) {
    for (const [eliminado, actualCount] of Object.entries(victims)) {
      const expectedCount = REFERENCE_MATRIX[eliminador]?.[eliminado] || 0

      if (expectedCount === 0 && actualCount > 0) {
        discrepancies.push({
          eliminador,
          eliminado,
          expectedCount: 0,
          actualCount,
          difference: actualCount,
          gameDateDetails: dbGameDateDetails[eliminador]?.[eliminado] || []
        })
      }
    }
  }

  // 5. Generar reporte
  console.log('=' .repeat(100))
  console.log('📋 REPORTE DE DISCREPANCIAS P&H - TORNEO 28')
  console.log('=' .repeat(100))
  console.log()

  if (discrepancies.length === 0) {
    console.log('✅ No se encontraron discrepancias. La matriz coincide perfectamente con la base de datos.')
  } else {
    console.log(`⚠️  Se encontraron ${discrepancies.length} discrepancias:\n`)

    // Ordenar por magnitud de diferencia
    discrepancies.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))

    discrepancies.forEach((disc, index) => {
      const sign = disc.difference > 0 ? '+' : ''
      const emoji = disc.difference > 0 ? '➕' : '➖'

      console.log(`${index + 1}. ${emoji} ${disc.eliminador} → ${disc.eliminado}`)
      console.log(`   Esperado: ${disc.expectedCount} | Actual: ${disc.actualCount} | Diferencia: ${sign}${disc.difference}`)

      if (disc.gameDateDetails && disc.gameDateDetails.length > 0) {
        console.log(`   📅 Fechas en BD:`)
        disc.gameDateDetails.forEach(detail => {
          console.log(`      - Fecha ${detail.dateNumber} (${detail.scheduledDate.toISOString().split('T')[0]}) - Posición ${detail.position}`)
        })
      } else {
        console.log(`   📅 No hay registros en la BD`)
      }

      console.log()
    })

    // Resumen por tipo de discrepancia
    const missing = discrepancies.filter(d => d.difference < 0)
    const extra = discrepancies.filter(d => d.difference > 0)

    console.log('=' .repeat(100))
    console.log('📊 RESUMEN')
    console.log('=' .repeat(100))
    console.log(`Total discrepancias: ${discrepancies.length}`)
    console.log(`Eliminaciones faltantes en BD: ${missing.length}`)
    console.log(`Eliminaciones extra en BD: ${extra.length}`)
    console.log()
  }

  await prisma.$disconnect()
}

function getPlayerDisplayName(player: { firstName: string; lastName: string }): string {
  // Intentar mapear al formato de la matriz (Nombre + inicial apellido)
  const lastInitial = player.lastName.charAt(0) + '.'
  return `${player.firstName} ${lastInitial}`
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
