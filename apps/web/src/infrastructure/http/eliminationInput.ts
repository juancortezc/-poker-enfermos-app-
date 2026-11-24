import { NextRequest } from 'next/server';
import { InvalidEliminationInputError } from '@/domain/elimination';

/**
 * Validacion de forma de los bodies de /api/eliminations. Lo que no pasa
 * sale como 400 con code INVALID_INPUT, antes de tocar la base (antes un
 * "8" o un 7.5 llegaban a Prisma y el 500 devolvia su mensaje con rutas).
 */

const MAX_ID = 64;

async function readJsonObject(request: NextRequest): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new InvalidEliminationInputError('El cuerpo de la solicitud no es JSON válido');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new InvalidEliminationInputError('El cuerpo de la solicitud debe ser un objeto JSON');
  }
  return body as Record<string, unknown>;
}

function positiveInt(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new InvalidEliminationInputError(`${field} debe ser un entero positivo`);
  }
  return value;
}

function playerId(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '' || value.length > MAX_ID) {
    throw new InvalidEliminationInputError(`${field} debe ser un id de jugador`);
  }
  return value;
}

/** null / undefined / '' = sin eliminador. */
function optionalPlayerId(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  return playerId(value, field);
}

export interface RegisterEliminationInput {
  gameDateId: number;
  position: number;
  eliminatedPlayerId: string;
  eliminatorPlayerId: string | null;
}

export async function parseRegisterElimination(request: NextRequest): Promise<RegisterEliminationInput> {
  const body = await readJsonObject(request);
  return {
    gameDateId: positiveInt(body.gameDateId, 'gameDateId'),
    position: positiveInt(body.position, 'position'),
    eliminatedPlayerId: playerId(body.eliminatedPlayerId, 'eliminatedPlayerId'),
    eliminatorPlayerId: optionalPlayerId(body.eliminatorPlayerId, 'eliminatorPlayerId'),
  };
}

export interface UpdateEliminationInput {
  eliminatedPlayerId?: string;
  /** undefined = no cambia (null o vacio tambien: asi lo trataba la API). */
  eliminatorPlayerId?: string;
}

export async function parseUpdateElimination(request: NextRequest): Promise<UpdateEliminationInput> {
  const body = await readJsonObject(request);

  if (body.position !== undefined || body.points !== undefined) {
    throw new InvalidEliminationInputError('No se puede cambiar la posición ni los puntos');
  }

  // Se aceptan los dos nombres (eliminatedId/eliminatorId son los viejos).
  const rawEliminated = body.eliminatedPlayerId ?? body.eliminatedId;
  const rawEliminator = body.eliminatorPlayerId ?? body.eliminatorId;

  return {
    eliminatedPlayerId:
      rawEliminated == null ? undefined : playerId(rawEliminated, 'eliminatedPlayerId'),
    eliminatorPlayerId:
      optionalPlayerId(rawEliminator, 'eliminatorPlayerId') ?? undefined,
  };
}

export function parseEliminationId(raw: string): number {
  if (!/^\d+$/.test(raw)) {
    throw new InvalidEliminationInputError('ID de eliminación inválido');
  }
  return positiveInt(Number(raw), 'id');
}
