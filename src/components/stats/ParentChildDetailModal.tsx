'use client'

import { useEffect, useState } from 'react'
import { X, Calendar, TrendingDown, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface Player {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string | null
}

interface Elimination {
  id: string
  position: number
  dateNumber: number
  scheduledDate: string
}

interface RelationDetail {
  id: number
  eliminationCount: number
  isActiveRelation: boolean
  firstElimination: string
  lastElimination: string
  parentPlayer: Player
  childPlayer: Player
}

interface ParentChildDetailModalProps {
  isOpen: boolean
  onClose: () => void
  tournamentId: number
  relationId: number
}

export default function ParentChildDetailModal({
  isOpen,
  onClose,
  tournamentId,
  relationId
}: ParentChildDetailModalProps) {
  const [loading, setLoading] = useState(true)
  const [relation, setRelation] = useState<RelationDetail | null>(null)
  const [eliminations, setEliminations] = useState<Elimination[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    async function fetchDetails() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/stats/parent-child/${tournamentId}/${relationId}`)

        if (!response.ok) {
          throw new Error('Error al cargar detalles')
        }

        const data = await response.json()
        setRelation(data.relation)
        setEliminations(data.eliminations)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [isOpen, tournamentId, relationId])

  if (!isOpen) return null

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getPlayerName = (player: Player) => {
    return `${player.firstName} ${player.lastName}`.toUpperCase()
  }

  const getPlayerImage = (player: Player) => {
    return player.photoUrl || '/icons/user-circle.svg'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#201c30] via-[#1b1c2b] to-[#131422] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-white/10 bg-gradient-to-r from-poker-red/20 to-transparent p-6 backdrop-blur-xl">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Detalle de Relación P&H</h2>
              <p className="mt-1 text-sm text-white/60">
                Historial completo de eliminaciones
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-poker-red" />
              <p className="mt-4 text-sm text-white/60">Cargando detalles...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
              <p className="text-rose-200">{error}</p>
            </div>
          ) : relation ? (
            <div className="space-y-6">
              {/* Players Info */}
              <div className="grid grid-cols-2 gap-4">
                {/* Padre */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="mb-3 text-xs uppercase tracking-wider text-white/60">Padre</p>
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 flex-shrink-0">
                      <Image
                        src={getPlayerImage(relation.parentPlayer)}
                        alt={getPlayerName(relation.parentPlayer)}
                        fill
                        className="rounded-full border-2 border-poker-red object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        {getPlayerName(relation.parentPlayer)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Hijo */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="mb-3 text-xs uppercase tracking-wider text-white/60">Hijo</p>
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 flex-shrink-0">
                      <Image
                        src={getPlayerImage(relation.childPlayer)}
                        alt={getPlayerName(relation.childPlayer)}
                        fill
                        className="rounded-full border-2 border-white/30 object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        {getPlayerName(relation.childPlayer)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-poker-red/20 to-transparent p-4">
                  <p className="text-xs uppercase tracking-wider text-white/60">Total Eliminaciones</p>
                  <p className="mt-2 text-3xl font-bold text-white">{relation.eliminationCount}</p>
                  {relation.isActiveRelation && (
                    <span className="mt-2 inline-block rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                      Relación Activa
                    </span>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wider text-white/60">Período</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-white/80">
                      <span className="text-white/50">Inicio:</span>{' '}
                      {formatDate(relation.firstElimination)}
                    </p>
                    <p className="text-xs text-white/80">
                      <span className="text-white/50">Última:</span>{' '}
                      {formatDate(relation.lastElimination)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Eliminations List */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/80">
                  <TrendingDown className="h-4 w-4 text-poker-red" />
                  Historial de Eliminaciones
                </h3>

                <div className="space-y-3">
                  {eliminations.map((elimination, index) => (
                    <div
                      key={elimination.id}
                      className="group rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:border-poker-red/40 hover:bg-white/8"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-poker-red/20 text-sm font-bold text-poker-red">
                            {index + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-white/40" />
                              <p className="text-sm font-medium text-white">
                                Fecha {elimination.dateNumber}
                              </p>
                            </div>
                            <p className="mt-1 text-xs text-white/60">
                              {formatDate(elimination.scheduledDate)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-wider text-white/50">Posición</p>
                          <p className="text-2xl font-bold text-white">{elimination.position}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
