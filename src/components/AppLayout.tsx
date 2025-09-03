'use client'

import { useAuth } from '@/contexts/AuthContext'
import MobileNavbar from './MobileNavbar'
import LoginForm from './LoginForm'

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
      className="text-gray-500 hover:text-red-600 transition-colors"
    >
      Salir
    </button>
  )
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return (
    <div className="min-h-screen pb-16">
      <header className="bg-white shadow-sm border-b border-gray-200 p-4 sticky top-0 z-40">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🃏</div>
            <div>
              <h1 className="text-lg font-bold text-green-800">Poker Enfermos</h1>
              <p className="text-sm text-gray-600">
                {user.firstName} {user.lastName} ({user.role})
              </p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {children}
      </main>

      <MobileNavbar />
    </div>
  )
}