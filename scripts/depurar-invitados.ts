/**
 * Depuración de la lista de invitados.
 *
 * Ejecuta en seco por defecto:
 *   npx tsx scripts/depurar-invitados.ts
 * Para aplicar los cambios:
 *   npx tsx scripts/depurar-invitados.ts --apply
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

// Duplicados sin ninguna fecha ni eliminación asociada
const ORPHANS = [
  { id: 'cmpblp8ef0003ky04ea4tulax', label: 'Sobrino Diego (dup)' },
  { id: 'cmpblp2dg0001ky04gtbrsxxn', label: 'Sobrino Diego (dup)' },
  { id: 'cmpbmadwc0003js04e925yvw8', label: 'Sobrino Diego (dup)' },
  { id: 'cmm18h6r00001l204t9pnseay', label: 'Diego Torres (dup)' },
  { id: 'cmkn9x2sy0001ju041wfz7yd7', label: 'Diego Torres (dup)' },
  { id: 'cmm16sz5w0001l504bqwai9ru', label: 'Carlos Guaman (dup)' },
  { id: 'cmiz24qcl0003p8vraekzgunq', label: 'Guido Andrade (dup)' },
  { id: 'cmiz243iz0001p8vr2834wnh6', label: 'Test User' },
]

// Fusiones: los registros `from` se absorben en `into`
const MERGES = [
  {
    into: 'cmpbm8xf70001js04flkx9new', // Sobrino Diego - T30-F3
    from: ['cmpbmlq7v0001jr0420tv5b7b'], // Sobrino Diego - T30-F4
    rename: { firstName: 'Sobrino Diego', lastName: '' },
    label: 'Sobrino Diego (unificar)',
  },
  {
    into: 'cmfbl1aro0011p8dbbpksrzy1', // Invitado SN
    from: [
      'cmfbl1blp001fp8dbh9niq4a5', // Julio Betu
      'cmffupcev0000p8wqut8kn71v', // Invitado Genérico
    ],
    rename: { firstName: 'Invitado', lastName: '1' },
    label: 'Invitado 1 (genérico)',
  },
]

// Limpieza de apellidos placeholder
const RENAMES = [
  { id: 'cmfbl1b0l0015p8dbk7us4l69', firstName: 'Apolinar', lastName: '', label: 'Apolinar Externo -> Apolinar' },
]

async function main() {
  console.log(APPLY ? '=== APLICANDO CAMBIOS ===\n' : '=== SIMULACIÓN (usa --apply para ejecutar) ===\n')

  // 1. Verificar que los huérfanos siguen sin referencias
  console.log('1. Eliminar duplicados huérfanos')
  const orphanIds = ORPHANS.map(o => o.id)
  const orphanElims = await prisma.elimination.count({
    where: { OR: [{ eliminatedPlayerId: { in: orphanIds } }, { eliminatorPlayerId: { in: orphanIds } }] },
  })
  const allDates = await prisma.gameDate.findMany({ select: { id: true, playerIds: true } })
  const orphanInDates = allDates.filter(d => d.playerIds.some(id => orphanIds.includes(id)))

  if (orphanElims > 0 || orphanInDates.length > 0) {
    throw new Error(
      `Abortado: los huérfanos tienen referencias (${orphanElims} eliminaciones, ${orphanInDates.length} fechas)`
    )
  }
  for (const o of ORPHANS) console.log(`   - ${o.label} [${o.id}]`)

  // 2. Validar que las fusiones no generen dos eliminaciones en la misma fecha
  console.log('\n2. Fusiones')
  for (const m of MERGES) {
    const ids = [m.into, ...m.from]
    const elims = await prisma.elimination.findMany({
      where: { eliminatedPlayerId: { in: ids } },
      select: { gameDateId: true },
    })
    const seen = new Set<number>()
    for (const e of elims) {
      if (seen.has(e.gameDateId)) {
        throw new Error(`Abortado: la fusión "${m.label}" produciría dos eliminaciones en la fecha ${e.gameDateId}`)
      }
      seen.add(e.gameDateId)
    }
    console.log(`   - ${m.label}: absorbe ${m.from.length} registro(s), ${elims.length} eliminaciones en ${seen.size} fechas`)
  }

  console.log('\n3. Renombrados')
  for (const r of RENAMES) console.log(`   - ${r.label}`)

  if (!APPLY) {
    console.log('\nNada aplicado. Repite con --apply para ejecutar.')
    return
  }

  await prisma.$transaction(async tx => {
    for (const m of MERGES) {
      for (const fromId of m.from) {
        await tx.elimination.updateMany({
          where: { eliminatedPlayerId: fromId },
          data: { eliminatedPlayerId: m.into },
        })
        await tx.elimination.updateMany({
          where: { eliminatorPlayerId: fromId },
          data: { eliminatorPlayerId: m.into },
        })
      }

      const dates = await tx.gameDate.findMany({ select: { id: true, playerIds: true } })
      for (const d of dates) {
        if (!d.playerIds.some(id => m.from.includes(id))) continue
        const next = Array.from(new Set(d.playerIds.map(id => (m.from.includes(id) ? m.into : id))))
        await tx.gameDate.update({ where: { id: d.id }, data: { playerIds: next } })
      }

      await tx.player.deleteMany({ where: { id: { in: m.from } } })
      await tx.player.update({ where: { id: m.into }, data: m.rename })
    }

    for (const r of RENAMES) {
      await tx.player.update({ where: { id: r.id }, data: { firstName: r.firstName, lastName: r.lastName } })
    }

    await tx.player.deleteMany({ where: { id: { in: orphanIds } } })
  })

  const remaining = await prisma.player.findMany({
    where: { role: 'Invitado' },
    select: { firstName: true, lastName: true },
    orderBy: { firstName: 'asc' },
  })
  console.log(`\n=== LISTO: ${remaining.length} invitados ===`)
  for (const g of remaining) console.log(`   ${[g.firstName, g.lastName].filter(Boolean).join(' ')}`)
}

main()
  .catch(e => {
    console.error(e.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
