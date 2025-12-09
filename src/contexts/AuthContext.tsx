'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { AuthUser } from '@/lib/auth'
import { clearStoredAuthTokens, storePin, storeAdminKey, getStoredAuthToken } from '@/lib/client-auth'

interface AuthContextType {
  user: AuthUser | null
  login: (pin: string) => Promise<boolean>
  loginWithAdminKey: (adminKey: string) => Promise<boolean> // Legacy support
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('poker-user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

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
        localStorage.setItem('poker-user', JSON.stringify(authUser))
        storePin(pin)
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
        localStorage.setItem('poker-user', JSON.stringify(authUser))
        storeAdminKey(adminKey)
        return true
      }
      return false
    } catch (error) {
      console.error('AdminKey login error:', error)
      return false
    }
  }

  const logout = async () => {
    try {
      // Invalidar cache del servidor
      const token = getStoredAuthToken()
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      }
    } catch (error) {
      console.error('Error during logout:', error)
    } finally {
      // Siempre limpiar cliente aunque falle el servidor
      setUser(null)
      localStorage.removeItem('poker-user')
      clearStoredAuthTokens()
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, loginWithAdminKey, logout, loading }}>
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
