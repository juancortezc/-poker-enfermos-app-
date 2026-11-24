import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TOURNAMENT_ID = 3
const APPLY = process.argv.includes('--apply')

// Final state after renumber. Existing rows are reused (no deletes/inserts).
// The May 5 slot (id=30) is repurposed into the new Oct 27 final date.
const FINAL_STATE: Array<{ id: number; dateNumber: number; scheduledDate: string }> = [
  { id: 31, dateNumber: 3,  scheduledDate: '2026-05-19T12:00:00.000Z' },
  { id: 32, dateNumber: 4,  scheduledDate: '2026-06-02T12:00:00.000Z' },
  { id: 33, dateNumber: 5,  scheduledDate: '2026-06-16T12:00:00.000Z' },
  { id: 34, dateNumber: 6,  scheduledDate: '2026-06-30T12:00:00.000Z' },
  { id: 35, dateNumber: 7,  scheduledDate: '2026-07-14T12:00:00.000Z' },
  { id: 36, dateNumber: 8,  scheduledDate: '2026-07-28T12:00:00.000Z' },
  { id: 37, dateNumber: 9,  scheduledDate: '2026-08-18T12:00:00.000Z' },
  { id: 38, dateNumber: 10, scheduledDate: '2026-09-01T12:00:00.000Z' },
  { id: 39, dateNumber: 11, scheduledDate: '2026-09-15T12:00:00.000Z' },
  { id: 40, dateNumber: 12, scheduledDate: '2026-09-29T12:00:00.000Z' },
  { id: 41, dateNumber: 13, scheduledDate: '2026-10-13T12:00:00.000Z' },
  { id: 30, dateNumber: 14, scheduledDate: '2026-10-27T12:00:00.000Z' },
]

async function main() {
  console.log(`🎯 Renumber T30 dates — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`)

  const current = await prisma.gameDate.findMany({
    where: { tournamentId: TOURNAMENT_ID },
    orderBy: { dateNumber: 'asc' },
    select: {
      id: true, dateNumber: true, scheduledDate: true, status: true,
      playerIds: true,
      _count: { select: { eliminations: true, gameResults: true, tournamentRankings: true } }
    }
  })

  console.log('Estado actual:')
  for (const d of current) {
    console.log(`  id=${d.id}  #${d.dateNumber}  ${d.scheduledDate.toISOString().slice(0,10)}  ${d.status}  players=${d.playerIds.length}  elim=${d._count.eliminations}`)
  }

  // Safety: only pending dates with no plays may be touched.
  const touchedIds = new Set(FINAL_STATE.map(s => s.id))
  for (const d of current) {
    if (!touchedIds.has(d.id)) continue
    if (d.status !== 'pending') throw new Error(`Abort: id=${d.id} status=${d.status} (expected pending)`)
    if (d.playerIds.length > 0) throw new Error(`Abort: id=${d.id} tiene playerIds`)
    if (d._count.eliminations + d._count.gameResults + d._count.tournamentRankings > 0) {
      throw new Error(`Abort: id=${d.id} tiene datos de juego asociados`)
    }
  }

  console.log('\nCambios planificados:')
  const byId = new Map(current.map(c => [c.id, c]))
  for (const target of FINAL_STATE) {
    const cur = byId.get(target.id)
    if (!cur) throw new Error(`No existe id=${target.id}`)
    const newDate = target.scheduledDate.slice(0,10)
    const oldDate = cur.scheduledDate.toISOString().slice(0,10)
    const dateChanged = oldDate !== newDate
    const numChanged = cur.dateNumber !== target.dateNumber
    if (!dateChanged && !numChanged) continue
    console.log(`  id=${target.id}: #${cur.dateNumber}→#${target.dateNumber}  ${oldDate}→${newDate}`)
  }

  if (!APPLY) {
    console.log('\nDRY-RUN. Re-ejecuta con --apply para aplicar.')
    return
  }

  // Two-phase update: avoid any transient duplicate dateNumber by parking
  // dateNumbers in a negative range first, then writing the final values.
  await prisma.$transaction(async (tx) => {
    for (const target of FINAL_STATE) {
      await tx.gameDate.update({
        where: { id: target.id },
        data: { dateNumber: -target.dateNumber }
      })
    }
    for (const target of FINAL_STATE) {
      await tx.gameDate.update({
        where: { id: target.id },
        data: {
          dateNumber: target.dateNumber,
          scheduledDate: new Date(target.scheduledDate),
        }
      })
    }
  })

  console.log('\n✅ Aplicado. Estado final:')
  const after = await prisma.gameDate.findMany({
    where: { tournamentId: TOURNAMENT_ID },
    orderBy: { dateNumber: 'asc' },
    select: { id: true, dateNumber: true, scheduledDate: true, status: true }
  })
  for (const d of after) {
    console.log(`  id=${d.id}  #${d.dateNumber}  ${d.scheduledDate.toISOString().slice(0,10)}  ${d.status}`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
