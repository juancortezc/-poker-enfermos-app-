/**
 * Reemplazo atómico de los resultados de una fecha desde el CSV.
 *
 * Antes se borraban las eliminaciones de la fecha fuera de la transacción y
 * se creaban después dentro de otra: si la segunda fallaba (un jugador no
 * encontrado, la base caída) la fecha quedaba con 0 eliminaciones. Ahora el
 * borrado, el alta y el cambio de estado van en un solo $transaction, y los
 * jugadores se resuelven antes de abrirla.
 */
import type { Prisma } from '@prisma/client'
import type { CsvElimination } from '@poker/shared'
import { AppError } from '@/lib/errors'

type Db = Prisma.TransactionClient

/** Lo mínimo del cliente Prisma que hace falta (así se prueba con un falso). */
export interface TransactionRunner {
  $transaction<R>(fn: (tx: Db) => Promise<R>): Promise<R>
}

export interface EliminationRow {
  position: number
  points: number
  eliminatedPlayerId: string
  eliminatorPlayerId: string
  eliminationTime: string
}

/** 19:00 de Ecuador del día del CSV, como en la importación original. */
export function importStartTime(date: string): Date {
  return new Date(`${date}T19:00:00-05:00`)
}

/**
 * Filas del CSV → filas de `eliminations`. `resolve` devuelve el id del
 * jugador o null; un eliminado o un eliminador que no existe es 400
 * PLAYER_NOT_FOUND (antes el eliminador desconocido pasaba a
 * autoeliminación sin avisar). Sin eliminador, el jugador se registra como
 * su propio eliminador (el ganador).
 */
export async function buildEliminationRows(
  rows: readonly CsvElimination[],
  resolve: (csvName: string) => Promise<string | null>
): Promise<EliminationRow[]> {
  const sorted = [...rows].sort((a, b) => b.posicion - a.posicion)
  const out: EliminationRow[] = []
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i]
    const eliminatedPlayerId = await resolve(r.eliminado)
    if (!eliminatedPlayerId) {
      throw AppError.badRequest(`Jugador eliminado no encontrado: ${r.eliminado}`, 'PLAYER_NOT_FOUND')
    }
    let eliminatorPlayerId = eliminatedPlayerId
    if (r.eliminador && r.eliminador.trim() !== '') {
      const found = await resolve(r.eliminador)
      if (!found) {
        throw AppError.badRequest(`Eliminador no encontrado: ${r.eliminador}`, 'PLAYER_NOT_FOUND')
      }
      eliminatorPlayerId = found
    }
    // Separadas 30 s para que el orden por hora coincida con el de posición.
    const at = new Date(importStartTime(r.date).getTime() + i * 30 * 1000)
    out.push({
      position: r.posicion,
      points: r.puntos,
      eliminatedPlayerId,
      eliminatorPlayerId,
      eliminationTime: at.toISOString(),
    })
  }
  return out
}

/**
 * Borra las eliminaciones de la fecha, crea las del CSV y la deja
 * `completed`, todo o nada. Rechaza (409 GAME_DATE_IN_PROGRESS) una fecha en
 * curso: el estado se vuelve a leer dentro de la transacción.
 */
export async function replaceGameDateEliminations(
  db: TransactionRunner,
  gameDateId: number,
  date: string,
  rows: readonly EliminationRow[]
): Promise<{ deleted: number; created: number }> {
  return db.$transaction(async (tx) => {
    const current = await tx.gameDate.findUnique({ where: { id: gameDateId }, select: { status: true } })
    if (!current) {
      throw AppError.notFound('Fecha no encontrada', 'GAME_DATE_NOT_FOUND')
    }
    assertImportableStatus(current.status)

    const { count: deleted } = await tx.elimination.deleteMany({ where: { gameDateId } })
    const { count: created } = await tx.elimination.createMany({
      data: rows.map((r) => ({ ...r, gameDateId })),
    })
    await tx.gameDate.update({
      where: { id: gameDateId },
      data: { status: 'completed', startTime: importStartTime(date) },
    })
    return { deleted, created }
  })
}

/** No se importa sobre una fecha que se está jugando. */
export function assertImportableStatus(status: string): void {
  if (status === 'in_progress') {
    throw AppError.conflict(
      'La fecha está en curso: no se pueden importar resultados mientras se juega',
      'GAME_DATE_IN_PROGRESS'
    )
  }
}
