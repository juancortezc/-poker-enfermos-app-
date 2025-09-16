'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface ProfileStatus {
  isComplete: boolean
  requiresUpdate: boolean
  missingFields: {
    pin: boolean
    birthDate: boolean
    email: boolean
    phone: boolean
  }
}

export function useProfileStatus() {
  const { user } = useAuth()
  const [status, setStatus] = useState<ProfileStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkStatus = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Get auth token from localStorage
      const pin = typeof window !== 'undefined' ? localStorage.getItem('poker-pin') : null
      const adminKey = typeof window !== 'undefined' ? localStorage.getItem('poker-adminkey') : null
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      
      // Use PIN if available, otherwise fall back to adminKey
      if (pin) {
        headers['Authorization'] = `Bearer PIN:${pin}`
      } else if (adminKey) {
        headers['Authorization'] = `Bearer ADMIN:${adminKey}`
      }

      const response = await fetch('/api/profile/status', {
        headers
      })

      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      } else {
        setError('Error al verificar el estado del perfil')
      }
    } catch (error) {
      console.error('Error checking profile status:', error)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkStatus()
  }, [user])

  const markAsComplete = () => {
    if (status) {
      setStatus({
        ...status,
        isComplete: true,
        requiresUpdate: false
      })
    }
  }

  return {
    status,
    loading,
    error,
    checkStatus,
    markAsComplete,
    requiresUpdate: status?.requiresUpdate || false
  }
}