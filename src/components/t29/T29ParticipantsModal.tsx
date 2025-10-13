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
          className="fixed inset-0 z-[150] flex items-center justify-center bg-[#0b0706]/80 backdrop-blur-sm px-4 py-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-[#e0b66c]/18 bg-[rgba(24,14,10,0.96)] shadow-[0_36px_90px_rgba(11,6,3,0.75)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(224,182,108,0.16),_transparent_65%)]" />

            {/* Close button - absolute position */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e0b66c]/25 bg-[rgba(42,26,20,0.9)] text-[#d7c59a]/75 transition-colors hover:border-[#e0b66c]/45 hover:text-[#f3e6c5]"
              aria-label="Cerrar listado de participantes"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative z-10 p-5 sm:p-6">
              {/* Compact header - single line */}
              <header className="flex items-center gap-3 pb-4">
                <Users className="h-6 w-6 text-[#e0b66c]" />
                <h2 className="font-heading text-lg uppercase tracking-[0.18em] text-[#f3e6c5]">
                  {totalCount === 0
                    ? 'Aún no hay registros confirmados'
                    : `${totalCount} ${totalCount === 1 ? 'jugador confirmado' : 'jugadores confirmados'}`}
                </h2>
              </header>

              {/* Participants list with proper spacing for navbar */}
              <div className="max-h-[calc(100vh-200px)] overflow-y-auto pr-1 pb-24">
                <div className="space-y-3">
                  {isLoading ? (
                    skeletonItems.map((_, index) => (
                      <div
                        key={`skeleton-${index}`}
                        className="flex items-center gap-4 rounded-2xl border border-[#e0b66c]/10 bg-[rgba(31,20,16,0.6)] p-4"
                      >
                        <div className="h-12 w-12 animate-pulse rounded-xl bg-[#2a1a14]" />
                        <div className="flex flex-1 flex-col gap-2">
                          <div className="h-3 w-40 animate-pulse rounded-full bg-[#2a1a14]" />
                          <div className="h-3 w-28 animate-pulse rounded-full bg-[#2a1a14]" />
                        </div>
                      </div>
                    ))
                  ) : participants.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#e0b66c]/20 bg-[rgba(31,20,16,0.55)] px-6 py-12 text-center">
                      <Users className="mb-4 h-10 w-10 text-[#d7c59a]/70" />
                      <p className="text-base font-medium text-[#f3e6c5]">Sé el primero en confirmar</p>
                      <p className="mt-2 max-w-sm text-sm text-[#d7c59a]/70">
                        Cuando un enfermo confirme su participación aparecerá en este listado con la fecha y hora de registro.
                      </p>
                    </div>
                  ) : (
                    [...participants]
                      .sort((a, b) => new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime())
                      .map((participant, index) => (
                        <div
                          key={participant.id}
                          className="group flex items-center gap-4 rounded-2xl border border-[#e0b66c]/20 bg-[rgba(31,20,16,0.72)] p-4 transition-transform hover:-translate-y-0.5 hover:border-[#e0b66c]/40"
                        >
                          <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-[#e0b66c]/25 bg-[#2a1a14]">
                            {participant.player.photoUrl ? (
                              <Image
                                src={participant.player.photoUrl}
                                alt={`${participant.firstName} ${participant.lastName}`}
                                fill
                                sizes="48px"
                                className="object-cover noir-photo"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[#d7c59a]/75">
                                <Users className="h-5 w-5" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                          </div>

                          <div className="flex flex-1 flex-col">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-base font-semibold text-[#f3e6c5]">
                                {participant.firstName} {participant.lastName}
                              </span>
                              <span className="rounded-full border border-[#e0b66c]/25 bg-[#e0b66c]/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#e0b66c]/85">
                                #{String(index + 1).padStart(2, '0')}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-[#d7c59a]/70">
                              <Clock className="h-3.5 w-3.5 text-[#e0b66c]/80" />
                              <span>Registrado el {formatRegistrationDate(participant.registeredAt)}</span>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>

                {/* Info message at the bottom - after list */}
                {participants.length > 0 && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-[#d7c59a]/60">
                    <Sparkles className="h-3.5 w-3.5 text-[#e0b66c]/60" />
                    <span>El listado se actualiza en tiempo real</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
