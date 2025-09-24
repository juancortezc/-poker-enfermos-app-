import { useState, useMemo } from 'react'
import { Plus, ChevronDown } from 'lucide-react'
import { calculatePointsForPosition } from '@/lib/tournament-utils'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/hooks/useNotifications'
import { buildAuthHeaders } from '@/lib/client-auth'

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
  const { notifyPlayerEliminated, notifyWinner } = useNotifications()
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

  // Identificar ganador automático cuando solo quedan dos jugadores
  const autoWinner = useMemo(() => {
    if (nextPosition !== 2 || !eliminatedPlayerId) return null
    return activePlayers.find(player => player.id !== eliminatedPlayerId) || null
  }, [nextPosition, eliminatedPlayerId, activePlayers])

  // Validar si el formulario está completo
  const isValid = Boolean(
    eliminatedPlayerId && (nextPosition === 2 ? autoWinner : eliminatorPlayerId)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    setIsSubmitting(true)
    setError(null)

    try {
      const eliminatorIdForRequest = nextPosition === 2
        ? autoWinner?.id || null
        : eliminatorPlayerId

      if (nextPosition === 2 && !eliminatorIdForRequest) {
        throw new Error('No se pudo identificar al ganador automáticamente')
      }

      const response = await fetch('/api/eliminations', {
        method: 'POST',
        headers: buildAuthHeaders({}, { includeJson: true }),
        body: JSON.stringify({
          gameDateId: gameDate.id,
          position: nextPosition,
          eliminatedPlayerId,
          eliminatorPlayerId: eliminatorIdForRequest
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al registrar eliminación')
      }

      // Obtener información del jugador eliminado para notificaciones
      const eliminatedPlayer = players.find(p => p.id === eliminatedPlayerId)
      const eliminatorPlayer = nextPosition === 2
        ? autoWinner
        : eliminatorPlayerId
          ? players.find(p => p.id === eliminatorPlayerId)
          : null

      // Enviar notificaciones según el tipo de eliminación
      if (nextPosition === 1) {
        // Es un ganador
        if (eliminatedPlayer) {
          notifyWinner(`${eliminatedPlayer.firstName} ${eliminatedPlayer.lastName}`, points)
        }
      } else if (nextPosition === 2 && eliminatorPlayer) {
        // Posición 2, el eliminador será el ganador
        notifyWinner(`${eliminatorPlayer.firstName} ${eliminatorPlayer.lastName}`, calculatePointsForPosition(1, players.length))
      } else if (eliminatedPlayer) {
        // Eliminación regular
        notifyPlayerEliminated(`${eliminatedPlayer.firstName} ${eliminatedPlayer.lastName}`, nextPosition)
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
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        
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
        <div className="grid grid-cols-2 gap-3">
          
          {/* Jugador Eliminado */}
          <div>
            <label className="block text-xs font-medium text-poker-muted mb-1">
              Jugador
            </label>
            <div className="relative">
              <select
                value={eliminatedPlayerId}
                onChange={(e) => setEliminatedPlayerId(e.target.value)}
                className="w-full bg-poker-dark border border-white/20 rounded-lg px-3 py-2 text-white focus:border-poker-red focus:outline-none appearance-none text-sm"
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
            <label className="block text-xs font-medium text-poker-muted mb-1">
              {nextPosition === 2 ? 'Ganador' : 'vs'}
            </label>
            <div className="relative">
              {nextPosition === 2 ? (
                <div className="w-full bg-poker-dark/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80">
                  {autoWinner
                    ? `${autoWinner.firstName} ${autoWinner.lastName}`
                    : 'Selecciona primero al jugador eliminado'}
                </div>
              ) : (
                <>
                  <select
                    value={eliminatorPlayerId}
                    onChange={(e) => setEliminatorPlayerId(e.target.value)}
                    className="w-full bg-poker-dark border border-white/20 rounded-lg px-3 py-2 text-white focus:border-poker-red focus:outline-none appearance-none text-sm"
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
