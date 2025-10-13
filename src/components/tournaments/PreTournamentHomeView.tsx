'use client'

import Image from 'next/image'
import useSWR from 'swr'
import { Trophy, Users, Calendar, User } from 'lucide-react'

interface PreTournamentHomeViewProps {
  currentTournament?: {
    id: number
    number: number
    name: string
    gameDates: Array<{
      id: number
      dateNumber: number
      scheduledDate: Date | string
      location?: string
    }>
    tournamentParticipants: Array<{
      player: {
        id: string
        firstName: string
        lastName: string
        photoUrl?: string
      }
    }>
  }
}

export default function PreTournamentHomeView({ currentTournament }: PreTournamentHomeViewProps) {
  const { data: previousTournamentData } = useSWR('/api/tournaments/previous')
  const { data: winnersData } = useSWR('/api/tournaments/winners')
  const { data: t29ParticipantsData } = useSWR('/api/t29-participants')

  const previousTournament = previousTournamentData?.tournament

  // Get the actual champion from winners API
  const previousWinnerData = winnersData?.data?.find(
    (w: { tournamentNumber: number }) =>
      w.tournamentNumber === previousTournament?.number
  )

  const previousWinner = previousWinnerData?.champion

  const firstDate = currentTournament?.gameDates?.[0]

  // Use T29 participants count (confirmed registrations) instead of tournament participants
  const participantsCount = t29ParticipantsData?.count || 0
  const confirmedParticipants = t29ParticipantsData?.participants || []

  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (!currentTournament) {
    return (
      <div className="paper px-6 py-10 text-center">
        <p className="text-[#d7c59a]">
          Cargando información del torneo...
        </p>
      </div>
    )
  }

  return (
    <section className="space-y-8">
      <header className="text-center space-y-3 py-8">
        <p className="text-[11px] uppercase tracking-[0.28em] text-[#d7c59a]/75">
          Torneo #{currentTournament.number} · {currentTournament.name}
        </p>
        <h2 className="font-heading text-3xl uppercase tracking-[0.22em] text-[#f3e6c5]">
          Noir Jazz Lounge
        </h2>
        <p className="text-sm text-[#d7c59a]/70">
          El torneo está por comenzar. Prepárate para el desafío.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Card 1: Champion to Beat - Baseball Card Style */}
        <article className="relative overflow-hidden rounded-[24px] border-2 border-[#e0b66c]/50 bg-[linear-gradient(135deg,rgba(42,26,20,0.95),rgba(24,14,10,0.92))] p-6 shadow-[0_20px_55px_rgba(224,182,108,0.35)] backdrop-blur-md transition-transform duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(224,182,108,0.12),transparent_60%)]" />

          <div className="relative space-y-5 text-center">
            <div className="flex items-center justify-center gap-2">
              <Trophy className="h-5 w-5 text-[#e0b66c]" />
              <h3 className="font-heading text-[11px] uppercase tracking-[0.28em] text-[#e0b66c]">
                Este torneo hay que vencer a
              </h3>
            </div>

            {previousWinner ? (
              <>
                <div className="mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-[#e0b66c]/60 bg-[#1a0f0c] shadow-[0_18px_40px_rgba(11,6,3,0.55)]">
                  {previousWinner.photoUrl ? (
                    <Image
                      src={previousWinner.photoUrl}
                      alt={`${previousWinner.firstName} ${previousWinner.lastName}`}
                      width={128}
                      height={128}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-16 w-16 text-[#d7c59a]/50" />
                  )}
                </div>

                <div>
                  <h4 className="font-heading text-2xl uppercase tracking-[0.18em] text-[#f3e6c5]">
                    {previousWinner.firstName} {previousWinner.lastName}
                  </h4>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.24em] text-[#d7c59a]/70">
                    Campeón T{previousTournament?.number}
                  </p>
                </div>

                <div className="rounded-full border border-[#e0b66c]/30 bg-[#1a0f0c]/60 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e0b66c]">
                  Campeón Defensor
                </div>
              </>
            ) : (
              <div className="py-12 text-[#d7c59a]/60">
                <p className="text-sm">Cargando campeón anterior...</p>
              </div>
            )}
          </div>
        </article>

        {/* Card 2: Participants Count */}
        <article className="relative overflow-hidden rounded-[24px] border-2 border-[#e0b66c]/35 bg-[linear-gradient(135deg,rgba(31,20,16,0.95),rgba(24,14,10,0.92))] p-6 shadow-[0_18px_40px_rgba(11,6,3,0.45)] backdrop-blur-md transition-transform duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(169,68,28,0.12),transparent_60%)]" />

          <div className="relative space-y-5 text-center">
            <div className="flex items-center justify-center gap-2">
              <Users className="h-5 w-5 text-[#a9441c]" />
              <h3 className="font-heading text-[11px] uppercase tracking-[0.28em] text-[#e0b66c]">
                Inscritos para el Torneo
              </h3>
            </div>

            <div className="py-6">
              <div className="text-[4rem] font-heading leading-none tracking-[0.12em] text-[#e0b66c]">
                {participantsCount}
              </div>
              <p className="mt-3 text-[11px] uppercase tracking-[0.24em] text-[#d7c59a]/70">
                {participantsCount === 1 ? 'Jugador' : 'Jugadores'}
              </p>
            </div>

            <div className="space-y-2 rounded-2xl border border-[#e0b66c]/20 bg-[#1a0f0c]/40 p-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#d7c59a]/60">
                Participantes confirmados
              </p>
              <div className="flex flex-wrap justify-center gap-1">
                {confirmedParticipants.slice(0, 8).map((participant: { id: number; firstName: string; player: { id: string; photoUrl: string | null } }) => (
                  <div
                    key={participant.id}
                    className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[#e0b66c]/30 bg-[#2a1a14]"
                  >
                    {participant.player.photoUrl ? (
                      <Image
                        src={participant.player.photoUrl}
                        alt={participant.firstName}
                        width={32}
                        height={32}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-semibold text-[#d7c59a]">
                        {participant.firstName.charAt(0)}
                      </span>
                    )}
                  </div>
                ))}
                {participantsCount > 8 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#e0b66c]/30 bg-[#2a1a14] text-[10px] font-semibold text-[#d7c59a]">
                    +{participantsCount - 8}
                  </div>
                )}
              </div>
            </div>
          </div>
        </article>

        {/* Card 3: First Date */}
        <article className="relative overflow-hidden rounded-[24px] border-2 border-[#e0b66c]/35 bg-[linear-gradient(135deg,rgba(31,20,16,0.95),rgba(24,14,10,0.92))] p-6 shadow-[0_18px_40px_rgba(11,6,3,0.45)] backdrop-blur-md transition-transform duration-300 hover:-translate-y-1">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(224,182,108,0.08),transparent_70%)]" />

          <div className="relative space-y-5 text-center">
            <div className="flex items-center justify-center gap-2">
              <Calendar className="h-5 w-5 text-[#a9441c]" />
              <h3 className="font-heading text-[11px] uppercase tracking-[0.28em] text-[#e0b66c]">
                Primera Fecha
              </h3>
            </div>

            {firstDate ? (
              <>
                <div className="space-y-3 py-6">
                  <div className="flex items-center justify-center gap-3">
                    <div className="text-center">
                      <div className="text-[3rem] font-heading leading-none tracking-[0.12em] text-[#e0b66c]">
                        {new Date(firstDate.scheduledDate).getDate()}
                      </div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.24em] text-[#d7c59a]/70">
                        {new Date(firstDate.scheduledDate).toLocaleDateString('es-ES', { month: 'short' })}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-[#f3e6c5]">
                    {new Date(firstDate.scheduledDate).toLocaleDateString('es-ES', { weekday: 'long' })}
                  </div>
                </div>

                <div className="space-y-2 rounded-2xl border border-[#e0b66c]/20 bg-[#1a0f0c]/40 p-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[#d7c59a]/60">
                    Fecha completa
                  </p>
                  <p className="text-sm capitalize text-[#f3e6c5]">
                    {formatDate(firstDate.scheduledDate)}
                  </p>
                  {firstDate.location && (
                    <p className="mt-2 text-[11px] text-[#d7c59a]/70">
                      📍 {firstDate.location}
                    </p>
                  )}
                </div>

                <div className="rounded-full border border-[#a9441c]/40 bg-[#a9441c]/15 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e0b66c]">
                  Fecha #{firstDate.dateNumber}
                </div>
              </>
            ) : (
              <div className="py-12 text-[#d7c59a]/60">
                <p className="text-sm">No hay fechas programadas aún</p>
              </div>
            )}
          </div>
        </article>
      </div>

      <div className="rounded-3xl border-2 border-[#3c2219] bg-[#2a1a14]/40 p-6 text-center">
        <p className="text-sm text-[#d7c59a]">
          Las cartas están sobre la mesa. Cuando tengamos los primeros resultados,
          verás aquí la tabla de clasificación completa.
        </p>
      </div>
    </section>
  )
}
