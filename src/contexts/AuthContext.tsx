'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { AuthUser } from '@/lib/auth'

// Hybrid storage strategy for better mobile persistence
const storage = {
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, value)
        sessionStorage.setItem(key, value) // Backup for session
      } catch (error) {
        console.warn('Storage failed:', error)
        // Fallback to sessionStorage only if localStorage fails
        try {
          sessionStorage.setItem(key, value)
        } catch (sessionError) {
          console.error('Session storage also failed:', sessionError)
        }
      }
    }
  },
  
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null
    
    // Try localStorage first, then sessionStorage as fallback
    try {
      return localStorage.getItem(key) || sessionStorage.getItem(key)
    } catch (error) {
      console.warn('Storage read failed:', error)
      try {
        return sessionStorage.getItem(key)
      } catch (sessionError) {
        console.error('Session storage read also failed:', sessionError)
        return null
      }
    }
  },
  
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      } catch (error) {
        console.warn('Storage removal failed:', error)
      }
    }
  }
}

interface AuthContextType {
  user: AuthUser | null
  login: (pin: string) => Promise<boolean>
  loginWithAdminKey: (adminKey: string) => Promise<boolean> // Legacy support
  logout: () => void
  loading: boolean
  profileNeedsUpdate: boolean
  checkProfileStatus: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileNeedsUpdate, setProfileNeedsUpdate] = useState(false)

  // Auto-recovery function for lost sessions
  const attemptAutoRecovery = async () => {
    const storedUser = storage.getItem('poker-user')
    const pin = storage.getItem('poker-pin')
    const adminKey = storage.getItem('poker-adminkey')
    
    if (storedUser && (pin || adminKey)) {
      try {
        // Validate session is still valid
        const isValid = await validateSession(pin || adminKey)
        if (isValid) {
          const userData = JSON.parse(storedUser)
          setUser(userData)
          await checkProfileStatus()
          return true
        } else {
          // Clear invalid data
          clearAuthData()
        }
      } catch (error) {
        console.warn('Auto-recovery failed:', error)
        clearAuthData()
      }
    }
    return false
  }

  // Validate if session is still active
  const validateSession = async (token: string | null): Promise<boolean> => {
    if (!token) return false
    
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      
      if (token.length === 4 && /^\d{4}$/.test(token)) {
        headers['Authorization'] = `Bearer PIN:${token}`
      } else {
        headers['Authorization'] = `Bearer ADMIN:${token}`
      }
      
      const response = await fetch('/api/profile/status', { headers })
      return response.ok
    } catch {
      return false
    }
  }

  // Clear all auth data
  const clearAuthData = () => {
    storage.removeItem('poker-user')
    storage.removeItem('poker-pin') 
    storage.removeItem('poker-adminkey')
    setUser(null)
    setProfileNeedsUpdate(false)
  }

  useEffect(() => {
    let mounted = true
    
    const initAuth = async () => {
      const recovered = await attemptAutoRecovery()
      if (mounted && !recovered) {
        setLoading(false)
      }
    }
    
    initAuth()
    
    // Handle visibility changes for mobile apps
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        // App became visible, verify session is still valid
        checkProfileStatus()
      }
    }
    
    // Handle app focus events
    const handleFocus = () => {
      if (user) {
        checkProfileStatus()
      }
    }
    
    // Listen for mobile lifecycle events
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      mounted = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [user])

  const checkProfileStatus = async () => {
    try {
      // Get auth token from hybrid storage
      const pin = storage.getItem('poker-pin')
      const adminKey = storage.getItem('poker-adminkey')
      
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
        setProfileNeedsUpdate(data.requiresUpdate)
      }
    } catch (error) {
      console.error('Error checking profile status:', error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (pin: string): Promise<boolean> => {
    try {
      // Validate PIN format on client side
      if (!/^\d{4}$/.test(pin)) {
        console.error('PIN must be exactly 4 digits')
        return false
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin }),
      })

      if (response.ok) {
        const authUser = await response.json()
        setUser(authUser)
        storage.setItem('poker-user', JSON.stringify(authUser))
        storage.setItem('poker-pin', pin) // Store PIN for subsequent API calls
        // Check profile status after login
        await checkProfileStatus()
        return true
      }
      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const loginWithAdminKey = async (adminKey: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminKey }),
      })

      if (response.ok) {
        const authUser = await response.json()
        setUser(authUser)
        storage.setItem('poker-user', JSON.stringify(authUser))
        storage.setItem('poker-adminkey', adminKey) // Legacy storage
        // Check profile status after login
        await checkProfileStatus()
        return true
      }
      return false
    } catch (error) {
      console.error('AdminKey login error:', error)
      return false
    }
  }

  const logout = () => {
    clearAuthData()
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      loginWithAdminKey, 
      logout, 
      loading, 
      profileNeedsUpdate, 
      checkProfileStatus 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}