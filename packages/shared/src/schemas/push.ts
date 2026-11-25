/** Esquemas de entrada de la API: dispositivos push de la app (/api/push/devices). */
import { z } from './common'

/** ExponentPushToken[...] o ExpoPushToken[...]. Misma regla que apps/web/src/lib/expo-push.ts. */
export const EXPO_PUSH_TOKEN_RE = /^Expo(nent)?PushToken\[[^\]\s]+\]$/

export const expoPushTokenSchema = z
  .string({ error: 'expoToken inválido' })
  .max(255, 'expoToken inválido')
  .regex(EXPO_PUSH_TOKEN_RE, 'expoToken inválido')

export const pushPlatformSchema = z.enum(['ios', 'android'], { error: "platform debe ser 'ios' o 'android'" })

/** POST /api/push/devices. */
export const registerPushDeviceSchema = z.object({
  expoToken: expoPushTokenSchema,
  platform: pushPlatformSchema,
})
export type RegisterPushDeviceInput = z.infer<typeof registerPushDeviceSchema>

/** DELETE /api/push/devices: el token en el body o en `?expoToken=`. */
export const unregisterPushDeviceSchema = z.object({
  expoToken: expoPushTokenSchema,
})
