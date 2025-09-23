/* eslint-disable no-restricted-globals */
const NOTIFICATION_DEFAULT_ICON = '/icons/icon-192x192.png'
const NOTIFICATION_DEFAULT_BADGE = '/icons/icon-96x96.png'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

async function closeNotification(tag) {
  if (!tag) return
  const notifications = await self.registration.getNotifications({ tag })
  notifications.forEach((notification) => notification.close())
}

async function showNotification(payload) {
  if (!payload) return
  const { title, options } = payload

  const notificationOptions = {
    body: options.body,
    icon: options.icon || NOTIFICATION_DEFAULT_ICON,
    badge: options.badge || NOTIFICATION_DEFAULT_BADGE,
    data: {
      ...options.data,
      url: options.data?.url || '/',
    },
    tag: options.tag,
    silent: options.silent,
    renotify: true,
    requireInteraction: options.requireInteraction,
    timestamp: options.timestamp || Date.now(),
    vibrate: options.vibrate ? [200, 100, 200] : undefined,
  }

  await self.registration.showNotification(title, notificationOptions)

  if (options.autoClose) {
    setTimeout(() => {
      closeNotification(options.tag)
    }, options.autoClose)
  }
}

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {}

  if (type === 'SHOW_NOTIFICATION') {
    event.waitUntil(showNotification(payload))
  }
})

self.addEventListener('push', (event) => {
  if (!event.data) {
    return
  }

  const data = (() => {
    try {
      return event.data.json()
    } catch (error) {
      return { title: 'Poker de Enfermos', body: event.data.text() }
    }
  })()

  const payload = {
    title: data.title || 'Poker de Enfermos',
    options: {
      body: data.body || '',
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      data: data.data,
      requireInteraction: data.priority === 'high',
      silent: data.silent ?? false,
      autoClose: data.autoClose ?? (data.priority === 'high' ? undefined : 5000),
    },
  }

  event.waitUntil(showNotification(payload))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(targetUrl)) {
            return client.focus()
          }
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
      return null
    })
  )
})

self.addEventListener('pushsubscriptionchange', (event) => {
  console.warn('Push subscription expired:', event)
})
