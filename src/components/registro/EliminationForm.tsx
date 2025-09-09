import { useState, useMemo } from 'react'
import { Plus, ChevronDown } from 'lucide-react'
import { calculatePointsForPosition } from '@/lib/tournament-utils'
import { useAuth } from '@/contexts/AuthContext'

interface Player {
  id: string
  firstName: string
  lastName: string
}

interface Elimination {
  id: string
  position: number
  eliminatedPlayerId: string
  eliminatorPlayerId?: string | null
  eliminatedPlayer: Player
  eliminatorPlayer?: Player | null
}

interface EliminationFormProps {
  gameDate: {
    id: number
    dateNumber: number
  }
  players: Player[]
  eliminations: Elimination[]
  nextPosition: number
  onEliminationCreated: () => void
}

export function EliminationForm({ 
  gameDate, 
  players, 
  eliminations, 
  nextPosition,
  onEliminationCreated 
}: EliminationFormProps) {
  const { user } = useAuth()
  const [eliminatedPlayerId, setEliminatedPlayerId] = useState('')
  const [eliminatorPlayerId, setEliminatorPlayerId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filtrar jugadores activos (no eliminados)
  const activePlayers = useMemo(() => {
    const eliminatedIds = eliminations.map(e => e.eliminatedPlayerId)
    return players.filter(player => !eliminatedIds.includes(player.id))
  }, [players, eliminations])

  // Calcular puntos para la posición actual
  const points = calculatePointsForPosition(nextPosition, players.length)

  // Validar si el formulario está completo
  const isValid = eliminatedPlayerId && (nextPosition === 2 || eliminatorPlayerId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/eliminations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.adminKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameDateId: gameDate.id,
          position: nextPosition,
          eliminatedPlayerId,
          eliminatorPlayerId: nextPosition === 2 ? null : eliminatorPlayerId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al registrar eliminación')
      }

      // Limpiar formulario
      setEliminatedPlayerId('')
      setEliminatorPlayerId('')
      
      // Notificar al componente padre
      onEliminationCreated()

    } catch (err) {
      console.error('Error creating elimination:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setEliminatedPlayerId('')
    setEliminatorPlayerId('')
    setError(null)
  }

  return (
    <div className="bg-poker-card rounded-lg border border-white/10">
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">POS {nextPosition}</h3>
          <div className="text-poker-red font-bold text-lg">
            PTS {points}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Campos del formulario */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Jugador Eliminado */}
          <div>
            <label className="block text-sm font-medium text-poker-muted mb-2">
              Jugador
            </label>
            <div className="relative">
              <select
                value={eliminatedPlayerId}
                onChange={(e) => setEliminatedPlayerId(e.target.value)}
                className="w-full bg-poker-dark border border-white/20 rounded-lg px-4 py-3 text-white focus:border-poker-red focus:outline-none appearance-none text-base"
                required
              >
                <option value="">Seleccionar jugador...</option>
                {activePlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.firstName} {player.lastName}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-poker-muted pointer-events-none" />
            </div>
          </div>

          {/* Jugador Eliminador */}
          <div>
            <label className="block text-sm font-medium text-poker-muted mb-2">
              {nextPosition === 2 ? 'Ganador' : 'vs'}
            </label>
            <div className="relative">
              {nextPosition === 2 ? (
                <div className="w-full bg-poker-dark/50 border border-white/10 rounded-lg px-4 py-3 text-poker-muted">
                  Auto-ganador
                </div>
              ) : (
                <>
                  <select
                    value={eliminatorPlayerId}
                    onChange={(e) => setEliminatorPlayerId(e.target.value)}
                    className="w-full bg-poker-dark border border-white/20 rounded-lg px-4 py-3 text-white focus:border-poker-red focus:outline-none appearance-none text-base"
                    required={nextPosition !== 2}
                  >
                    <option value="">Seleccionar eliminador...</option>
                    {activePlayers
                      .filter(player => player.id !== eliminatedPlayerId)
                      .map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.firstName} {player.lastName}
                        </option>
                      ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-poker-muted pointer-events-none" />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex items-center justify-end">
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-poker-muted hover:text-white transition-colors"
              disabled={isSubmitting}
            >
              Limpiar
            </button>
            
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="bg-poker-red hover:bg-red-700 disabled:bg-poker-red/30 disabled:cursor-not-allowed text-white rounded-lg px-6 py-2 flex items-center transition-colors"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 mr-2 animate-spin rounded-full border-2 border-white border-b-transparent"></div>
              ) : (
                <Plus className="w-5 h-5 mr-2" />
              )}
              {isSubmitting ? 'Registrando...' : 'Registrar'}
            </button>
          </div>
        </div>

        {/* Información especial para posición 2 */}
        {nextPosition === 2 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <p className="text-yellow-400 text-sm">
              ⚠️ Al registrar la posición 2, se declarará automáticamente el ganador.
            </p>
          </div>
        )}

      </form>
    </div>
  )
}