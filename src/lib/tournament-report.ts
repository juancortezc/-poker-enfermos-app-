import ExcelJS from 'exceljs'
import { prisma } from '@/lib/prisma'
import { calculateTournamentRanking } from '@/lib/ranking-utils'
import { computeTournamentAwards } from '@/lib/awards-utils'
import { recalculateAllStats } from '@/lib/parent-child-stats'

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE53935' } }
const HEADER_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FFFFFFFF' }, bold: true }
const SECTION_FONT: Partial<ExcelJS.Font> = { bold: true, size: 13 }
const NOTE_FONT: Partial<ExcelJS.Font> = { italic: true, color: { argb: 'FF666666' } }

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
}

function fullName(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`.trim()
}

/** Parsea "YYYY-MM-DD" o "DD/MM/YYYY" — mismo parser que /api/stats/days-without-victory. */
function parseFlexibleDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  if (dateStr.includes('-') && dateStr.length === 10) {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/').map(Number)
    return new Date(year, month - 1, day)
  }
  return null
}

function formatDateEC(date: Date | null): string {
  if (!date) return '—'
  return date.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function generateTournamentReportWorkbook(
  tournamentId: number
): Promise<{ workbook: ExcelJS.Workbook; tournamentNumber: number } | null> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      number: true,
      name: true,
      status: true,
      totalDates: true,
      datesToEliminate: true,
      tournamentParticipants: {
        select: {
          player: {
            select: { id: true, firstName: true, lastName: true, role: true, lastVictoryDate: true, isActive: true }
          }
        }
      }
    }
  })
  if (!tournament) return null

  const gameDates = await prisma.gameDate.findMany({
    where: { tournamentId, status: 'completed' },
    orderBy: { dateNumber: 'asc' },
    include: {
      eliminations: {
        include: {
          eliminatedPlayer: { select: { id: true, firstName: true, lastName: true } },
          eliminatorPlayer: { select: { id: true, firstName: true, lastName: true } }
        }
      }
    }
  })

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Poker Enfermos'
  workbook.created = new Date()

  const titleSuffix = tournament.name.trim().toLowerCase() === `torneo ${tournament.number}`.toLowerCase()
    ? tournament.name
    : `Torneo ${tournament.number} — ${tournament.name}`

  // ============================================================
  // SHEET 1: Resultados por Fecha
  // ============================================================
  const sheet1 = workbook.addWorksheet('Resultados por Fecha')
  sheet1.addRow([titleSuffix])
  sheet1.getRow(1).font = SECTION_FONT
  sheet1.addRow([])
  const headerRow1 = sheet1.addRow(['Fecha #', 'Fecha jugada', 'Posición', 'Jugador', 'Eliminado por', 'Puntos'])
  styleHeaderRow(headerRow1)
  sheet1.columns = [
    { key: 'dateNumber', width: 10 },
    { key: 'scheduledDate', width: 16 },
    { key: 'position', width: 10 },
    { key: 'player', width: 26 },
    { key: 'eliminator', width: 26 },
    { key: 'points', width: 10 }
  ]

  for (const gd of gameDates) {
    const sorted = [...gd.eliminations].sort((a, b) => a.position - b.position)
    for (const e of sorted) {
      sheet1.addRow([
        gd.dateNumber,
        gd.scheduledDate.toLocaleDateString('es-EC'),
        e.position,
        fullName(e.eliminatedPlayer),
        e.position === 1 ? '—' : (e.eliminatorPlayer ? fullName(e.eliminatorPlayer) : '—'),
        e.points
      ])
    }
  }

  // ============================================================
  // SHEET 2: Matriz de Eliminaciones
  // ============================================================
  const sheet2 = workbook.addWorksheet('Matriz de Eliminaciones')
  sheet2.addRow([titleSuffix])
  sheet2.getRow(1).font = SECTION_FONT
  sheet2.addRow(['Fila = quién eliminó · Columna = quién fue eliminado. Excluye la fila del ganador de cada fecha (no elimina a nadie).'])
  sheet2.getRow(2).font = NOTE_FONT
  sheet2.addRow([])

  const realEliminations = gameDates.flatMap(gd => gd.eliminations).filter(e => e.position !== 1)
  const playerNamesById = new Map<string, string>()
  const matrix = new Map<string, Map<string, number>>()

  for (const e of realEliminations) {
    if (!e.eliminatorPlayer) continue
    playerNamesById.set(e.eliminatorPlayer.id, fullName(e.eliminatorPlayer))
    playerNamesById.set(e.eliminatedPlayer.id, fullName(e.eliminatedPlayer))

    if (!matrix.has(e.eliminatorPlayer.id)) matrix.set(e.eliminatorPlayer.id, new Map())
    const row = matrix.get(e.eliminatorPlayer.id)!
    row.set(e.eliminatedPlayer.id, (row.get(e.eliminatedPlayer.id) ?? 0) + 1)
  }

  const orderedIds = Array.from(playerNamesById.keys()).sort((a, b) =>
    playerNamesById.get(a)!.localeCompare(playerNamesById.get(b)!, 'es')
  )

  const matrixHeaderRow = sheet2.addRow(['Eliminador \\ Eliminado', ...orderedIds.map(id => playerNamesById.get(id)!), 'Total eliminaciones'])
  styleHeaderRow(matrixHeaderRow)
  sheet2.getColumn(1).width = 26
  orderedIds.forEach((_, i) => { sheet2.getColumn(i + 2).width = 16 })
  sheet2.getColumn(orderedIds.length + 2).width = 18

  const columnTotals = new Array(orderedIds.length).fill(0)
  for (const eliminatorId of orderedIds) {
    const row = matrix.get(eliminatorId)
    let rowTotal = 0
    const cells = orderedIds.map((eliminatedId, colIdx) => {
      const count = row?.get(eliminatedId) ?? 0
      rowTotal += count
      columnTotals[colIdx] += count
      return count === 0 ? '' : count
    })
    sheet2.addRow([playerNamesById.get(eliminatorId)!, ...cells, rowTotal])
  }
  const totalsRow = sheet2.addRow(['Total veces eliminado', ...columnTotals.map(c => c === 0 ? '' : c), ''])
  totalsRow.font = { bold: true }

  // ============================================================
  // SHEET 3: Premiación Final
  // ============================================================
  const sheet3 = workbook.addWorksheet('Premiación Final')
  sheet3.getColumn(1).width = 28
  sheet3.getColumn(2).width = 18
  sheet3.getColumn(3).width = 18
  sheet3.addRow([titleSuffix])
  sheet3.getRow(1).font = SECTION_FONT
  sheet3.addRow([])

  const awards = await computeTournamentAwards(tournamentId)
  const ranking = await calculateTournamentRanking(tournamentId)

  sheet3.addRow(['VARÓN DEL TORNEO (más eliminaciones)']).font = SECTION_FONT
  const varonHeader = sheet3.addRow(['Jugador', 'Eliminaciones'])
  styleHeaderRow(varonHeader)
  if (awards && awards.awards.varon.length > 0) {
    awards.awards.varon.forEach(v => sheet3.addRow([fullName(v.player), v.eliminations]))
  } else {
    sheet3.addRow(['Sin datos'])
  }
  sheet3.addRow([])

  sheet3.addRow(['PODIO FINAL']).font = SECTION_FONT
  const podioHeader = sheet3.addRow(['Posición', 'Jugador', 'Puntos finales'])
  styleHeaderRow(podioHeader)
  if (ranking) {
    ranking.rankings
      .filter(r => r.position <= 3)
      .sort((a, b) => a.position - b.position)
      .forEach(r => sheet3.addRow([r.position, r.playerName, r.finalScore ?? r.totalPoints]))
  } else {
    sheet3.addRow(['Sin datos'])
  }
  sheet3.addRow([])

  sheet3.addRow(['7/2 FINAL (más veces primer eliminado)']).font = SECTION_FONT
  const sieteHeader = sheet3.addRow(['Jugador', 'Veces'])
  styleHeaderRow(sieteHeader)
  if (awards && awards.awards.sieteYDos.length > 0) {
    awards.awards.sieteYDos.forEach(v => sheet3.addRow([fullName(v.player), v.count]))
  } else {
    sheet3.addRow(['Sin datos'])
  }
  sheet3.addRow([])

  sheet3.addRow(['PADRES E HIJOS (3 o más eliminaciones a un mismo jugador)']).font = SECTION_FONT
  const phHeader = sheet3.addRow(['Padre', 'Hijo', 'Eliminaciones', 'Primera', 'Última'])
  styleHeaderRow(phHeader)
  await recalculateAllStats(tournamentId)
  const parentChildRelations = await prisma.parentChildStats.findMany({
    where: { tournamentId, isActiveRelation: true },
    include: {
      parentPlayer: { select: { firstName: true, lastName: true } },
      childPlayer: { select: { firstName: true, lastName: true } }
    },
    orderBy: { eliminationCount: 'desc' }
  })
  if (parentChildRelations.length > 0) {
    parentChildRelations.forEach(r => sheet3.addRow([
      fullName(r.parentPlayer),
      fullName(r.childPlayer),
      r.eliminationCount,
      r.firstElimination.toLocaleDateString('es-EC'),
      r.lastElimination.toLocaleDateString('es-EC')
    ]))
  } else {
    sheet3.addRow(['Sin relaciones activas'])
  }

  // ============================================================
  // SHEET 4: Días sin Ganar
  // ============================================================
  const sheet4 = workbook.addWorksheet('Días sin Ganar')
  sheet4.getColumn(1).width = 28
  sheet4.getColumn(2).width = 20
  sheet4.getColumn(3).width = 16

  const lastCompletedDate = gameDates[gameDates.length - 1] ?? null
  const referenceDate = lastCompletedDate ? lastCompletedDate.scheduledDate : new Date()

  sheet4.addRow([titleSuffix])
  sheet4.getRow(1).font = SECTION_FONT
  sheet4.addRow([
    lastCompletedDate
      ? `Cálculo de días sin ganar tomando como referencia la Fecha ${lastCompletedDate.dateNumber} (${formatDateEC(referenceDate)}), la última fecha jugada de este torneo.`
      : 'Este torneo no tiene fechas jugadas — no se puede calcular días sin ganar.'
  ])
  sheet4.getRow(2).font = NOTE_FONT
  sheet4.addRow([])

  const daysHeader = sheet4.addRow(['Jugador', 'Última victoria registrada', 'Días sin ganar (a esta fecha)'])
  styleHeaderRow(daysHeader)

  const participantPlayers = tournament.tournamentParticipants
    .map(tp => tp.player)
    .filter(p => p.role !== 'Invitado')
    .sort((a, b) => fullName(a).localeCompare(fullName(b), 'es'))

  for (const player of participantPlayers) {
    const lastVictory = parseFlexibleDate(player.lastVictoryDate)
    if (!lastVictory) {
      sheet4.addRow([fullName(player), 'Nunca ha ganado', '—'])
      continue
    }
    const days = Math.floor((referenceDate.getTime() - lastVictory.getTime()) / (1000 * 3600 * 24))
    sheet4.addRow([fullName(player), formatDateEC(lastVictory), days])
  }

  return { workbook, tournamentNumber: tournament.number }
}
