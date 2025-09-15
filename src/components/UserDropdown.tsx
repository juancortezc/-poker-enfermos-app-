'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LogOut, User, ChevronDown, Bell } from 'lucide-react'
import { UserRole } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { UserAvatar } from './UserAvatar'

export function UserDropdown() {
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
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
        <div className="absolute top-full right-0 mt-2 w-64 bg-poker-card border border-white/10 rounded-lg shadow-lg z-50">
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
            <button
              onClick={handleProfileClick}
              className="w-full text-left flex items-center space-x-3 px-4 py-3 text-white hover:bg-poker-red/20 transition-colors"
            >
              <User size={18} className="text-poker-muted" />
              <span>Mi Perfil</span>
            </button>

            <button
              onClick={handleNotificationsClick}
              className="w-full text-left flex items-center space-x-3 px-4 py-3 text-white hover:bg-poker-red/20 transition-colors"
            >
              <Bell size={18} className="text-poker-muted" />
              <span>Notificaciones</span>
            </button>
            
            <div className="border-t border-white/10 my-1"></div>
            
            <button
              onClick={handleLogout}
              className="w-full text-left flex items-center space-x-3 px-4 py-3 text-white hover:bg-poker-red/20 transition-colors"
            >
              <LogOut size={18} className="text-poker-muted" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}