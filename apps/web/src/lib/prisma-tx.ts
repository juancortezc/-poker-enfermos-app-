import { AsyncLocalStorage } from 'node:async_hooks'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * Transacciones sin pasar `tx` por todas las capas.
 *
 * Los repositorios piden su cliente con `db()`: dentro de `withGameDateLock`
 * reciben el cliente de la transaccion; fuera, el global. Asi el caso de uso
 * no conoce Prisma y las lecturas de validacion y la escritura quedan en la
 * misma transaccion.
 */
const store = new AsyncLocalStorage<Prisma.TransactionClient>()

export function db(): Prisma.TransactionClient {
  return store.getStore() ?? prisma
}

/**
 * Corre `fn` en una transaccion que bloquea la fila de la fecha
 * (`SELECT ... FOR UPDATE`). Dos altas simultaneas sobre la misma fecha se
 * ejecutan una detras de otra: la segunda ya ve lo que escribio la primera.
 * Si ya hay una transaccion abierta, la reutiliza.
 */
export async function withGameDateLock<T>(gameDateId: number, fn: () => Promise<T>): Promise<T> {
  if (store.getStore()) return fn()
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM game_dates WHERE id = ${gameDateId} FOR UPDATE`
      return store.run(tx, fn)
    },
    { timeout: 15_000, maxWait: 10_000 }
  )
}
