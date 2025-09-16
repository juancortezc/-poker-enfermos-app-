'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Trash2, RotateCcw, Play, Settings, Edit } from 'lucide-react'

interface GameDate {
  id: number
  dateNumber: number
  status: string
  scheduledDate: string
  startTime: string | null
  playersCount: number
  scheduledDateFormatted: string
}

interface Tournament {
  id: number
  name: string
  number: number
  status: string
}

interface DebugData {
  tournament: Tournament
  totalGameDates: number
  gameDates: GameDate[]
}

export default function AdminGameDatesPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DebugData | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user && user.role === UserRole.Comision) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/debug/game-dates')
      if (response.ok) {
        const debugData = await response.json()
        setData(debugData)
      } else {
        setError('Error al cargar datos')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (gameDateId: number) => {
    // Navigate to configuration page with edit parameters
    window.location.href = `/game-dates/config?edit=true&gameDateId=${gameDateId}`
  }

  const handleDelete = async (gameDateId: number) => {
    if (!confirm('¿Estás seguro de eliminar esta fecha? Se perderán todos los datos asociados.')) {
      return
    }

    try {
      setDeleting(gameDateId)
      const pin = localStorage.getItem('poker-pin')
      const response = await fetch(`/api/game-dates/${gameDateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': pin ? `Bearer PIN:${pin}` : '',
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        alert(`✅ ${result.message}`)
        await loadData()
      } else {
        const errorData = await response.json()
        alert(`❌ Error: ${errorData.error}`)
      }
    } catch (err) {
      alert('❌ Error de conexión')
    } finally {
      setDeleting(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-gray-400'
      case 'CREATED': return 'text-blue-400'
      case 'in_progress': return 'text-orange-400'
      case 'completed': return 'text-green-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente'
      case 'CREATED': return 'Configurada'
      case 'in_progress': return 'En Progreso'
      case 'completed': return 'Completada'
      default: return status
    }
  }

  if (!user || user.role !== UserRole.Comision) {
    return (
      <div className="min-h-screen bg-poker-dark flex items-center justify-center">
        <p className="text-poker-muted">Sin permisos para acceder</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-poker-dark flex items-center justify-center">
        <p className="text-poker-muted">Cargando...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-poker-dark flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={loadData} className="bg-poker-red hover:bg-red-700">
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-poker-dark text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-poker-red">Administración de Fechas</h1>
            {data?.tournament && (
              <p className="text-poker-muted">
                {data.tournament.name} - {data.totalGameDates} fechas configuradas
              </p>
            )}
          </div>
          <Button onClick={loadData} className="bg-poker-card hover:bg-gray-700">
            <RotateCcw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Button 
            onClick={() => window.location.href = '/game-dates/config'} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurar Nueva Fecha
          </Button>
          <Button 
            onClick={() => window.location.href = '/registro'} 
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className="w-4 h-4 mr-2" />
            Ir a Registro
          </Button>
          <Button 
            onClick={() => window.location.href = '/admin'} 
            className="bg-poker-card hover:bg-gray-700"
          >
            Volver a Admin
          </Button>
        </div>

        {/* Game Dates Table */}
        <div className="bg-poker-card rounded-lg border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-poker-dark">
                <tr>
                  <th className="px-4 py-3 text-left">Fecha #</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Fecha Programada</th>
                  <th className="px-4 py-3 text-left">Jugadores</th>
                  <th className="px-4 py-3 text-left">Inicio</th>
                  <th className="px-4 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data?.gameDates.map((gameDate) => (
                  <tr key={gameDate.id} className="border-t border-white/10 hover:bg-poker-dark/50">
                    <td className="px-4 py-3 font-bold">#{gameDate.dateNumber}</td>
                    <td className="px-4 py-3">
                      <span className={`${getStatusColor(gameDate.status)} font-medium`}>
                        {getStatusLabel(gameDate.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{gameDate.scheduledDateFormatted}</td>
                    <td className="px-4 py-3">{gameDate.playersCount}</td>
                    <td className="px-4 py-3">
                      {gameDate.startTime ? 
                        new Date(gameDate.startTime).toLocaleString('es-ES') : 
                        '-'
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {/* Edit button - only for CREATED status */}
                        {gameDate.status === 'CREATED' && (
                          <Button
                            onClick={() => handleEdit(gameDate.id)}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Editar
                          </Button>
                        )}
                        
                        {/* Delete button - for all configured statuses */}
                        {gameDate.status !== 'pending' && (
                          <Button
                            onClick={() => handleDelete(gameDate.id)}
                            disabled={deleting === gameDate.id}
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            {deleting === gameDate.id ? (
                              'Eliminando...'
                            ) : (
                              <>
                                <Trash2 className="w-3 h-3 mr-1" />
                                Eliminar
                              </>
                            )}
                          </Button>
                        )}
                        
                        {/* Pending status message */}
                        {gameDate.status === 'pending' && (
                          <span className="text-gray-500 text-sm">No configurada</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-poker-muted text-sm">
          <p>Solo fechas configuradas, en progreso o completadas pueden ser eliminadas.</p>
          <p>Eliminar una fecha la resetea a estado "pendiente" para reconfiguración.</p>
        </div>
      </div>
    </div>
  )
}