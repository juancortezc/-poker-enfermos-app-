/**
 * Timer de blinds. Reactivado tras: arreglar pausa/resume (idempotencia +
 * feedback de error), avisos push de "falta 1 minuto"/"cambio de blind"
 * disparados desde el servidor, y limpieza de los sistemas de sync muertos
 * (Socket.IO / SSE) que generaban confusión.
 */
export const TIMER_ENABLED = true
