/**
 * Las uniones de texto de types.ts deben coincidir EXACTAMENTE con los enums
 * de Prisma. Se lee el schema como texto (sin base de datos ni @prisma/client).
 *
 * Las listas de abajo estan tipadas contra las uniones: `tsc -p tests` falla si
 * a la lista le sobra un valor o le falta uno de la union, y este test falla si
 * la lista no es igual al enum del schema.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { UserRole, TournamentStatus, GameDateStatus, TimerStatus, VoteType, NotificationType } from '../src/index'

type Exacta<U, L extends readonly U[]> = [Exclude<U, L[number]>] extends [never] ? L : never
const exacta = <U>() => <const L extends readonly U[]>(l: Exacta<U, L>) => l

const UNIONES: Record<string, readonly string[]> = {
  UserRole: exacta<UserRole>()(['Comision', 'Enfermo', 'Invitado']),
  TournamentStatus: exacta<TournamentStatus>()(['ACTIVO', 'FINALIZADO']),
  GameDateStatus: exacta<GameDateStatus>()(['pending', 'in_progress', 'completed', 'cancelled', 'CREATED']),
  TimerStatus: exacta<TimerStatus>()(['inactive', 'active', 'paused', 'completed']),
  VoteType: exacta<VoteType>()(['thumbsUp', 'thumbsDown']),
  NotificationType: exacta<NotificationType>()(['manual', 'automatic', 'scheduled', 'test']),
}

function enumsDelSchema(): Record<string, string[]> {
  const schema = readFileSync(join(__dirname, '..', '..', '..', 'apps', 'web', 'prisma', 'schema.prisma'), 'utf8')
  const out: Record<string, string[]> = {}
  for (const m of schema.matchAll(/^enum\s+(\w+)\s*\{([^}]*)\}/gm)) {
    out[m[1]] = m[2]
      .split('\n')
      .map((l) => l.replace(/\/\/.*$/, '').trim())
      .filter(Boolean)
      .map((l) => l.split(/\s+/)[0])
  }
  return out
}

test('cada union coincide con su enum de Prisma (mismo conjunto de valores)', () => {
  const enums = enumsDelSchema()
  for (const [nombre, valores] of Object.entries(UNIONES)) {
    assert.ok(enums[nombre], `el schema no tiene enum ${nombre}`)
    assert.deepEqual([...valores].sort(), [...enums[nombre]].sort(), nombre)
  }
})

test('ningun enum del schema queda sin su union compartida', () => {
  const faltan = Object.keys(enumsDelSchema()).filter((e) => !(e in UNIONES))
  assert.deepEqual(faltan, [])
})
