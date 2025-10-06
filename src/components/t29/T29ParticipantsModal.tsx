'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X, Users, Clock, Sparkles } from 'lucide-react'
import Image from 'next/image'

interface ParticipantPlayer {
  id: string
  photoUrl: string | null
}

export interface T29Participant {
  id: number
  firstName: string
  lastName: string
  registeredAt: string
  player: ParticipantPlayer
}

interface T29ParticipantsModalProps {
  isOpen: boolean
  onClose: () => void
  participants: T29Participant[]
  isLoading: boolean
  totalCount: number
}

function formatRegistrationDate(dateString: string): string {
  if (!dateString) return 'Fecha desconocida'

  try {
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) {
      return 'Fecha desconocida'
    }

    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date)
  } catch (error) {
    console.warn('Could not format registration date:', error)
    return 'Fecha desconocida'
  }
}

const skeletonItems = Array.from({ length: 4 })

export function T29ParticipantsModal({
  isOpen,
  onClose,
  participants,
  isLoading,
  totalCount
}: T29ParticipantsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-br from-[#1c1a2f] via-[#17192a] to-[#10121d] shadow-[0_30px_90px_rgba(5,7,16,0.75)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_60%)]" />

            <div className="relative z-10 p-6 sm:p-8">
              <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-white shadow-[0_12px_30px_rgba(18,22,35,0.45)]">
                    <Users className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/55">Participantes</p>
                    <h2 className="text-2xl font-semibold tracking-tight text-white">Registro Torneo 29</h2>
                    <p className="text-sm text-white/60">
                      {totalCount === 0
                        ? 'Aún no hay registros confirmados.'
                        : `${totalCount} ${totalCount === 1 ? 'jugador confirmado' : 'jugadores confirmados'}`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-white/70 transition-colors hover:border-white/35 hover:text-white"
                  aria-label="Cerrar listado de participantes"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              <div className="mt-6 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                <Sparkles className="h-4 w-4 text-poker-gold" />
                <span>El listado se actualiza en tiempo real cuando se suman nuevos enfermos al torneo.</span>
              </div>

              <div className="mt-6 max-h-[55vh] overflow-y-auto pr-1">
                <div className="space-y-3">
                  {isLoading ? (
                    skeletonItems.map((_, index) => (
                      <div
                        key={`skeleton-${index}`}
                        className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/[0.04] p-4"
                      >
                        <div className="h-12 w-12 animate-pulse rounded-xl bg-white/10" />
                        <div className="flex flex-1 flex-col gap-2">
                          <div className="h-3 w-40 animate-pulse rounded-full bg-white/10" />
                          <div className="h-3 w-28 animate-pulse rounded-full bg-white/10" />
                        </div>
                      </div>
                    ))
                  ) : participants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.03] px-6 py-12 text-center">
                      <Users className="mb-4 h-10 w-10 text-white/45" />
                      <p className="text-base font-medium text-white/75">Sé el primero en confirmar</p>
                      <p className="mt-2 max-w-sm text-sm text-white/50">
                        Cuando un enfermo confirme su participación aparecerá en este listado con la fecha y hora de registro.
                      </p>
                    </div>
                  ) : (
                    [...participants]
                      .sort((a, b) => new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime())
                      .map((participant, index) => (
                        <div
                          key={participant.id}
                          className="group flex items-center gap-4 rounded-2xl border border-white/12 bg-gradient-to-r from-white/[0.09] via-white/[0.04] to-transparent p-4 transition-transform hover:-translate-y-0.5 hover:border-white/25"
                        >
                          <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-white/15 bg-white/10">
                            {participant.player.photoUrl ? (
                              <Image
                                src={participant.player.photoUrl}
                                alt={`${participant.firstName} ${participant.lastName}`}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-white/65">
                                <Users className="h-5 w-5" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                          </div>

                          <div className="flex flex-1 flex-col">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-base font-semibold text-white">
                                {participant.firstName} {participant.lastName}
                              </span>
                              <span className="rounded-full border border-white/12 bg-white/5 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
                                #{String(index + 1).padStart(2, '0')}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-white/60">
                              <Clock className="h-3.5 w-3.5" />
                              <span>Registrado el {formatRegistrationDate(participant.registeredAt)}</span>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
