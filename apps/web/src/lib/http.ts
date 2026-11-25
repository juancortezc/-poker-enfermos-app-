import { NextResponse } from 'next/server'
import type { z } from 'zod'
import { AppError } from '@/lib/errors'
import type { SuccessResponse } from '@/lib/errors'

/**
 * Respuesta correcta de la API: `{ success: true, data }`.
 * `init` acepta el status (201...) o un ResponseInit completo (headers).
 */
export function ok<T>(data: T, init?: number | ResponseInit): NextResponse<SuccessResponse<T>> {
  const responseInit = typeof init === 'number' ? { status: init } : init
  return NextResponse.json({ success: true as const, data }, responseInit)
}

/** Lee el body JSON. Si no es JSON valido: 400 INVALID_JSON. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw AppError.badRequest('El cuerpo de la solicitud no es JSON válido', 'INVALID_JSON')
  }
}

/** Lee y valida el body JSON con un esquema Zod (ZodError -> 422). */
export async function parseBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.output<S>> {
  return schema.parse(await readJson(request))
}

/**
 * Valida la query string con un esquema Zod de objeto. Los parametros
 * ausentes llegan como `undefined` (no como null), asi `.optional()` sirve.
 */
export function parseQuery<S extends z.ZodType>(request: Request, schema: S): z.output<S> {
  const params = new URL(request.url).searchParams
  const raw: Record<string, string> = {}
  for (const [key, value] of params.entries()) {
    if (!(key in raw)) raw[key] = value
  }
  return schema.parse(raw)
}

/** Valida los params (ya resueltos) de la ruta: `parseParams(await params, idParamsSchema)`. */
export function parseParams<S extends z.ZodType>(params: unknown, schema: S): z.output<S> {
  return schema.parse(params)
}
