/**
 * Reparación de las eliminaciones corruptas del Torneo 28 (fechas 2, 9 y 11).
 *
 * Ejecuta en seco por defecto:
 *   npx tsx scripts/reparar-t28-eliminaciones.ts
 * Para aplicar los cambios:
 *   npx tsx scripts/reparar-t28-eliminaciones.ts --apply
 *
 * Diagnóstico y justificación de cada corrección:
 *
 * T28-F2 (23 inscritos, 24 eliminaciones)
 *   El CSV de origen (data/imports/f2.csv) lista a Jose Luis Toral dos veces,
 *   en las posiciones 13 y 6. Un parche posterior insertó a Juan Antonio Cortez
 *   en la posición 1 con los 19 puntos que corresponden a la posición 6, y
 *   desplazó al ganador a la posición 2. Con 23 jugadores cada valor de puntos
 *   debe aparecer una sola vez, y solo el 19 está duplicado, así que la
 *   reconstrucción es unívoca.
 *
 * T28-F9 (21 inscritos, 21 eliminaciones)
 *   Los puntos son correctos y únicos; solo dos campos `position` están
 *   corridos, dejando la posición 4 vacía y la 6 duplicada.
 *
 * T28-F11 (20 inscritos, 18 eliminaciones)
 *   Faltan las posiciones 9 y 17. Los dos únicos inscritos sin eliminación son
 *   Jose Patricio Moreno y Meche Garrido. Moreno figura como eliminador en la
 *   posición 10, así que seguía en juego y solo puede ser la posición 9.
 *   Quién los eliminó se perdió: se registra con un jugador placeholder.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

const PLACEHOLDER = { firstName: 'Desconocido', lastName: '' }

async function resolvePlayers() {
  const players = await prisma.player.findMany({ select: { id: true, firstName: true, lastName: true } })
  const byName = new Map(players.map(p => [`${p.firstName} ${p.lastName}`.trim(), p.id]))
  return (name: string) => {
    const id = byName.get(name)
    if (!id) throw new Error(`Jugador no encontrado: "${name}"`)
    return id
  }
}

async function main() {
  console.log(APPLY ? '=== APLICANDO CAMBIOS ===\n' : '=== SIMULACIÓN (usa --apply para ejecutar) ===\n')

  const find = await resolvePlayers()
  const mecheId = find('Meche Garrido')
  const morenoId = find('Jose Patricio Moreno')

  const f11 = await prisma.gameDate.findFirst({
    where: { dateNumber: 11, tournament: { number: 28 } },
    select: { id: true },
  })
  if (!f11) throw new Error('T28-F11 no encontrada')

  // --- Comprobaciones previas: el estado corrupto debe ser el esperado ---
  const e284 = await prisma.elimination.findUnique({ where: { id: 284 } })
  const e580 = await prisma.elimination.findUnique({ where: { id: 580 } })
  const e49 = await prisma.elimination.findUnique({ where: { id: 49 } })
  const e192 = await prisma.elimination.findUnique({ where: { id: 192 } })
  const e193 = await prisma.elimination.findUnique({ where: { id: 193 } })

  const checks: [string, boolean][] = [
    ['id=284 es el duplicado de Toral en pos 6 con 19 pts', e284?.position === 6 && e284?.points === 19],
    ['id=580 es Cortez en pos 1 con 19 pts', e580?.position === 1 && e580?.points === 19],
    ['id=49 es el ganador con 30 pts en pos 2', e49?.position === 2 && e49?.points === 30],
    ['id=192 tiene 19 pts en pos 5', e192?.position === 5 && e192?.points === 19],
    ['id=193 tiene 18 pts en pos 6', e193?.position === 6 && e193?.points === 18],
  ]
  console.log('Comprobaciones previas:')
  for (const [label, ok] of checks) {
    console.log(`  ${ok ? 'OK ' : 'FALLA'} ${label}`)
    if (!ok) throw new Error(`Abortado: el estado de la base no coincide con el diagnóstico (${label})`)
  }

  console.log('\nT28-F2')
  console.log('  - borrar id=284 (Jose Luis Toral duplicado en pos 6)')
  console.log('  - id=580 Juan Antonio Cortez: pos 1 -> 6, eliminador -> Meche Garrido')
  console.log('  - id=49 Juan Fernando Ochoa: pos 2 -> 1 (ganador)')

  console.log('\nT28-F9')
  console.log('  - id=192 Juan Tapia: pos 5 -> 4')
  console.log('  - id=193 Joffre Palacios: pos 6 -> 5')

  console.log('\nT28-F11')
  console.log('  - crear pos 9 (13 pts): Jose Patricio Moreno, eliminado por Desconocido')
  console.log('  - crear pos 17 (4 pts): Meche Garrido, eliminado por Desconocido')

  if (!APPLY) {
    console.log('\nNada aplicado. Repite con --apply para ejecutar.')
    return
  }

  // Placeholder para los eliminadores que se perdieron. Se crea como Invitado
  // inactivo: satisface la FK, queda fuera de rankings y de las estadísticas
  // P&H (que excluyen a los invitados) y no aparece en selectores ni directorio.
  let desconocido = await prisma.player.findFirst({
    where: { firstName: PLACEHOLDER.firstName, lastName: PLACEHOLDER.lastName, role: 'Invitado' },
    select: { id: true },
  })
  if (!desconocido) {
    desconocido = await prisma.player.create({
      data: {
        ...PLACEHOLDER,
        role: 'Invitado',
        joinDate: '2025',
        joinYear: 2025,
        isActive: false,
        aliases: [],
      },
      select: { id: true },
    })
    console.log('\nJugador placeholder "Desconocido" creado (Invitado inactivo)')
  }

  await prisma.$transaction([
    // T28-F2
    prisma.elimination.delete({ where: { id: 284 } }),
    prisma.elimination.update({
      where: { id: 580 },
      data: {
        position: 6,
        eliminatorPlayerId: mecheId,
        eliminationTime: '2025-04-16T00:08:30.000Z',
      },
    }),
    prisma.elimination.update({ where: { id: 49 }, data: { position: 1 } }),

    // T28-F9
    prisma.elimination.update({ where: { id: 192 }, data: { position: 4 } }),
    prisma.elimination.update({ where: { id: 193 }, data: { position: 5 } }),

    // T28-F11
    prisma.elimination.create({
      data: {
        gameDateId: f11.id,
        position: 9,
        points: 13,
        eliminatedPlayerId: morenoId,
        eliminatorPlayerId: desconocido.id,
        eliminationTime: '2025-09-22T19:53:08.042Z',
      },
    }),
    prisma.elimination.create({
      data: {
        gameDateId: f11.id,
        position: 17,
        points: 4,
        eliminatedPlayerId: mecheId,
        eliminatorPlayerId: desconocido.id,
        eliminationTime: '2025-09-22T19:53:07.294Z',
      },
    }),
  ])

  console.log('\nCambios aplicados.')
}

main()
  .catch(e => {
    console.error(e.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
