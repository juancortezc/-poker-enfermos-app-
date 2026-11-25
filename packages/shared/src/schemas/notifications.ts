/** Esquemas de entrada de la API: notificaciones push web (/api/notifications). */
import { z, userRoleSchema, playerIdSchema } from './common'

const title = z.string({ error: 'El título es obligatorio' }).trim().min(1, 'El título es obligatorio').max(200)
const body = z.string({ error: 'El mensaje es obligatorio' }).trim().min(1, 'El mensaje es obligatorio').max(1000)

/** Filtro de destinatarios: por rol y/o excluyendo jugadores. */
const targeting = {
  targetRoles: z.array(userRoleSchema).optional(),
  excludePlayerIds: z.array(playerIdSchema).optional(),
}

/** Campos opcionales del contenido de una notificacion. */
const payloadExtras = {
  icon: z.string().max(500).optional(),
  badge: z.string().max(500).optional(),
  url: z.string().max(500).optional(),
  actions: z.array(z.object({ action: z.string().max(100), title: z.string().max(100) })).max(4).optional(),
  requireInteraction: z.boolean().optional(),
  silent: z.boolean().optional(),
  tag: z.string().max(200).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
}

/** POST /api/notifications/send: a un jugador. */
export const sendNotificationSchema = z.object({
  playerId: playerIdSchema,
  title,
  body,
  ...payloadExtras,
})
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>

/** POST /api/notifications/broadcast: a todos o filtrado por rol. */
export const broadcastNotificationSchema = z.object({
  title,
  body,
  ...payloadExtras,
  ...targeting,
})
export type BroadcastNotificationInput = z.infer<typeof broadcastNotificationSchema>

/** POST /api/notifications/test. */
export const testNotificationSchema = z.object({
  title,
  body,
  ...targeting,
})
export type TestNotificationInput = z.infer<typeof testNotificationSchema>

/** POST /api/notifications/subscribe: la PushSubscription del navegador. */
export const pushSubscriptionSchema = z.object({
  subscription: z.object(
    {
      endpoint: z.string({ error: 'Falta el endpoint de la suscripción' }).min(1, 'Falta el endpoint de la suscripción').max(2000),
      keys: z.object(
        {
          p256dh: z.string({ error: 'Faltan las claves de la suscripción' }).min(1, 'Faltan las claves de la suscripción').max(500),
          auth: z.string({ error: 'Faltan las claves de la suscripción' }).min(1, 'Faltan las claves de la suscripción').max(500),
        },
        { error: 'Faltan las claves de la suscripción' }
      ),
    },
    { error: 'Faltan los datos de la suscripción' }
  ),
  userAgent: z.string().max(1000).optional(),
})
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>

/** `?endpoint=` de DELETE /api/notifications/subscribe. */
export const unsubscribeQuerySchema = z.object({
  endpoint: z.string({ error: 'Falta el endpoint' }).min(1, 'Falta el endpoint').max(2000),
})

/** `?page=1&limit=20&eventType=x` de GET /api/notifications/history. */
export const notificationHistoryQuerySchema = z.object({
  page: z.coerce.number({ error: 'page debe ser un número' }).int().min(1, 'page debe ser 1 o más').default(1),
  limit: z.coerce.number({ error: 'limit debe ser un número' }).int().min(1, 'limit debe estar entre 1 y 100').max(100, 'limit debe estar entre 1 y 100').default(20),
  eventType: z.string().max(100).optional(),
})

/**
 * Ajustes de un evento (ver NotificationEventSettings en la web). Se guardan
 * tal cual en JSON, asi que las claves extra se conservan (looseObject).
 */
export const notificationEventSettingsSchema = z.looseObject({
  isEnabled: z.boolean({ error: 'isEnabled debe ser true o false' }),
  timing: z.enum(['immediate', 'delayed'], { error: "timing debe ser 'immediate' o 'delayed'" }).optional(),
  delayMinutes: z.number().int().min(0).max(24 * 60).nullish(),
  targetRoles: z.array(userRoleSchema).nullish(),
  excludePlayerIds: z.array(playerIdSchema).nullish(),
  customMessage: z.looseObject({ title: z.string().max(200).nullish(), body: z.string().max(1000).nullish() }).nullish(),
})

/** POST /api/notifications/config: `{ settings: { [eventType]: ajustes } }`. */
export const notificationConfigSchema = z.object({
  settings: z.record(z.string().max(100), notificationEventSettingsSchema, { error: 'Falta el objeto settings' }),
})
export type NotificationConfigInput = z.infer<typeof notificationConfigSchema>
