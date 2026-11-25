/**
 * Compara el podio y el 7/2 guardados en TournamentWinners con la tabla final
 * oficial (calculateTournamentRanking) de cada torneo FINALIZADO y, con
 * --apply, corrige el 7 y el 2.
 *
 * Por que: generateTournamentWinners guardaba como "7" al SEPTIMO de la tabla
 * (rankings[6]) en vez del penultimo. El 7/2 del torneo son los dos ultimos:
 * el 7 es el penultimo y el 2 el ultimo (ver tournamentSieteDos en
 * @poker/shared). En QA esto dejo mal el 7 del T30.
 *
 * Uso (desde apps/web):
 *   npx tsx scripts/fix-tournament-winners-siete.ts            # solo muestra
 *   npx tsx scripts/fix-tournament-winners-siete.ts --apply    # corrige
 *
 * Solo toca sieteId y dosId. El podio se informa pero no se cambia.
 */
import { tournamentSieteDos } from '@poker/shared'
import { prisma } from '../src/lib/prisma'
import { calculateTournamentRanking } from '../src/lib/ranking-utils'

const APPLY = process.argv.includes('--apply')

async function main() {
  const host = (process.env.DATABASE_URL ?? '').split('@')[1]?.split('/')[0] ?? '?'
  console.log(`Base: ${host} — modo ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`)

  const tournaments = await prisma.tournament.findMany({
    where: { status: 'FINALIZADO' },
    select: { id: true, number: true },
    orderBy: { number: 'asc' }
  })

  for (const t of tournaments) {
    const stored = await prisma.tournamentWinners.findUnique({ where: { tournamentNumber: t.number } })
    const ranking = await calculateTournamentRanking(t.id)
    if (!stored || !ranking || ranking.rankings.length === 0) {
      console.log(`T${t.number}: sin registro o sin tabla, se omite`)
      continue
    }
    const r = ranking.rankings
    const ultimos = tournamentSieteDos(r)
    if (!ultimos) continue
    const name = (id: string) => r.find(p => p.playerId === id)?.playerName ?? id

    const podioOk = stored.championId === r[0].playerId && stored.runnerUpId === r[1].playerId && stored.thirdPlaceId === r[2].playerId
    const sieteOk = stored.sieteId === ultimos.siete.playerId
    const dosOk = stored.dosId === ultimos.dos.playerId
    console.log(`T${t.number}: podio ${podioOk ? 'OK' : 'DISTINTO'} · 7 ${sieteOk ? 'OK' : `guardado ${name(stored.sieteId)}, tabla ${ultimos.siete.playerName}`} · 2 ${dosOk ? 'OK' : `guardado ${name(stored.dosId)}, tabla ${ultimos.dos.playerName}`}`)

    if (APPLY && (!sieteOk || !dosOk)) {
      await prisma.tournamentWinners.update({
        where: { tournamentNumber: t.number },
        data: { sieteId: ultimos.siete.playerId, dosId: ultimos.dos.playerId }
      })
      console.log(`  -> corregido`)
    }
  }
}

main()
  .catch(e => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
