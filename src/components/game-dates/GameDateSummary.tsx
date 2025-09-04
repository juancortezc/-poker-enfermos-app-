'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Users, Trophy, Edit, Clock } from 'lucide-react'

interface GameDateSummaryProps {
  gameDate: any
  onEdit?: () => void
}

export default function GameDateSummary({ gameDate, onEdit }: GameDateSummaryProps) {
  const totalParticipants = (gameDate.playerIds?.length || 0) + (gameDate.guestIds?.length || 0)
  const pointsForWinner = gameDate.pointsForWinner || calculateWinnerPoints(totalParticipants)

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-poker-card border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Calendar className="w-5 h-5 text-poker-cyan" />
            Fecha {gameDate.dateNumber || gameDate.tournament?.number} - {gameDate.tournament?.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="bg-poker-dark/50 rounded-lg p-3">
                <Calendar className="w-6 h-6 text-poker-cyan mx-auto mb-2" />
                <p className="text-xs text-poker-muted">Fecha</p>
                <p className="text-sm font-semibold text-white">
                  {new Date(gameDate.scheduledDate).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short'
                  })}
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-poker-dark/50 rounded-lg p-3">
                <Users className="w-6 h-6 text-poker-green mx-auto mb-2" />
                <p className="text-xs text-poker-muted">Jugadores</p>
                <p className="text-sm font-semibold text-white">
                  {gameDate.playerIds?.length || gameDate.playersCount || 0}
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-poker-dark/50 rounded-lg p-3">
                <Users className="w-6 h-6 text-poker-yellow mx-auto mb-2" />
                <p className="text-xs text-poker-muted">Invitados</p>
                <p className="text-sm font-semibold text-white">
                  {gameDate.guestIds?.length || 0}
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-poker-dark/50 rounded-lg p-3">
                <Trophy className="w-6 h-6 text-poker-red mx-auto mb-2" />
                <p className="text-xs text-poker-muted">Pts. Ganador</p>
                <p className="text-sm font-semibold text-white">
                  {pointsForWinner}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Card */}
      <Card className="bg-poker-card border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Estado de la Fecha
            </div>
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="border-white/20 text-poker-text hover:bg-white/5"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                {new Date(gameDate.scheduledDate).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </h3>
              <p className="text-sm text-poker-muted">
                Total de {totalParticipants} participantes confirmados
              </p>
            </div>
            
            <div className="text-right">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                gameDate.status === 'in_progress' 
                  ? 'bg-green-500/20 text-green-400'
                  : gameDate.status === 'pending'
                  ? 'bg-yellow-500/20 text-yellow-400' 
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {gameDate.status === 'in_progress' && '🟢 En Progreso'}
                {gameDate.status === 'pending' && '🟡 Pendiente'}
                {gameDate.status === 'completed' && '✅ Completada'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Points Breakdown */}
      <Card className="bg-poker-card border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Trophy className="w-5 h-5" />
            Sistema de Puntuación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-poker-dark/30 p-4 rounded-lg">
            <p className="text-sm text-poker-muted mb-3">
              Puntos basados en {totalParticipants} participantes:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-poker-cyan font-medium">1º Lugar:</span>
                <span className="text-white ml-2">{pointsForWinner} pts</span>
              </div>
              <div>
                <span className="text-poker-cyan font-medium">2º Lugar:</span>
                <span className="text-white ml-2">{Math.floor(pointsForWinner * 0.7)} pts</span>
              </div>
              <div>
                <span className="text-poker-cyan font-medium">3º Lugar:</span>
                <span className="text-white ml-2">{Math.floor(pointsForWinner * 0.5)} pts</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Función para calcular puntos del ganador
function calculateWinnerPoints(totalParticipants: number): number {
  if (totalParticipants >= 20) return 25
  if (totalParticipants >= 16) return 22
  if (totalParticipants >= 12) return 20
  if (totalParticipants >= 9) return 18
  return 15
}