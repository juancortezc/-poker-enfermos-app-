'use client'

import { useAuth } from '@/contexts/AuthContext'
import { BottomNav } from './navigation/BottomNav'
import LoginForm from './LoginForm'
import { User, Search, Plus, ChevronDown } from 'lucide-react'
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
import { NoirButton } from './noir/NoirButton'


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

  // Pages that use Clean Poker design system (bypass old Noir Jazz layout)
  const isCleanPokerPage = pathname === '/home-new' || pathname === '/posiciones' || pathname === '/tabla' || pathname === '/stats' || pathname === '/info' || pathname === '/perfil-new' || pathname === '/admin-new'

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

  // Clean Poker pages handle their own layout, auth, loading states
  if (isCleanPokerPage) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1f1410]">
        <div className="text-center animate-enter text-[#f3e6c5]">
          <div className="relative mx-auto mb-4 h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-[#3c2219]/80"></div>
            <div className="absolute inset-0 rounded-full border-4 border-[#e0b66c] border-t-transparent animate-spin"></div>
          </div>
          <p className="text-[#d7c59a]">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  const getRoleBadgeClasses = (role: UserRole) => {
    switch (role) {
      case UserRole.Comision:
        return {
          base: 'border border-[#e0b66c]/45 bg-[linear-gradient(135deg,rgba(224,182,108,0.35),rgba(169,68,28,0.25))] text-[#f3e6c5] shadow-[0_0_10px_rgba(224,182,108,0.35)]',
          label: 'C'
        }
      case UserRole.Enfermo:
        return {
          base: 'border border-[#d7c59a]/35 bg-[#2a1a14]/80 text-[#f3e6c5]',
          label: 'E'
        }
      case UserRole.Invitado:
        return {
          base: 'border border-[#c9783f]/40 bg-[#c9783f]/28 text-[#f3e6c5]',
          label: 'I'
        }
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col text-[#f3e6c5]">
      {/* Header */}
      <header className="sticky top-0 z-[60] border-b border-[#e0b66c]/12 bg-[rgba(19,12,9,0.92)] backdrop-blur-xl shadow-[0_24px_60px_rgba(11,6,3,0.6)]">
        <div className={`${needsFullWidth ? 'mx-auto max-w-6xl' : 'mx-auto max-w-4xl'} px-4 sm:px-6 py-2`}>
          <div className="flex items-center justify-between gap-3">
            {/* Logo y usuario */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="relative flex h-12 w-12 items-center justify-center rounded-3xl border border-[#e0b66c]/25 bg-[rgba(31,20,16,0.85)] p-2 shadow-[0_16px_36px_rgba(11,6,3,0.55)] transition-transform hover:-translate-y-0.5 hover:border-[#e0b66c]/45"
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
              <div className="space-y-0.5">
                <h1 className="font-heading text-sm uppercase tracking-[0.24em] text-[#f3e6c5]">
                  Poker de Enfermos
                </h1>
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.2em] text-[#d7c59a]/75">
                  <User size={14} className="text-[#d7c59a]/55" />
                  <span className="text-[#f3e6c5]">{user.firstName}</span>
                  {(() => {
                    const badge = getRoleBadgeClasses(user.role)
                    return (
                      <span className={`ml-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] ${badge?.base ?? ''}`}>
                        {badge?.label}
                      </span>
                    )
                  })()}
                </div>
              </div>
            </div>

            {/* User Dropdown */}
            <UserDropdown />
          </div>


          {/* Search and Add Button - Only on Players Page */}
          {isPlayersPage && (
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#d7c59a]/60" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre o alias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-12 rounded-full border border-[#e0b66c]/22 bg-[rgba(42,26,20,0.78)] pl-12 pr-4 text-sm text-[#f3e6c5] placeholder:text-[#d7c59a]/60 focus:border-[#e0b66c]/55 focus:ring-[#e0b66c]/25"
                />
              </div>
              {showAddButton && (
                <div className="relative" ref={dropdownRef}>
                  <NoirButton
                    onClick={handleAddClick}
                    className="min-w-[190px] justify-center"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </NoirButton>

                  {showDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-[#e0b66c]/20 bg-[rgba(27,16,12,0.95)] shadow-[0_24px_48px_rgba(11,6,3,0.6)] backdrop-blur-xl">
                      <div className="py-2">
                        <button
                          onClick={() => handlePlayerTypeSelect('invitado')}
                          className="w-full px-4 py-2 text-left text-sm text-[#f3e6c5] transition-colors hover:bg-[#2a1a14]/70"
                        >
                          <div className="font-semibold text-[#e0b66c]">Invitado</div>
                          <div className="text-xs text-[#d7c59a]/70">Invitado por un Enfermo</div>
                        </button>
                        <button
                          onClick={() => handlePlayerTypeSelect('enfermo')}
                          className="w-full px-4 py-2 text-left text-sm text-[#f3e6c5] transition-colors hover:bg-[#2a1a14]/70"
                        >
                          <div className="font-semibold text-[#e0b66c]">Enfermo/Comisión</div>
                          <div className="text-xs text-[#d7c59a]/70">Miembro del grupo</div>
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
        className={`${needsFullWidth ? 'mx-auto max-w-6xl px-4 sm:px-6' : 'mx-auto max-w-4xl px-4'} flex-1 overflow-y-auto pt-6 pb-32 text-[#f3e6c5]/90`}
      >
        <div className="animate-enter space-y-6">
          {children}
        </div>
      </main>

      {/* Navbar móvil fijo al bottom + prompts persistentes */}
      <BottomNav />
      <PwaInstallPrompt />
      <ProfileCompletionPrompt />
    </div>
  )
}
