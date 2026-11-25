/** Un problema puntual de un campo (validacion). */
export interface ErrorDetail {
  field: string
  message: string
  code?: string
}

/**
 * Cuerpo de toda respuesta de error de la API.
 *
 * `code` es estable (los clientes deciden con el); `message` es para mostrar,
 * en espanol. `errorId` sirve para encontrar el error en los logs.
 */
export interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    errors?: ErrorDetail[]
    /** Datos extra para el cliente (p. ej. `hint`, `stuckDates`). */
    details?: Record<string, unknown>
    errorId: string
    timestamp: string
    path: string
  }
  /** Solo en development. */
  debug?: {
    description: string
    stack?: string
    context?: Record<string, unknown>
  }
}

/** Cuerpo de toda respuesta correcta de la API (JSON). */
export interface SuccessResponse<T> {
  success: true
  data: T
}
