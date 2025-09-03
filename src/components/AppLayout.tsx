'use client'

import { useAuth } from '@/contexts/AuthContext'
import MobileNavbar from './MobileNavbar'
import LoginForm from './LoginForm'
import { LogOut, User, Search, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Image from 'next/image'
import { UserRole } from '@prisma/client'
import { usePathname } from 'next/navigation'
import { usePlayerSearch } from '@/contexts/PlayerSearchContext'

function LogoutButton() {
  const { logout } = useAuth()
  
  const handleLogout = () => {
    if (window.confirm('¿Seguro que deseas cerrar sesión?')) {
      logout()
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="text-poker-muted hover:text-poker-red transition-smooth p-2 rounded-lg hover:bg-poker-red/10"
      title="Cerrar sesión"
    >
      <LogOut size={20} />
    </button>
  )
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const { searchTerm, setSearchTerm, showAddButton, onAddClick } = usePlayerSearch()
  
  const isPlayersPage = pathname === '/players'

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
        return 'bg-poker-green text-white'
      case UserRole.Invitado:
        return 'bg-poker-cyan text-poker-dark'
    }
  }

  return (
    <div className="min-h-screen bg-poker-dark pb-20">
      {/* Header */}
      <header className="bg-poker-card shadow-lg border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-md mx-auto p-4">
          <div className="flex justify-between items-center">
            {/* Logo y usuario */}
            <div className="flex items-center space-x-3">
              <div className="relative w-10 h-10 bg-poker-dark rounded-lg p-1.5 shadow-inner">
                <Image
                  src="https://storage.googleapis.com/poker-enfermos/logo.png"
                  alt="Poker Logo"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
              </div>
              <div>
                <h1 className="text-lg font-bold text-poker-text">
                  Enfermos
                </h1>
                <div className="flex items-center gap-2">
                  <User size={14} className="text-poker-muted" />
                  <span className="text-sm text-poker-muted">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Botón logout */}
            <LogoutButton />
          </div>

          {/* Indicador de conexión en vivo */}
          <div className="flex items-center justify-end mt-2 space-x-2">
            <div className="relative flex items-center">
              <div className="w-2 h-2 bg-poker-cyan rounded-full animate-pulse"></div>
              <div className="absolute w-2 h-2 bg-poker-cyan rounded-full animate-ping"></div>
            </div>
            <span className="text-xs text-poker-muted">En vivo</span>
          </div>

          {/* Search and Add Button - Only on Players Page */}
          {isPlayersPage && (
            <div className="flex items-center space-x-3 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Buscar por nombre o alias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-poker-card/50 border-white/10 text-white placeholder:text-gray-400 focus:border-poker-red focus:ring-poker-red/30 h-12"
                />
              </div>
              {showAddButton && onAddClick && (
                <Button 
                  onClick={onAddClick}
                  className="bg-poker-red hover:bg-red-700 text-white h-12 px-6 font-medium"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar
                </Button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-md mx-auto p-4">
        <div className="animate-enter">
          {children}
        </div>
      </main>

      {/* Navbar móvil */}
      <MobileNavbar />
    </div>
  )
}