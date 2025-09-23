'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { buildAuthHeaders, getStoredAuthToken } from '@/lib/client-auth'

export default function TournamentStartPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [nextTournamentNumber, setNextTournamentNumber] = useState<number>(0)
  const [selectedNumber, setSelectedNumber] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Check permissions
  useEffect(() => {
    if (user && user.role !== UserRole.Comision) {
      router.push('/admin')
      return
    }
  }, [user, router])

  // Fetch next tournament number on mount
  useEffect(() => {
    if (user && getStoredAuthToken()) {
      fetchNextTournamentNumber()
    }
  }, [user])

  const fetchNextTournamentNumber = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tournaments/next-number', {
        headers: buildAuthHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        setNextTournamentNumber(data.nextNumber)
        setSelectedNumber(data.nextNumber)
      } else {
        setError('Error al obtener número de torneo')
      }
    } catch (err) {
      console.error('Error fetching next tournament number:', err)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleContinue = async () => {
    if (selectedNumber < 1 || selectedNumber > 999) {
      setError('El número debe estar entre 1 y 999')
      return
    }

    setSubmitting(true)
    // Navigate to tournament form with the selected number
    router.push(`/tournaments/new/configure?number=${selectedNumber}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-poker-dark text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-poker-red" />
          <p className="text-poker-muted">Cargando información...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-poker-dark text-white">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/tournaments')}
            className="text-poker-muted hover:text-white hover:bg-white/10 mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Regresar
          </Button>
          <h1 className="text-2xl font-bold text-white">
            Nuevo Torneo
          </h1>
        </div>

        {/* Main Content */}
        <div className="bg-poker-card rounded-lg border border-white/10 p-8">
          <div className="space-y-8">
            {/* Tournament Number Input */}
            <div className="text-center">
              <Input
                type="number"
                value={selectedNumber}
                onChange={(e) => {
                  setSelectedNumber(parseInt(e.target.value) || 0)
                  setError('')
                }}
                className="w-full text-center text-5xl font-bold py-8 bg-poker-dark/50 border-2 border-white/20 text-white focus:border-poker-red hover:border-white/30 transition-colors"
                min="1"
                max="999"
                autoFocus
              />
              
              {selectedNumber !== nextTournamentNumber && selectedNumber > 0 && (
                <p className="text-xs text-yellow-400 mt-2 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Número modificado (sugerido: {nextTournamentNumber})
                </p>
              )}
              
              {error && (
                <p className="text-xs text-red-400 mt-2 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleContinue}
                disabled={submitting || selectedNumber < 1}
                className="w-full bg-poker-red hover:bg-red-700 text-white py-3"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  'Continuar'
                )}
              </Button>

              <Button
                onClick={() => router.push('/tournaments')}
                disabled={submitting}
                variant="outline"
                className="w-full border-white/20 text-poker-text hover:bg-white/5 py-3"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
