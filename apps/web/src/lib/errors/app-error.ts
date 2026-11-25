import type { ErrorDetail } from './types'

/**
 * Error esperado de la API: lleva su status HTTP y un `code` estable.
 * Se lanza desde las rutas y `withErrorHandler` lo convierte en la respuesta.
 */
export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly errors?: ErrorDetail[]
  public readonly details?: Record<string, unknown>
  public readonly errorId: string
  public readonly isOperational: boolean

  constructor(
    message: string,
    statusCode: number,
    code: string,
    errors?: ErrorDetail[],
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.errors = errors
    this.details = details
    this.errorId = crypto.randomUUID()
    this.isOperational = true
    Object.setPrototypeOf(this, AppError.prototype)
  }

  static badRequest(message: string, code = 'BAD_REQUEST', details?: Record<string, unknown>) {
    return new AppError(message, 400, code, undefined, details)
  }

  static unauthorized(message = 'Acceso no autorizado', code = 'UNAUTHORIZED') {
    return new AppError(message, 401, code)
  }

  static forbidden(message = 'Sin permisos suficientes', code = 'FORBIDDEN') {
    return new AppError(message, 403, code)
  }

  static notFound(message: string, code = 'NOT_FOUND', details?: Record<string, unknown>) {
    return new AppError(message, 404, code, undefined, details)
  }

  static conflict(message: string, code = 'CONFLICT', details?: Record<string, unknown>) {
    return new AppError(message, 409, code, undefined, details)
  }

  static validation(errors: ErrorDetail[], message = 'Datos inválidos') {
    return new AppError(message, 422, 'VALIDATION_ERROR', errors)
  }

  static tooManyRequests(message: string, code = 'TOO_MANY_REQUESTS', details?: Record<string, unknown>) {
    return new AppError(message, 429, code, undefined, details)
  }

  static internal(message = 'Error interno del servidor', code = 'INTERNAL_ERROR') {
    return new AppError(message, 500, code)
  }

  static unavailable(message: string, code = 'SERVICE_UNAVAILABLE') {
    return new AppError(message, 503, code)
  }
}
