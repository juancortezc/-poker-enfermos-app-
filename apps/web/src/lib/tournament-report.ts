import ExcelJS from 'exceljs'
import {
  buildTournamentReport,
  REPORT_SHEETS,
  scoreOf,
  tournamentSieteDos,
  type TournamentReportData,
  type TournamentReportSummaryResponse
} from '@poker/shared'
import { prisma } from '@/lib/prisma'
import { loadTournamentStatsInput, type TournamentStatsPlayer } from '@/lib/tournament-stats-data'

/**
 * Reporte de fin de torneo en Excel. Los numeros salen de
 * buildTournamentReport (@poker/shared), la misma fuente que la tabla, los
 * premios y las pantallas de Reportes. Aqui solo se cargan los datos (sin
 * escribir nada en la base) y se da formato.
 */

// Colores del archivo (no de la app): rojo del club en los encabezados.
const RED = 'FFE53935'
const WHITE = 'FFFFFFFF'
const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED } }
const HEADER_FONT: Partial<ExcelJS.Font> = { color: { argb: WHITE }, bold: true }
const TITLE_FONT: Partial<ExcelJS.Font> = { bold: true, size: 14 }
const SECTION_FONT: Partial<ExcelJS.Font> = { bold: true, size: 12 }
const NOTE_FONT: Partial<ExcelJS.Font> = { italic: true, color: { argb: 'FF666666' } }
const MUTED_FONT: Partial<ExcelJS.Font> = { italic: true, color: { argb: 'FF999999' } }
const DISCARD_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } }
const FILL_IN_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }
const LEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }
const DATE_FMT = 'dd/mm/yyyy'

const sheetName = (i: number) => REPORT_SHEETS[i].name

function fullName(p: { firstName: string; lastName: string } | undefined | null) {
  return p ? `${p.firstName} ${p.lastName}`.trim() : ''
}

/** "YYYY-MM-DD" → fecha de Excel (sin hora ni zona). */
function excelDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function styleHeader(row: ExcelJS.Row) {
  row.eachCell(cell => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  })
  row.height = 30
}

function addTitle(ws: ExcelJS.Worksheet, title: string, note?: string) {
  ws.addRow([title]).font = TITLE_FONT
  if (note) ws.addRow([note]).font = NOTE_FONT
  ws.addRow([])
}

function addHeader(ws: ExcelJS.Worksheet, values: (string | number)[]) {
  const row = ws.addRow(values)
  styleHeader(row)
  return row
}

function widths(ws: ExcelJS.Worksheet, list: number[]) {
  list.forEach((w, i) => { ws.getColumn(i + 1).width = w })
}

function freeze(ws: ExcelJS.Worksheet, ySplit: number, xSplit = 0) {
  ws.views = [{ state: 'frozen', xSplit, ySplit }]
}

/** Numeros a la derecha, texto a la izquierda. */
function alignRow(row: ExcelJS.Row) {
  row.eachCell(cell => {
    if (typeof cell.value === 'number') cell.alignment = { horizontal: 'right' }
  })
}

function addSection(ws: ExcelJS.Worksheet, text: string, note?: string) {
  ws.addRow([])
  ws.addRow([text]).font = SECTION_FONT
  if (note) ws.addRow([note]).font = NOTE_FONT
}

interface LoadedReport {
  report: TournamentReportData
  tournamentNumber: number
  title: string
  playersById: Map<string, TournamentStatsPlayer>
  historical: { champion: string; runnerUp: string; thirdPlace: string; siete: string; dos: string } | null
}

async function loadReport(tournamentId: number): Promise<LoadedReport | null> {
  const loaded = await loadTournamentStatsInput(tournamentId)
  if (!loaded) return null
  const { tournament, input, playersById } = loaded

  const report = buildTournamentReport(input)

  const winners = await prisma.tournamentWinners.findUnique({
    where: { tournamentNumber: tournament.number },
    select: { championId: true, runnerUpId: true, thirdPlaceId: true, sieteId: true, dosId: true }
  })
  const missing = winners
    ? [winners.championId, winners.runnerUpId, winners.thirdPlaceId, winners.sieteId, winners.dosId].filter(id => !playersById.has(id))
    : []
  if (missing.length) {
    const extra = await prisma.player.findMany({
      where: { id: { in: missing } },
      select: { id: true, firstName: true, lastName: true, photoUrl: true, role: true, lastVictoryDate: true }
    })
    extra.forEach(p => playersById.set(p.id, p))
  }
  const nameOf = (id: string) => fullName(playersById.get(id))

  const title = tournament.name.trim().toLowerCase() === `torneo ${tournament.number}`
    ? tournament.name
    : `Torneo ${tournament.number} — ${tournament.name}`

  return {
    report,
    tournamentNumber: tournament.number,
    title,
    playersById,
    historical: winners
      ? {
          champion: nameOf(winners.championId),
          runnerUp: nameOf(winners.runnerUpId),
          thirdPlace: nameOf(winners.thirdPlaceId),
          siete: nameOf(winners.sieteId),
          dos: nameOf(winners.dosId)
        }
      : null
  }
}

