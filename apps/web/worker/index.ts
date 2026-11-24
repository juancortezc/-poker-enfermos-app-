/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope

interface PushNotificationData {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  actions?: Array<{ action: string; title: string }>
  requireInteraction?: boolean
  silent?: boolean
  data?: { url?: string; [key: string]: unknown }
}

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  let payload: PushNotificationData
  try {
    payload = event.data.json()
  } catch {
    return
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/icons/icon-192.png',
      badge: payload.badge || '/icons/icon-192.png',
      tag: payload.tag,
      data: payload.data,
      requireInteraction: payload.requireInteraction || false,
      silent: payload.silent || false,
    })
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const url = (event.notification.data?.url as string) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client && client.url.includes(url)) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})
