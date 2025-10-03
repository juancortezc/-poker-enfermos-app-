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
        return 'border border-poker-red/40 bg-poker-red/15 text-poker-red'
      case UserRole.Enfermo:
        return 'border border-white/20 bg-white/10 text-white/80'
      case UserRole.Invitado:
        return 'border border-amber-400/40 bg-amber-500/15 text-amber-200'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d0f1a] via-[#0b0d18] to-[#08090f] text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-[60] border-b border-white/10 bg-gradient-to-br from-[#1f1a2d]/95 via-[#1b1c2b]/90 to-[#131422]/95 backdrop-blur-xl shadow-[0_18px_40px_rgba(11,12,32,0.45)]">
        <div className={`${needsFullWidth ? 'mx-auto max-w-6xl' : 'mx-auto max-w-4xl'} px-4 sm:px-6 py-4`}>
          <div className="flex items-center justify-between gap-6">
            {/* Logo y usuario */}
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-1.5 shadow-[0_10px_24px_rgba(8,9,15,0.4)] transition-transform hover:-translate-y-0.5"
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
              <div className="space-y-1">
                <h1 className="text-xl font-semibold text-white tracking-tight">
                  Poker de Enfermos
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-white/60">
                  <User size={14} className="text-white/50" />
                  <span>
                    {user.firstName} {user.lastName}
                  </span>
                  <span className={`text-[11px] uppercase tracking-[0.18em] px-3 py-0.5 rounded-full font-semibold ${getRoleBadgeColor(user.role)}`}>
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
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre o alias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-12 rounded-full border border-white/12 bg-white/5 pl-12 pr-4 text-sm text-white placeholder:text-white/35 focus:border-poker-red/60 focus:ring-poker-red/30"
                />
              </div>
              {showAddButton && (
                <div className="relative" ref={dropdownRef}>
                  <Button
                    variant="ghost"
                    onClick={handleAddClick}
                    className="h-12 rounded-full border border-white/12 bg-gradient-to-r from-poker-red via-[#ff5d8f] to-[#ff9f6a] px-6 text-sm font-semibold tracking-[0.1em] text-white shadow-[0_14px_30px_rgba(255,93,143,0.35)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(255,93,143,0.45)]"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>

                  {showDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-52 rounded-2xl border border-white/12 bg-[#16172a]/95 shadow-[0_20px_45px_rgba(8,9,15,0.55)] backdrop-blur-lg">
                      <div className="py-2">
                        <button
                          onClick={() => handlePlayerTypeSelect('invitado')}
                          className="w-full text-left px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/10"
                        >
                          <div className="font-semibold text-white">Invitado</div>
                          <div className="text-xs text-white/55">Invitado por un Enfermo</div>
                        </button>
                        <button
                          onClick={() => handlePlayerTypeSelect('enfermo')}
                          className="w-full text-left px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/10"
                        >
                          <div className="font-semibold text-white">Enfermo/Comisión</div>
                          <div className="text-xs text-white/55">Miembro del grupo</div>
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
        className={`${needsFullWidth ? 'mx-auto max-w-6xl px-4 sm:px-6' : 'mx-auto max-w-4xl px-4'} flex-1 overflow-y-auto pt-6 pb-28 text-white/85`}
      >
        <div className="animate-enter space-y-6">
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
