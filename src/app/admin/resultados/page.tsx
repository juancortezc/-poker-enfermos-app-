'use client'

import { useAuth } from '@/contexts/AuthContext'
import TournamentResultsPage from '@/components/admin/TournamentResultsPage'

export default function ResultadosPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-poker-muted">Cargando...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-400">Acceso no autorizado</div>
      </div>
    )
  }

  return <TournamentResultsPage />
}