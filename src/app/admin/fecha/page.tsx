'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Card } from '@/components/ui/card'
import { Loader2, CalendarCheck, ShieldAlert } from 'lucide-react'
import { useActiveTournament } from '@/hooks/useActiveTournament'
import AwardCard from '@/components/stats/AwardCard'
import { fetcher } from '@/lib/swr-config'

interface Player {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string | null
  role: string
}

interface GameDate {
  id: number
  dateNumber: number
  scheduledDate: string
  status: string
}

interface DateAwardsResponse {
  gameDate: GameDate
  awards: {
    varon: { player: Player; eliminations: number }[]
    gay: { player: Player; eliminations: number }[]
    podio: Player[]
    mesaFinal: Player[]
    sieteYDos: Player[]
    faltas: Player[]
  }
}

export default function FechaPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [selectedGameDateId, setSelectedGameDateId] = useState<number | null>(null)

  // Get active tournament
  const {
    tournament: activeTournament,
    isLoading: tournamentLoading
  } = useActiveTournament({
    refreshInterval: 60000
  })

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/')
    }
  }, [user, loading, router])

  // Fetch available game dates from active tournament
  const { data: gameDates, isLoading: gameDatesLoading } = useSWR<GameDate[]>(
    user && activeTournament ? `/api/tournaments/${activeTournament.id}/dates` : null,
    fetcher
  )

  const availableGameDates = gameDates?.filter(gd =>
    gd.status === 'completed' || gd.status === 'in_progress'
  ) || []

  // Set default selected game date to the latest one
  useEffect(() => {
    if (availableGameDates.length > 0 && !selectedGameDateId) {
      setSelectedGameDateId(availableGameDates[0].id)
    }
  }, [availableGameDates, selectedGameDateId])

  // Fetch date awards - mismo endpoint que funciona en Stats
  const { data: awardsData, error: awardsError, isLoading: awardsLoading } = useSWR<DateAwardsResponse>(
    user && selectedGameDateId ? `/api/stats/date-awards/${selectedGameDateId}` : null,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true
    }
  )

  if (loading || tournamentLoading || gameDatesLoading || awardsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-poker-dark via-black to-poker-dark flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 text-poker-red animate-spin" />
          <p className="text-white">Cargando resultados...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!activeTournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-poker-dark via-black to-poker-dark flex items-center justify-center px-4">
        <Card className="admin-card p-6 text-center max-w-sm">
          <div className="flex flex-col items-center gap-4">
            <CalendarCheck className="w-10 h-10 text-white/40" />
            <p className="text-white/70">No hay torneo activo</p>
            <p className="text-white/50 text-sm">
              Los resultados se mostrarán cuando haya un torneo en curso.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  if (awardsError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-poker-dark via-black to-poker-dark flex items-center justify-center px-4">
        <Card className="admin-card p-6 text-center max-w-sm">
          <div className="flex flex-col items-center gap-4">
            <ShieldAlert className="w-10 h-10 text-red-400" />
            <p className="text-red-400">No se pudieron cargar los resultados de la fecha.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-admin-primary"
            >
              Reintentar
            </button>
          </div>
        </Card>
      </div>
    )
  }

  const awards = awardsData?.awards
  const gameDate = awardsData?.gameDate

  return (
    <div className="min-h-screen bg-gradient-to-br from-poker-dark via-black to-poker-dark pb-24 pt-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4">
        {/* Header */}
        <header className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-white/60">
                Torneo #{activeTournament.number} · {activeTournament.name}
              </p>
              <h1 className="mt-2 text-2xl font-bold text-white">
                Fecha {gameDate?.dateNumber || '—'}
              </h1>
              <p className="mt-1 text-sm text-white/70">
                Premios y resultados de la fecha.
              </p>
            </div>
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-full bg-poker-red/20">
              <CalendarCheck className="h-6 w-6 text-poker-red" />
            </div>
          </div>
        </header>

        {/* Game Date Selector */}
        {availableGameDates.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="block text-xs uppercase tracking-[0.2em] text-white/60 mb-2">
              Seleccionar Fecha
            </label>
            <select
              value={selectedGameDateId || ''}
              onChange={(e) => setSelectedGameDateId(Number(e.target.value))}
              className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white focus:border-poker-red/60 focus:outline-none focus:ring-2 focus:ring-poker-red/20"
            >
              {availableGameDates.map((gd) => (
                <option key={gd.id} value={gd.id} className="bg-poker-dark">
                  Fecha {gd.dateNumber} - {new Date(gd.scheduledDate).toLocaleDateString('es-EC')}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Content - Mismo formato que Stats/Premios */}
        {awards ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Podio */}
            <AwardCard
              title="Podio"
              description="Top 3 de la fecha"
              icon="medal"
              accentColor="amber"
              players={awards.podio.map(p => ({ player: p }))}
            />

            {/* Varón de la Noche */}
            <AwardCard
              title="Varón de la Noche"
              description="Mayor cantidad de eliminaciones"
              icon="trophy"
              accentColor="red"
              players={awards.varon.map(v => ({ player: v.player, value: v.eliminations }))}
              valueLabel="Elims"
            />

            {/* Mesa Final */}
            <AwardCard
              title="Mesa Final"
              description="Posiciones 1 a 9"
              icon="users"
              accentColor="emerald"
              players={awards.mesaFinal.map(p => ({ player: p }))}
            />

            {/* 7/2 */}
            <AwardCard
              title="7/2"
              description="Primeros eliminados"
              icon="target"
              accentColor="rose"
              players={awards.sieteYDos.map(p => ({ player: p }))}
            />

            {/* Faltas */}
            <AwardCard
              title="Faltas"
              description="Jugadores ausentes"
              icon="userx"
              accentColor="rose"
              players={awards.faltas.map(p => ({ player: p }))}
            />
          </div>
        ) : (
          <Card className="admin-card p-8 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-700/50">
                <CalendarCheck className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Sin resultados</h3>
              <p className="text-gray-400 text-sm">
                No hay datos disponibles para esta fecha.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
