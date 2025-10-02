'use client'

import { useAuth } from '@/contexts/AuthContext'
import MobileNavbar from './MobileNavbar'
import LoginForm from './LoginForm'
import { User, Search, Plus, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Image from 'next/image'
import Link from 'next/link'
import { UserRole } from '@prisma/client'
import { usePathname, useRouter } from 'next/navigation'
import { usePlayerSearch } from '@/contexts/PlayerSearchContext'
import { useState, useRef, useEffect } from 'react'
import { UserDropdown } from './UserDropdown'
import { PwaInstallPrompt } from './PwaInstallPrompt'
import { ProfileCompletionPrompt } from './ProfileCompletionPrompt'


interface AppLayoutProps {
  children: React.ReactNode
  fullWidth?: boolean
}

export function AppLayout({ children, fullWidth = false }: AppLayoutProps) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const { searchTerm, setSearchTerm, showAddButton } = usePlayerSearch()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const isPlayersPage = pathname === '/players'
  // Auto-detect if page needs full width (stats pages, admin pages with tables)
  const needsFullWidth =
    fullWidth ||
    pathname.includes('/admin/stats') ||
    pathname.includes('/stats') ||
    pathname.includes('/tournaments')

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAddClick = () => {
    setShowDropdown(!showDropdown)
  }

  const handlePlayerTypeSelect = (type: 'enfermo' | 'invitado') => {
    setShowDropdown(false)
    if (type === 'enfermo') {
      router.push('/players/new')
    } else {
      router.push('/players/new?type=invitado')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-poker-dark">
        <div className="text-center animate-enter">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-poker-card"></div>
            <div className="absolute inset-0 rounded-full border-4 border-poker-red border-t-transparent animate-spin"></div>
          </div>
          <p className="text-poker-muted">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
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

  return (
    <div className="min-h-screen bg-poker-dark flex flex-col">
      {/* Header */}
      <header className="bg-poker-card shadow-lg border-b border-white/10 sticky top-0 z-[60] relative before:absolute before:inset-0 before:bg-black/80 before:content-[''] before:backdrop-blur-sm">
        <div className={`${needsFullWidth ? 'container mx-auto max-w-none' : 'max-w-md mx-auto'} p-4 relative z-10`}>
          <div className="flex justify-between items-center">
            {/* Logo y usuario */}
            <div className="flex items-center space-x-3">
              <Link
                href="/"
                className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-black/40 p-1.5 shadow-inner transition-colors hover:bg-[rgba(215,142,82,0.25)]"
                aria-label="Ir al inicio"
              >
                <Image
                  src="https://storage.googleapis.com/poker-enfermos/logo.png"
                  alt="Poker Logo"
                  width={32}
                  height={32}
                  className="h-full w-full object-contain"
                />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-noir-primary">
                  Poker de Enfermos
                </h1>
                <div className="flex items-center gap-2">
                  <User size={14} className="text-noir-muted" />
                  <span className="text-sm text-noir-muted">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                  </span>
                </div>
              </div>
            </div>

            {/* User Dropdown */}
            <UserDropdown />
          </div>


          {/* Search and Add Button - Only on Players Page */}
          {isPlayersPage && (
            <div className="flex items-center space-x-3 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-noir-muted w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre o alias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-black/25 border-noir text-noir-primary placeholder:text-noir-muted focus:border-[rgba(212,138,79,0.8)] focus:ring-[rgba(212,138,79,0.28)] h-12"
                />
              </div>
              {showAddButton && (
                <div className="relative" ref={dropdownRef}>
                  <Button 
                    onClick={handleAddClick}
                    className="noir-button h-12 px-6 font-medium"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                  
                  {showDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-noir-card border border-noir rounded-lg shadow-lg z-dropdown">
                      <div className="py-1">
                        <button
                          onClick={() => handlePlayerTypeSelect('invitado')}
                          className="w-full text-left px-4 py-2 text-noir-primary hover:bg-black/35 transition-colors"
                        >
                          <div className="font-medium">Invitado</div>
                          <div className="text-sm text-noir-muted">Invitado por un Enfermo</div>
                        </button>
                        <button
                          onClick={() => handlePlayerTypeSelect('enfermo')}
                          className="w-full text-left px-4 py-2 text-noir-primary hover:bg-black/35 transition-colors"
                        >
                          <div className="font-medium">Enfermo/Comisión</div>
                          <div className="text-sm text-noir-muted">Miembro del grupo</div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Contenido principal con scroll */}
      <main
        className={`${needsFullWidth ? 'container mx-auto max-w-none px-4' : 'max-w-md mx-auto px-4'} flex-1 overflow-y-auto pt-6 pb-24 text-noir-primary`}
      >
        <div className="animate-enter">
          {children}
        </div>
      </main>

      {/* Navbar móvil fijo al bottom + prompts persistentes */}
      <MobileNavbar />
      <PwaInstallPrompt />
      <ProfileCompletionPrompt />
    </div>
  )
}
