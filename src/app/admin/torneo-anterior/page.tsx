'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import useSWR from 'swr'
import { ChevronLeft, Trophy, Calendar } from 'lucide-react'
import HomeRankingView from '@/components/tournaments/HomeRankingView'
import { NoirButton } from '@/components/noir/NoirButton'

export default function TorneoAnteriorPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isAuthorized, setIsAuthorized] = useState(false)

  // Verificar autorización (solo Comision)
  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    if (user.role !== 'Comision') {
      router.push('/admin')
      return
    }
    setIsAuthorized(true)
  }, [user, router])

  const { data: previousTournamentData, isLoading, error } = useSWR(
    isAuthorized ? '/api/tournaments/previous' : null
  )

  if (!isAuthorized) {
    return null
  }

  if (isLoading) {
    return (
      <div className="relative min-h-screen px-4 pt-20 pb-28">
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80" />

        <div className="relative mx-auto max-w-4xl space-y-6">
          <div className="h-8 w-48 animate-pulse rounded-full bg-[#2a1a14]/60" />
          <div className="h-6 w-64 animate-pulse rounded-full bg-[#2a1a14]/60" />
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-3xl bg-[rgba(31,20,16,0.65)]"
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !previousTournamentData?.tournament) {
    return (
      <div className="relative min-h-screen px-4 pt-20 pb-28">
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80" />

        <div className="relative mx-auto max-w-4xl">
          <NoirButton
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6 gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Volver
          </NoirButton>

          <div className="rounded-3xl border border-[#e0b66c]/12 bg-[rgba(31,20,16,0.78)] p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#2a1a14]">
              <Trophy className="h-8 w-8 text-[#e0b66c]/50" />
            </div>
            <h2 className="mb-2 font-heading text-xl uppercase tracking-[0.24em] text-[#e0b66c]">
              Sin Datos Disponibles
            </h2>
            <p className="text-sm text-[#d7c59a]/70">
              No se encontró información del torneo anterior finalizado.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const { tournament, stats } = previousTournamentData

  return (
    <div className="relative min-h-screen px-4 pt-20 pb-28">
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80" />

      <div className="relative mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <NoirButton
            variant="ghost"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Volver al menú
          </NoirButton>

          <div className="rounded-3xl border border-[#e0b66c]/20 bg-gradient-to-br from-[#2a1a14]/80 via-[#1f1410]/80 to-[#24160f]/80 p-6 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#e0b66c]/30 to-[#a9441c]/30">
                <Trophy className="h-6 w-6 text-[#e0b66c]" />
              </div>
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e0b66c]/40 bg-[#e0b66c]/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f3e6c5]">
                    <Trophy className="h-3 w-3" />
                    Finalizado
                  </span>
                </div>
                <h1 className="mb-2 font-heading text-2xl uppercase tracking-[0.22em] text-[#f3e6c5]">
                  {tournament.name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#d7c59a]/75">
                  <span className="flex items-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5" />
                    Torneo #{tournament.number}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {stats.completedDates} fechas completadas
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ranking Section */}
        <HomeRankingView tournamentId={tournament.id} />
      </div>
    </div>
  )
}
