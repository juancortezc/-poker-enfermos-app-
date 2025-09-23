'use client'

import { useEffect } from 'react'
import { notificationService } from '@/lib/notifications'

export function NotificationInitializer() {
  useEffect(() => {
    notificationService.initialize().catch((error) => {
      console.warn('Notification initialization failed:', error)
    })
  }, [])

  return null
}
