'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LogOut, User, ChevronDown, Bell, Download, Share2, MessageCircle } from 'lucide-react'
import { UserRole } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { UserAvatar } from './UserAvatar'
import { canAccess } from '@/lib/permissions'
import { QuickNotificationModal } from './notifications/QuickNotificationModal'
import { NoirButton } from './noir/NoirButton'

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
        return 'border border-[#e0b66c]/55 bg-[#e0b66c]/15 text-[#e0b66c]'
      case UserRole.Enfermo:
        return 'border border-[#e8e3e3]/35 bg-[#2a1a14]/85 text-[#e8e3e3]'
      case UserRole.Invitado:
        return 'border border-[#c9783f]/35 bg-[#c9783f]/18 text-[#f3e6c5]'
    }
  }

  if (!user) return null

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <NoirButton
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full px-3 py-2 text-[12px] uppercase tracking-[0.18em] text-[#f3e6c5]/85 hover:text-[#f3e6c5]"
      >
        {/* Avatar */}
        <UserAvatar user={user} size="sm" />
        <ChevronDown
          size={16}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </NoirButton>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 z-50">
          <div className="relative overflow-hidden rounded-2xl border border-[#e0b66c]/25 shadow-[0_24px_48px_rgba(11,6,3,0.65)] backdrop-blur-xl">
            <div className="absolute inset-0 bg-[rgba(19,12,9,0.92)]" />
            <div className="relative">
              {/* User Info Header */}
              <div className="border-b border-[#e0b66c]/18 bg-[rgba(31,20,16,0.78)] p-4">
                <div className="flex items-center space-x-3">
                  <UserAvatar user={user} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-heading text-sm uppercase tracking-[0.22em] text-[#f3e6c5]">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Options */}
              <div className="space-y-1 bg-[rgba(19,12,9,0.88)] py-3">
                {/* Mi Perfil - Solo para Comisión y Enfermo */}
                {canAccess(user.role, 'profile') && (
                  <NoirButton
                    variant="primary"
                    size="md"
                    onClick={handleProfileClick}
                    className="w-full justify-start gap-3 px-4 py-2 text-[11px] uppercase tracking-[0.22em]"
                  >
                    <User size={18} className="text-[#1f1410]" />
                    <span className="text-[#1f1410]">Mi Perfil</span>
                  </NoirButton>
                )}

                <NoirButton
                  variant="primary"
                  size="md"
                  onClick={handleNotificationsClick}
                  className="w-full justify-start gap-3 px-4 py-2 text-[11px] uppercase tracking-[0.22em]"
                >
                  <Bell size={18} className="text-[#1f1410]" />
                  <span className="text-[#1f1410]">Notificaciones</span>
                </NoirButton>

                {/* Send Quick Notification - Solo para Comisión */}
                {user.role === 'Comision' && (
                  <NoirButton
                    variant="primary"
                    size="md"
                    onClick={handleQuickNotificationClick}
                    className="w-full justify-start gap-3 px-4 py-2 text-[11px] uppercase tracking-[0.22em]"
                  >
                    <MessageCircle size={18} className="text-[#1f1410]" />
                    <span className="text-[#1f1410]">Enviar Mensaje</span>
                  </NoirButton>
                )}

                <div className="my-2 border-t border-[#e0b66c]/15" />

                <NoirButton
                  variant="primary"
                  size="md"
                  onClick={handleLogout}
                  className="w-full justify-start gap-3 px-4 py-2 text-[11px] uppercase tracking-[0.22em]"
                >
                  <LogOut size={18} className="text-[#1f1410]" />
                  <span className="text-[#1f1410]">Cerrar Sesión</span>
                </NoirButton>

                <div className="my-2 border-t border-[#e0b66c]/15" />

                <div className="space-y-2 px-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-[#e8e3e3]/60">Instalar aplicación</p>
                  <NoirButton
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('pwa:show'))
                      }
                    }}
                    className="w-full justify-between px-3 py-2 text-[11px] uppercase tracking-[0.2em]"
                  >
                    <span className="text-[#1f1410]">Descargar app</span>
                    <Download size={16} className="text-[#1f1410]" />
                  </NoirButton>
                  <NoirButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('pwa:show', { detail: { forceIos: true } }))
                      }
                    }}
                    className="w-full justify-between border border-[#e0b66c]/35 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-[#f3e6c5]/85 hover:text-[#f3e6c5]"
                  >
                    <span>Instrucciones iOS</span>
                    <Share2 size={16} className="text-[#e0b66c]" />
                  </NoirButton>
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
