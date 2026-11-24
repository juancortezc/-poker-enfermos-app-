/**
 * Ninguna ruta de la API puede devolver `pin` ni `adminKey`.
 *
 * Prisma devuelve TODOS los escalares de un modelo cuando no hay `select`
 * (consulta directa a player, o `include`/`relacion: true` hacia un Player).
 * Esta prueba recorre el codigo de src/app/api y src/lib y falla si encuentra:
 *  1. una consulta `prisma.player.<metodo>({...})` que devuelve filas sin `select`;
 *  2. una relacion hacia Player cargada entera (`eliminatedPlayer: true`,
 *     `player: true`, `createdBy: true`, ...).
 * Las excepciones (codigo que lee el hash para comparar y no lo devuelve)
 * van en ALLOW con su motivo.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(__dirname, '..', 'src')
const DIRS = [join(ROOT, 'app', 'api'), join(ROOT, 'lib'), join(ROOT, 'infrastructure')]

/** Metodos que devuelven filas de Player. */
const RETURNING = ['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'create', 'update', 'upsert', 'delete']

/** Relaciones de otros modelos que apuntan a Player (ver schema.prisma). */
const PLAYER_RELATIONS = [
  'player', 'players', 'eliminatedPlayer', 'eliminatorPlayer', 'createdBy', 'inviter', 'invitees',
  'eliminator', 'eliminated', 'winner', 'champion', 'runnerUp', 'thirdPlace', 'siete', 'dos', 'author',
]

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return files(p)
    return /\.(ts|tsx)$/.test(name) ? [p] : []
  })
}

/** Texto del primer argumento `( ... )` a partir de `start` (parentesis balanceados). */
function callArgs(src: string, start: number): string {
  let depth = 0
  for (let i = start; i < src.length; i++) {
    if (src[i] === '(') depth++
    else if (src[i] === ')' && --depth === 0) return src.slice(start + 1, i)
  }
  return src.slice(start)
}

test('ninguna consulta a player devuelve filas sin select', () => {
  const offenders: string[] = []
  for (const dir of DIRS) {
    for (const file of files(dir)) {
      const src = readFileSync(file, 'utf8')
      const re = /(?:prisma|tx|db\(\))\.player\.(\w+)\s*\(/g
      for (let m; (m = re.exec(src)); ) {
        if (!RETURNING.includes(m[1])) continue
        const args = callArgs(src, m.index + m[0].length - 1)
        if (/\bselect\s*:/.test(args)) continue
        // Escritura cuyo resultado no se usa: `await prisma.player.update(...)` suelto.
        const before = src.slice(Math.max(0, m.index - 40), m.index)
        if (/(^|[;{}\n]\s*)await\s+$/.test(before)) continue
        const line = src.slice(0, m.index).split('\n').length
        offenders.push(`${relative(ROOT, file)}:${line} prisma.player.${m[1]} sin select`)
      }
    }
  }
  assert.deepEqual(offenders, [])
})

test('ninguna relacion hacia Player se carga entera', () => {
  const offenders: string[] = []
  const re = new RegExp(`\\b(${PLAYER_RELATIONS.join('|')})\\s*:\\s*true\\b`, 'g')
  for (const dir of DIRS) {
    for (const file of files(dir)) {
      const src = readFileSync(file, 'utf8')
      for (let m; (m = re.exec(src)); ) {
        // `_count: { select: { invitees: true } }` cuenta, no carga filas.
        const ctx = src.slice(Math.max(0, m.index - 60), m.index)
        if (/_count\s*:\s*\{\s*select\s*:\s*\{[^}]*$/.test(ctx)) continue
        const line = src.slice(0, m.index).split('\n').length
        offenders.push(`${relative(ROOT, file)}:${line} ${m[0]}`)
      }
    }
  }
  assert.deepEqual(offenders, [])
})