/** Lo que muestran las pantallas de Reportes: el Resumen y la lista de hojas. */
export async function getTournamentReportSummary(tournamentId: number): Promise<TournamentReportSummaryResponse | null> {
  const loaded = await loadTournamentStatsInput(tournamentId)
  if (!loaded) return null
  const report = buildTournamentReport(loaded.input)
  return { summary: report.summary, rows: report.summaryRows, sheets: REPORT_SHEETS }
}

export async function generateTournamentReportWorkbook(
  tournamentId: number
): Promise<{ workbook: ExcelJS.Workbook; tournamentNumber: number } | null> {
  const loaded = await loadReport(tournamentId)
  if (!loaded) return null
  const { report, title, playersById, historical } = loaded
  const { names, dates, players, standings, awards } = report
  const nameOf = (id: string | null | undefined) => (id ? names.get(id) ?? id : '')
  const namesOf = (ids: string[]) => ids.map(nameOf).join(', ')
  const dateNums = dates.map(d => d.dateNumber)

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Poker Enfermos'
  workbook.created = new Date()

  // ==========================================================================
  // 1. Resumen
  // ==========================================================================
  {
    const ws = workbook.addWorksheet(sheetName(0))
    addTitle(ws, `${title} — Resumen del torneo`, 'Solo fechas cerradas. Los puntos son los de la tabla oficial (PUNTOS, con el ELIMINA y las multas).')
    addHeader(ws, ['Dato', 'Valor', 'Detalle'])
    const top = ws.rowCount
    report.summaryRows.forEach(r => {
      const row = ws.addRow([r.label, r.fillIn ? null : r.value, r.detail ?? ''])
      row.getCell(1).font = { bold: true }
      alignRow(row)
      if (r.fillIn) {
        row.getCell(2).fill = FILL_IN_FILL
        row.getCell(3).font = NOTE_FONT
      }
    })
    widths(ws, [42, 30, 80])
    freeze(ws, top)
  }

  // ==========================================================================
  // 2. Tabla abierta
  // ==========================================================================
  {
    const ws = workbook.addWorksheet(sheetName(1))
    addTitle(ws, `${title} — Tabla abierta de resultados`,
      `Puesto y puntos de cada noche. F = falta (0 puntos). En naranja, las ${report.datesToEliminate} fechas que descarta el ELIMINA. ${report.summary.eliminaRule}.`)
    const n = dateNums.length
    const group = ws.addRow(['', '', 'PUESTO EN LA NOCHE', ...Array(Math.max(0, n - 1)).fill(''), 'PUNTOS DE LA NOCHE', ...Array(Math.max(0, n - 1)).fill(''), 'TOTALES'])
    const gRow = group.number
    if (n > 1) {
      ws.mergeCells(gRow, 3, gRow, 2 + n)
      ws.mergeCells(gRow, 3 + n, gRow, 2 + 2 * n)
    }
    ws.mergeCells(gRow, 3 + 2 * n, gRow, 6 + 2 * n)
    styleHeader(group)
    addHeader(ws, ['Pos.', 'Jugador', ...dateNums.map(d => `F${d}`), ...dateNums.map(d => `F${d}`), 'ACUM.', 'Descartados', 'Multas', 'PUNTOS'])
    const top = ws.rowCount

    standings.forEach(r => {
      const stats = players.find(p => p.playerId === r.playerId)!
      const discarded = new Set(stats.discardedDates)
      const positions = dates.map(d => d.positions.get(r.playerId) ?? 'F')
      const points = dates.map(d => r.pointsByDate[d.dateNumber] ?? 0)
      const discardedSum = r.eliminasActive ? stats.discardedDates.reduce((s, d) => s + (r.pointsByDate[d] ?? 0), 0) : 0
      const row = ws.addRow([r.position, r.playerName, ...positions, ...points, r.totalPoints, discardedSum, r.pointPenalty ?? 0, scoreOf(r)])
      dates.forEach((d, i) => {
        const posCell = row.getCell(3 + i)
        const ptsCell = row.getCell(3 + n + i)
        posCell.alignment = { horizontal: 'center' }
        ptsCell.alignment = { horizontal: 'right' }
        if (!d.positions.has(r.playerId)) {
          posCell.font = MUTED_FONT
          ptsCell.font = MUTED_FONT
        }
        if (discarded.has(d.dateNumber)) {
          posCell.fill = DISCARD_FILL
          ptsCell.fill = DISCARD_FILL
        }
      })
      row.getCell(1).alignment = { horizontal: 'center' }
      for (let c = 3 + 2 * n; c <= 6 + 2 * n; c++) row.getCell(c).alignment = { horizontal: 'right' }
      row.getCell(6 + 2 * n).font = { bold: true }
    })
    widths(ws, [6, 26, ...Array(2 * n).fill(5.5), 9, 12, 8, 10])
    freeze(ws, top, 2)
  }

  // ==========================================================================
  // 3. Podio y premios
  // ==========================================================================
  {
    const ws = workbook.addWorksheet(sheetName(2))
    addTitle(ws, `${title} — Podio y premios`,
      'El 7/2 del torneo son los dos últimos de la tabla final: el 7 es el penúltimo y el 2 el último.')
    addHeader(ws, ['Lugar', 'Jugador', 'PUNTOS', 'ACUM.', 'Registro histórico'])
    const top = ws.rowCount
    const byPos = [...standings].sort((a, b) => a.position - b.position)
    const sd = tournamentSieteDos(byPos)
    const podium: Array<[string, typeof byPos[number] | undefined, string | undefined]> = [
      ['Campeón', byPos[0], historical?.champion],
      ['Segundo', byPos[1], historical?.runnerUp],
      ['Tercero', byPos[2], historical?.thirdPlace],
      ['El 7 (penúltimo)', sd?.siete, historical?.siete],
      ['El 2 (último)', sd?.dos, historical?.dos]
    ]
    podium.forEach(([label, r, stored]) => {
      const check = !historical ? 'Sin registro' : stored === r?.playerName ? 'Coincide' : `Distinto: guardado ${stored}`
      const row = ws.addRow([label, r?.playerName ?? '', r ? scoreOf(r) : null, r?.totalPoints ?? null, check])
      row.getCell(1).font = { bold: true }
      alignRow(row)
    })

    addSection(ws, 'VARÓN DEL TORNEO', 'Más eliminaciones hechas en el torneo (sin contar al ganador de cada noche).')
    addHeader(ws, ['', 'Jugador', 'Eliminaciones'])
    if (awards.varon.length) awards.varon.forEach(a => alignRow(ws.addRow(['', nameOf(a.playerId), a.count])))
    else ws.addRow(['', 'Sin datos'])

    const categories: Array<{ title: string; note: string; list: Array<{ playerId: string; count: number; detail?: string }> }> = [
      { title: 'VARÓN', note: 'Más eliminaciones hechas.', list: awards.varon },
      { title: 'GAY', note: 'Menos eliminaciones hechas (el 0 cuenta).', list: awards.gay },
      { title: 'PODIOS', note: 'Veces en el top 3 de una noche.', list: awards.podios },
      { title: 'VICTORIAS', note: 'Fechas ganadas (el premio pide 2 o más).', list: awards.victorias },
      {
        title: '7/2',
        note: 'Veces entre los 2 primeros en salir de la noche. Desempata quien fue el 2 (primero en salir) más veces.',
        list: awards.sieteYDos.map(s => ({ ...s, detail: `${s.dosCount} veces 2 · ${s.sieteCount} veces 7` }))
      },
      { title: 'SIN PODIO', note: 'Jugaron y nunca hicieron top 3.', list: awards.sinPodio.map(id => ({ playerId: id, count: 0 })) },
      { title: 'FALTAS', note: 'Fechas a las que no fueron.', list: awards.faltas },
      { title: 'MESAS FINALES', note: 'Veces en el top 9 de una noche.', list: awards.mesasFinales }
    ]
    addSection(ws, 'LAS 8 CATEGORÍAS DE PREMIOS', 'Las mismas de Estadísticas → Premios. Solo jugadores inscritos.')
    categories.forEach(cat => {
      addSection(ws, cat.title, cat.note)
      addHeader(ws, ['Puesto', 'Jugador', cat.title === 'SIN PODIO' ? '' : 'Cantidad', 'Detalle'])
      if (cat.list.length === 0) {
        ws.addRow(['', 'Nadie'])
        return
      }
      let pos = 0
      cat.list.forEach((a, i) => {
        if (i === 0 || a.count !== cat.list[i - 1].count) pos = i + 1
        const row = ws.addRow([cat.title === 'SIN PODIO' ? '' : pos, nameOf(a.playerId), cat.title === 'SIN PODIO' ? '' : a.count, a.detail ?? ''])
        alignRow(row)
      })
    })
    widths(ws, [22, 28, 14, 34, 34])
    freeze(ws, top)
  }

  // ==========================================================================
  // 4. Fecha por fecha
  // ==========================================================================
  {
    const ws = workbook.addWorksheet(sheetName(3))
    addTitle(ws, `${title} — Fecha por fecha`,
      'El 7/2 de la noche son los dos primeros en salir: el 2 (el malazo) sale primero y el 7 segundo. Varón de la noche: quien más eliminó.')
    addHeader(ws, ['Fecha', 'Día', 'Asistentes', 'Inscritos', 'Invitados', 'Faltas', 'Ganador', 'Pts. ganador', '2º', '3º',
      'El 2 (malazo)', 'Lo sacó', 'El 7', 'Varón de la noche', 'Elim. del Varón', 'Líder de la tabla'])
    const top = ws.rowCount
    dates.forEach((d, i) => {
      const row = ws.addRow([
        d.dateNumber,
        excelDate(d.scheduledDate),
        d.players,
        d.registeredPresent,
        d.guests,
        d.absentIds.length,
        nameOf(d.winnerId),
        d.winnerId ? d.points.get(d.winnerId) ?? null : null,
        nameOf(d.secondId),
        nameOf(d.thirdId),
        nameOf(d.dosId),
        nameOf(d.dosEliminatorId),
        nameOf(d.sieteId),
        namesOf(d.varonIds),
        d.varonCount || null,
        namesOf(report.leaders[i] ?? [])
      ])
      row.getCell(2).numFmt = DATE_FMT
      alignRow(row)
    })
    widths(ws, [7, 12, 11, 10, 10, 8, 24, 11, 24, 24, 24, 24, 24, 30, 12, 26])
    freeze(ws, top, 1)
  }

  // ==========================================================================
  // 5. Estadísticas por jugador
  // ==========================================================================
  {
    const ws = workbook.addWorksheet(sheetName(4))
    addTitle(ws, `${title} — Estadísticas por jugador`,
      'Puesto de la noche: 1 = ganador. Mesa final = top 9. Promedio de puntos: solo noches jugadas, sin ELIMINA. Subidas y caídas: puestos en la tabla de una fecha a la siguiente.')
    addHeader(ws, ['Pos.', 'Jugador', 'PUNTOS', 'ACUM.', 'Asistencias', 'Faltas', 'Victorias', '2dos', '3ros', 'Podios',
      'Mesas finales', 'Veces 2', 'Veces 7', 'Total 7/2', 'Elim. hechas', 'Veces eliminado', 'Mejor puesto noche', 'Peor puesto noche',
      'Puesto prom.', 'Puntos prom.', 'Racha mesa final', 'Racha sin faltar', 'Fechas como líder', 'Mejor puesto tabla',
      'Peor puesto tabla', 'Mayor subida', 'Fecha subida', 'Mayor caída', 'Fecha caída'])
    const top = ws.rowCount
    players.forEach(p => {
      alignRow(ws.addRow([
        p.position, p.name, p.finalScore, p.totalPoints, p.attendances, p.absences, p.wins, p.seconds, p.thirds, p.podiums,
        p.finalTables, p.dos, p.siete, p.sieteYDos, p.eliminationsMade, p.eliminationsReceived, p.bestNight, p.worstNight,
        p.averageNight, p.averagePoints, p.longestFinalTableStreak, p.longestAttendanceStreak, p.datesAsLeader,
        p.bestTablePosition, p.worstTablePosition,
        p.biggestRise?.positions ?? null, p.biggestRise ? `F${p.biggestRise.dateNumber}` : '',
        p.biggestDrop?.positions ?? null, p.biggestDrop ? `F${p.biggestDrop.dateNumber}` : ''
      ]))
    })
    widths(ws, [6, 26, ...Array(27).fill(11)])
    freeze(ws, top, 2)
  }

  // ==========================================================================
  // 6. Evolución
  // ==========================================================================
  {
    const ws = workbook.addWorksheet(sheetName(5))
    addTitle(ws, `${title} — Evolución de la tabla`,
      'Puesto en la tabla oficial después de cada fecha (con el ELIMINA). Las multas de puntos no tienen fecha: se aplican solo en la tabla final. En amarillo, el líder.')
    addHeader(ws, ['Pos. final', 'Jugador', ...dateNums.map(d => `F${d}`)])
    const top = ws.rowCount
    players.forEach(p => {
      const row = ws.addRow([p.position, p.name, ...p.evolution])
      alignRow(row)
      p.evolution.forEach((pos, i) => {
        if (pos === 1) {
          row.getCell(3 + i).fill = LEADER_FILL
          row.getCell(3 + i).font = { bold: true }
        }
      })
    })
    widths(ws, [10, 26, ...Array(dateNums.length).fill(6)])
    freeze(ws, top, 2)
  }

  // ==========================================================================
  // 7. Rivalidades y P&H
  // ==========================================================================
  {
    const ws = workbook.addWorksheet(sheetName(6))
    addTitle(ws, `${title} — Rivalidades y Padre e Hijo`)
    ws.addRow(['QUIÉN ELIMINÓ MÁS VECES A QUIÉN']).font = SECTION_FONT
    ws.addRow(['Parejas con 2 o más eliminaciones, invitados incluidos.']).font = NOTE_FONT
    addHeader(ws, ['Eliminador', 'Eliminado', 'Veces', 'Primera', 'Última'])
    const repeated = report.pairs.filter(p => p.count >= 2)
    if (repeated.length) repeated.forEach(p => alignRow(ws.addRow([nameOf(p.eliminatorId), nameOf(p.eliminatedId), p.count, `F${p.first}`, `F${p.last}`])))
    else ws.addRow(['Ninguna pareja se repitió'])

    addSection(ws, 'VÍCTIMA FAVORITA Y VERDUGO DE CADA JUGADOR', 'A quién eliminó más veces y quién lo eliminó más veces. Empates separados por coma.')
    addHeader(ws, ['Jugador', 'Su víctima favorita', 'Veces', 'Su verdugo', 'Veces'])
    const topOf = (list: typeof report.pairs, key: 'eliminatorId' | 'eliminatedId') => {
      if (!list.length) return { who: '', count: null as number | null }
      const max = Math.max(...list.map(p => p.count))
      return { who: list.filter(p => p.count === max).map(p => nameOf(p[key])).join(', '), count: max }
    }
    players.forEach(p => {
      const victim = topOf(report.pairs.filter(x => x.eliminatorId === p.playerId), 'eliminatedId')
      const killer = topOf(report.pairs.filter(x => x.eliminatedId === p.playerId), 'eliminatorId')
      alignRow(ws.addRow([p.name, victim.who, victim.count, killer.who, killer.count]))
    })

    addSection(ws, 'PADRES E HIJOS', '3 o más eliminaciones al mismo jugador, entre inscritos que no son invitados (la regla de Estadísticas → P&H).')
    addHeader(ws, ['Padre', 'Hijo', 'Eliminaciones', 'Primera', 'Última'])
    if (report.parentChild.length) {
      report.parentChild.forEach(r => {
        const row = ws.addRow([nameOf(r.eliminatorId), nameOf(r.eliminatedId), r.count, excelDate(r.first), excelDate(r.last)])
        row.getCell(4).numFmt = DATE_FMT
        row.getCell(5).numFmt = DATE_FMT
        alignRow(row)
      })
    } else {
      ws.addRow(['Sin relaciones activas'])
    }
    widths(ws, [28, 30, 12, 30, 12])
  }

  // ==========================================================================
  // 8. Matriz de eliminaciones
  // ==========================================================================
  {
    const ws = workbook.addWorksheet(sheetName(7))
    addTitle(ws, `${title} — Matriz de eliminaciones`, 'Fila = quién eliminó · Columna = quién fue eliminado. No cuenta la fila del ganador de cada noche.')
    const ids = [...new Set(report.pairs.flatMap(p => [p.eliminatorId, p.eliminatedId]))]
      .sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'es'))
    const count = new Map(report.pairs.map(p => [`${p.eliminatorId}->${p.eliminatedId}`, p.count]))
    addHeader(ws, ['Eliminador \\ Eliminado', ...ids.map(nameOf), 'Total eliminaciones'])
    const top = ws.rowCount
    const colTotals = ids.map(() => 0)
    ids.forEach(from => {
      let total = 0
      const cells = ids.map((to, i) => {
        const c = count.get(`${from}->${to}`) ?? 0
        total += c
        colTotals[i] += c
        return c || ''
      })
      alignRow(ws.addRow([nameOf(from), ...cells, total]))
    })
    const totals = ws.addRow(['Total veces eliminado', ...colTotals.map(c => c || ''), ''])
    totals.font = { bold: true }
    alignRow(totals)
    widths(ws, [26, ...ids.map(() => 14), 18])
    freeze(ws, top, 1)
  }

  // ==========================================================================
  // 9. Resultados por fecha (el registro completo)
  // ==========================================================================
  {
    const ws = workbook.addWorksheet(sheetName(8))
    addTitle(ws, `${title} — Resultados por fecha`)
    addHeader(ws, ['Fecha', 'Día', 'Posición', 'Jugador', 'Eliminado por', 'Puntos', 'Inscrito'])
    const top = ws.rowCount
    const registered = new Set(standings.map(r => r.playerId))
    dates.forEach(d => {
      const sorted = [...d.positions.entries()].sort((a, b) => a[1] - b[1])
      sorted.forEach(([id, pos]) => {
        const row = ws.addRow([
          d.dateNumber,
          excelDate(d.scheduledDate),
          pos,
          nameOf(id),
          pos === 1 ? '—' : nameOf(d.eliminatorOf.get(id)),
          d.points.get(id) ?? null,
          registered.has(id) ? 'Sí' : 'Invitado'
        ])
        row.getCell(2).numFmt = DATE_FMT
        alignRow(row)
      })
    })
    widths(ws, [7, 12, 10, 28, 28, 9, 10])
    freeze(ws, top)
  }

  // ==========================================================================
  // 10. Curiosidades
  // ==========================================================================
  {
    const ws = workbook.addWorksheet(sheetName(9))
    addTitle(ws, `${title} — Curiosidades`)
    addHeader(ws, ['Dato', 'Valor', 'Detalle'])
    const top = ws.rowCount
    report.curiosities.forEach(c => {
      const row = ws.addRow([c.label, c.value, c.detail ?? ''])
      row.getCell(1).font = { bold: true }
      row.getCell(3).alignment = { wrapText: true, vertical: 'top' }
    })
    const na = ws.addRow(['Fecha más larga', 'No disponible', 'La base guarda la hora de cada eliminación, pero muchas se cargaron después de la noche: la duración no es confiable.'])
    na.getCell(1).font = { bold: true }
    na.getCell(3).font = NOTE_FONT
    widths(ws, [38, 34, 100])
    freeze(ws, top)
  }

  // ==========================================================================
  // 11. Días sin ganar
  // ==========================================================================
  {
    const ws = workbook.addWorksheet(sheetName(10))
    const last = dates[dates.length - 1]
    const reference = last ? excelDate(last.scheduledDate) : new Date()
    addTitle(ws, `${title} — Días sin ganar`,
      last
        ? `Contados hasta la Fecha ${last.dateNumber} (${last.scheduledDate.split('-').reverse().join('/')}), la última jugada del torneo. La última victoria es la registrada en el perfil de cada jugador (cualquier torneo).`
        : 'Este torneo no tiene fechas jugadas.')
    addHeader(ws, ['Jugador', 'Última victoria registrada', 'Días sin ganar'])
    const top = ws.rowCount
    standings
      .map(r => playersById.get(r.playerId))
      .filter((p): p is TournamentStatsPlayer => !!p && p.role !== 'Invitado')
      .sort((a, b) => fullName(a).localeCompare(fullName(b), 'es'))
      .forEach(p => {
        const lastWin = parseFlexibleDate(p.lastVictoryDate)
        if (!lastWin) {
          ws.addRow([fullName(p), 'Nunca ha ganado', null])
          return
        }
        const days = Math.floor((reference.getTime() - lastWin.getTime()) / 86_400_000)
        const row = ws.addRow([fullName(p), lastWin, days])
        row.getCell(2).numFmt = DATE_FMT
        alignRow(row)
      })
    widths(ws, [28, 24, 16])
    freeze(ws, top)
  }

  return { workbook, tournamentNumber: loaded.tournamentNumber }
}

/** "YYYY-MM-DD" o "DD/MM/YYYY" (el mismo parser que /api/stats/days-without-victory), en UTC. */
function parseFlexibleDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  if (dateStr.includes('-') && dateStr.length === 10) {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(Date.UTC(year, month - 1, day))
  }
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/').map(Number)
    return new Date(Date.UTC(year, month - 1, day))
  }
  return null
}
