import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { AppError } from './app-error'
import type { ErrorDetail, ErrorResponse } from './types'

/**
 * Envuelve un handler de ruta: todo lo que lance sale como `ErrorResponse`.
 *
 * - `AppError` -> su status y su `code`.
 * - `ZodError` -> 422 VALIDATION_ERROR con `errors[]` (campo y mensaje).
 * - Prisma P2025 (no existe) -> 404, P2002 (unico duplicado) -> 409.
 * - Cualquier otra cosa -> 500 con un mensaje fijo: el mensaje real (SQL,
 *   rutas internas) solo se ve en `debug` y solo en development.
 *
 * Es generico en el contexto para conservar el tipo de `params` de Next 16
 * (`{ params: Promise<{ id: string }> }`), y se combina con `withAuth` /
 * `withComisionAuth` por dentro: lo que lancen sus handlers llega aqui.
 */
export function withErrorHandler<C, R extends Request = Request>(
  handler: (request: R, context: C) => Promise<Response>
): (request: R, context: C) => Promise<Response> {
  return async (request: R, context: C) => {
    try {
      return await handler(request, context)
    } catch (error) {
      return errorResponse(error, request.url)
    }
  }
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

const isDev = () => process.env.NODE_ENV === 'development'

/** Convierte cualquier error en la respuesta JSON estandar. */
export function errorResponse(error: unknown, url: string): NextResponse<ErrorResponse> {
  const path = pathOf(url)
  const timestamp = new Date().toISOString()

  if (error instanceof ZodError) {
    const errors: ErrorDetail[] = error.issues.map((issue) => ({
      field: issue.path.map(String).join('.'),
      message: issue.message,
      code: issue.code,
    }))
    const first = errors[0]
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        // El primero, legible: los clientes que solo muestran `message` dicen algo util.
        message: first ? (first.field ? `${first.field}: ${first.message}` : first.message) : 'Datos inválidos',
        errors,
        errorId: crypto.randomUUID(),
        timestamp,
        path,
      },
    }
    return NextResponse.json(response, { status: 422 })
  }

  const known = fromPrisma(error)
  if (known || error instanceof AppError) {
    const appError = known ?? (error as AppError)
    if (appError.statusCode >= 500) console.error(`[API ${path}] ${appError.code}:`, error)
    const response: ErrorResponse = {
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
        ...(appError.errors ? { errors: appError.errors } : {}),
        ...(appError.details ? { details: appError.details } : {}),
        errorId: appError.errorId,
        timestamp,
        path,
      },
    }
    if (isDev()) {
      response.debug = { description: appError.message, stack: (error as Error).stack }
    }
    return NextResponse.json(response, { status: appError.statusCode })
  }

  const errorId = crypto.randomUUID()
  console.error(`[API ${path}] Error no controlado (${errorId}):`, error)
  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
      errorId,
      timestamp,
      path,
    },
  }
  if (isDev() && error instanceof Error) {
    response.debug = { description: error.message, stack: error.stack }
  }
  return NextResponse.json(response, { status: 500 })
}

function fromPrisma(error: unknown): AppError | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null
  if (error.code === 'P2025') return AppError.notFound('Registro no encontrado')
  if (error.code === 'P2002') return AppError.conflict('Ya existe un registro con esos datos', 'DUPLICATE')
  return null
}
