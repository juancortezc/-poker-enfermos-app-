/**
 * Envío a la app móvil por la Expo Push API.
 *
 * Es el equivalente nativo de web-push: push-service.ts manda cada
 * notificación a las suscripciones del navegador Y a los tokens Expo
 * registrados en `push_devices`, con el mismo contenido y los mismos filtros.
 *
 * Sin dependencias: un POST JSON a exp.host en lotes de 100 (el máximo que
 * acepta Expo por request). El fetch se puede inyectar para probarlo.
 */

export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
export const EXPO_PUSH_BATCH_SIZE = 100

/** Formato de ExpoPushToken: `ExponentPushToken[xxx]` o `ExpoPushToken[xxx]`. */
const EXPO_TOKEN_RE = /^Expo(nent)?PushToken\[[^\]\s]+\]$/

export function isExpoPushToken(token: unknown): token is string {
  return typeof token === 'string' && token.length <= 255 && EXPO_TOKEN_RE.test(token)
}

export interface ExpoDevice {
  id: string
  expoToken: string
}

export interface ExpoNotificationContent {
  title: string
  body: string
  /** Llega a la app en `notification.request.content.data`. */
  data?: Record<string, unknown>
  silent?: boolean
  /** Equivalente al `tag` web: misma clave reemplaza la notificación anterior (Android). */
  tag?: string
}

export interface ExpoPushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
  sound?: 'default' | null
  priority: 'high'
  channelId: string
  collapseId?: string
}

interface ExpoTicket {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: { error?: string }
}

export interface ExpoSendResult {
  /** Tickets con status 'ok'. */
  sent: number
  /** Dispositivos que respondieron DeviceNotRegistered: hay que desactivarlos. */
  deadDeviceIds: string[]
}

/** Canal Android que crea la app en src/lib/push.ts. */
export const EXPO_ANDROID_CHANNEL_ID = 'default'

export function buildExpoMessage(token: string, content: ExpoNotificationContent): ExpoPushMessage {
  return {
    to: token,
    title: content.title,
    body: content.body,
    data: content.data,
    sound: content.silent ? null : 'default',
    priority: 'high',
    channelId: EXPO_ANDROID_CHANNEL_ID,
    ...(content.tag ? { collapseId: content.tag } : {}),
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>

/**
 * Envía a todos los dispositivos, 100 por request. Un lote que falla entero
 * (red, 5xx) no desactiva a nadie: solo cuenta 0 enviados en ese lote.
 */
export async function sendExpoPush(
  devices: ExpoDevice[],
  content: ExpoNotificationContent,
  fetchImpl: FetchLike = fetch
): Promise<ExpoSendResult> {
  const result: ExpoSendResult = { sent: 0, deadDeviceIds: [] }
  if (devices.length === 0) return result

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  }
  // Opcional: solo hace falta si se activa "enhanced push security" en EAS.
  const accessToken = process.env.EXPO_ACCESS_TOKEN?.trim()
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  for (const batch of chunk(devices, EXPO_PUSH_BATCH_SIZE)) {
    const messages = batch.map((d) => buildExpoMessage(d.expoToken, content))
    try {
      const response = await fetchImpl(EXPO_PUSH_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(messages),
      })
      if (!response.ok) {
        console.error(`Expo push: lote rechazado (${response.status})`, await response.text().catch(() => ''))
        continue
      }
      const json = (await response.json()) as { data?: ExpoTicket[] }
      const tickets = Array.isArray(json.data) ? json.data : []
      // Los tickets vienen en el mismo orden que los mensajes.
      tickets.forEach((ticket, index) => {
        const device = batch[index]
        if (!device) return
        if (ticket.status === 'ok') {
          result.sent++
        } else if (ticket.details?.error === 'DeviceNotRegistered') {
          result.deadDeviceIds.push(device.id)
        } else {
          console.error(`Expo push: error para el dispositivo ${device.id}:`, ticket.message ?? ticket.details?.error)
        }
      })
    } catch (error) {
      console.error('Expo push: fallo de red enviando un lote', error)
    }
  }

  return result
}
