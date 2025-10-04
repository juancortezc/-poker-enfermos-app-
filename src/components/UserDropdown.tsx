'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LogOut, User, ChevronDown, Bell, Download, Share2, MessageCircle } from 'lucide-react'
import { UserRole } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { UserAvatar } from './UserAvatar'
import { canAccess } from '@/lib/permissions'
import { QuickNotificationModal } from './notifications/QuickNotificationModal'

export function UserDropdown() {
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [showQuickNotification, setShowQuickNotification] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    setIsOpen(false)
    if (window.confirm('¿Seguro que deseas cerrar sesión?')) {
      logout()
    }
  }

  const handleProfileClick = () => {
    setIsOpen(false)
    router.push('/perfil')
  }

  const handleNotificationsClick = () => {
    setIsOpen(false)
    router.push('/notificaciones')
  }

  const handleQuickNotificationClick = () => {
    setIsOpen(false)
    setShowQuickNotification(true)
  }

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.Comision:
        return 'bg-poker-red text-white'
      case UserRole.Enfermo:
        return 'bg-gray-600 text-white'
      case UserRole.Invitado:
        return 'bg-orange-600 text-white'
    }
  }

  if (!user) return null

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-poker-text hover:text-poker-red transition-smooth p-2 rounded-lg hover:bg-poker-red/10"
      >
        {/* Avatar */}
        <UserAvatar user={user} size="sm" />
        <ChevronDown 
          size={16} 
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 z-50">
          <div className="relative border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <div className="relative">
              {/* User Info Header */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center space-x-3">
                  <UserAvatar user={user} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Options */}
              <div className="py-1">
                {/* Mi Perfil - Solo para Comisión y Enfermo */}
                {canAccess(user.role, 'profile') && (
                  <button
                    onClick={handleProfileClick}
                    className="w-full text-left flex items-center space-x-3 px-4 py-3 text-white hover:bg-poker-red/20 transition-colors"
                  >
                    <User size={18} className="text-poker-muted" />
                    <span>Mi Perfil</span>
                  </button>
                )}

                <button
                  onClick={handleNotificationsClick}
                  className="w-full text-left flex items-center space-x-3 px-4 py-3 text-white hover:bg-poker-red/20 transition-colors"
                >
                  <Bell size={18} className="text-poker-muted" />
                  <span>Notificaciones</span>
                </button>

                {/* Send Quick Notification - Solo para Comisión */}
                {user.role === 'Comision' && (
                  <button
                    onClick={handleQuickNotificationClick}
                    className="w-full text-left flex items-center space-x-3 px-4 py-3 text-white hover:bg-poker-red/20 transition-colors"
                  >
                    <MessageCircle size={18} className="text-poker-red" />
                    <span>Enviar Mensaje</span>
                  </button>
                )}

                <div className="border-t border-white/10 my-1"></div>
                
                <button
                  onClick={handleLogout}
                  className="w-full text-left flex items-center space-x-3 px-4 py-3 text-white hover:bg-poker-red/20 transition-colors"
                >
                  <LogOut size={18} className="text-poker-muted" />
                  <span>Cerrar Sesión</span>
                </button>

                <div className="border-t border-white/10 my-1"></div>

                <div className="px-4 py-3 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-white/60">Instalar aplicación</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('pwa:show'))
                      }
                    }}
                    className="w-full text-left flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm text-white transition-colors hover:bg-white/10"
                  >
                    <span>Descargar app</span>
                    <Download size={16} className="text-white/70" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('pwa:show', { detail: { forceIos: true } }))
                      }
                    }}
                    className="w-full text-left flex items-center justify-between rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10"
                  >
                    <span>Instrucciones iOS</span>
                    <Share2 size={16} className="text-white/60" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Notification Modal */}
      <QuickNotificationModal
        isOpen={showQuickNotification}
        onClose={() => setShowQuickNotification(false)}
      />
    </div>
  )
}
