'use client'

import { useEffect, useState } from 'react'
import { X, Calendar, Loader2 } from 'lucide-react'
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

  const getPlayerName = (player: Player) => `${player.firstName} ${player.lastName}`.toUpperCase()
  const getPlayerImage = (player: Player) => player.photoUrl || '/icons/user-circle.svg'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(11,7,6,0.88)] p-4 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[32px] border border-[#e0b66c]/25 bg-[rgba(26,17,13,0.95)] shadow-[0_32px_90px_rgba(11,6,3,0.75)]">
        <div className="sticky top-0 z-10 border-b border-[#e0b66c]/18 bg-[linear-gradient(135deg,rgba(224,182,108,0.18),rgba(26,17,13,0.9))] px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-heading text-lg uppercase tracking-[0.22em] text-[#f3e6c5]">
                Detalle de Relación P&H
              </h2>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#d7c59a]/75">
                Historial completo de eliminaciones
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full border border-[#e0b66c]/25 bg-[rgba(42,26,20,0.78)] p-2 text-[#d7c59a]/70 transition-colors hover:border-[#e0b66c]/45 hover:text-[#f3e6c5]"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-5 text-[#f3e6c5]" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#e0b66c]" />
              <p className="mt-4 text-sm text-[#d7c59a]/75">Cargando detalles...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-500/35 bg-rose-500/15 p-6 text-center text-rose-100">
              {error}
            </div>
          ) : relation ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                <div className="rounded-2xl border border-[#e0b66c]/18 bg-[rgba(31,20,16,0.78)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-[#d7c59a]/70">Padre</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="relative h-12 w-12 flex-shrink-0">
                      <Image
                        src={getPlayerImage(relation.parentPlayer)}
                        alt={getPlayerName(relation.parentPlayer)}
                        fill
                        loading="lazy"
                        className="rounded-full border border-[#e0b66c]/45 object-cover shadow-[0_8px_18px_rgba(11,6,3,0.45)]"
                      />
                    </div>
                    <p className="text-sm font-semibold tracking-[0.14em] text-[#f3e6c5]">
                      {getPlayerName(relation.parentPlayer)}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e0b66c]/18 bg-[rgba(31,20,16,0.78)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-[#d7c59a]/70">Hijo</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="relative h-12 w-12 flex-shrink-0">
                      <Image
                        src={getPlayerImage(relation.childPlayer)}
                        alt={getPlayerName(relation.childPlayer)}
                        fill
                        loading="lazy"
                        className="rounded-full border border-[#d7c59a]/35 object-cover shadow-[0_8px_18px_rgba(11,6,3,0.35)]"
                      />
                    </div>
                    <p className="text-sm font-semibold tracking-[0.14em] text-[#f3e6c5]">
                      {getPlayerName(relation.childPlayer)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                <div className="rounded-2xl border border-[#e0b66c]/25 bg-[linear-gradient(135deg,rgba(224,182,108,0.28),rgba(169,68,28,0.18))] p-4 text-[#1f1410] shadow-[0_0_22px_rgba(224,182,108,0.32)]">
                  <p className="text-[10px] uppercase tracking-[0.24em]">Total Eliminaciones</p>
                  <p className="mt-2 text-3xl font-bold">{relation.eliminationCount}</p>
                  {relation.isActiveRelation && (
                    <span className="mt-3 inline-block rounded-full border border-emerald-400/45 bg-emerald-500/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-100">
                      Relación activa
                    </span>
                  )}
                </div>

                <div className="rounded-2xl border border-[#e0b66c]/18 bg-[rgba(31,20,16,0.78)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-[#d7c59a]/70">Período</p>
                  <div className="mt-2 space-y-1 text-xs text-[#f3e6c5]/85">
                    <p>
                      <span className="text-[#d7c59a]/65">Inicio:</span> {formatDate(relation.firstElimination)}
                    </p>
                    <p>
                      <span className="text-[#d7c59a]/65">Última:</span> {formatDate(relation.lastElimination)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e0b66c]/18 bg-[rgba(31,20,16,0.78)] p-4">
                <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-[#d7c59a]/70">Detalle de Eliminaciones</p>
                <div className="space-y-3">
                  {eliminations.map((elimination, index) => (
                    <div
                      key={elimination.id}
                      className="rounded-xl border border-[#e0b66c]/18 bg-[rgba(26,17,13,0.9)] px-4 py-3 text-[#f3e6c5] transition-colors hover:border-[#e0b66c]/35"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e0b66c]/35 bg-[rgba(42,26,20,0.78)] text-sm font-semibold tracking-[0.16em] text-[#e0b66c]">
                            {index + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 text-sm font-medium tracking-[0.12em] text-[#f3e6c5]">
                              <Calendar className="h-3.5 w-3.5 text-[#d7c59a]/70" />
                              Fecha {elimination.dateNumber}
                            </div>
                            <p className="mt-1 text-xs text-[#d7c59a]/75">
                              {formatDate(elimination.scheduledDate)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-[#d7c59a]/70">Posición</p>
                          <p className="text-2xl font-bold tracking-[0.1em] text-[#f3e6c5]">{elimination.position}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {eliminations.length === 0 && (
                    <p className="text-center text-sm text-[#d7c59a]/70">
                      No hay eliminaciones registradas.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
