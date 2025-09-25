'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Award, Medal, Trophy } from 'lucide-react'
import { buildAuthHeaders } from '@/lib/client-auth'
import type { UserRole } from '@prisma/client'

interface PlayerDetail {
  id: string
  firstName: string
  lastName: string
  role: UserRole
  aliases: string[]
  photoUrl?: string | null
  birthDate?: string | null
  phone?: string | null
  email?: string | null
  joinYear?: number | null
  inviter?: {
    id: string
    firstName: string
    lastName: string
  } | null
}

interface PodiumStatistics {
  firstPlaces: number
  secondPlaces: number
  thirdPlaces: number
  sietePositions: number
  dosPositions: number
  totalPodiums: number
  totalAppearances: number
}

interface TournamentHighlight {
  tournamentNumber: number
  position: 'champion' | 'runnerUp' | 'thirdPlace' | 'siete' | 'dos'
  positionText: string
}

interface EnfermoDetailProps {
  playerId: string
}

const personalInfoConfig: Array<{ label: string; key: keyof PlayerDetail }> = [
  { label: 'Cumpleaños', key: 'birthDate' },
  { label: 'Correo', key: 'email' },
  { label: 'Teléfono', key: 'phone' },
  { label: 'Año de ingreso', key: 'joinYear' }
]

export default function EnfermoDetail({ playerId }: EnfermoDetailProps) {
  const router = useRouter()
  const [player, setPlayer] = useState<PlayerDetail | null>(null)
  const [statistics, setStatistics] = useState<PodiumStatistics | null>(null)
  const [highlights, setHighlights] = useState<TournamentHighlight[]>([])
  const [loading, setLoading] = useState(true)
  const [daysWithoutVictoryLabel, setDaysWithoutVictoryLabel] = useState<string>('—')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [playerResponse, statsResponse, daysResponse] = await Promise.all([
          fetch(`/api/players/${playerId}`, { headers: buildAuthHeaders() }),
          fetch(`/api/players/${playerId}/podium-details`, { headers: buildAuthHeaders() }),
          fetch('/api/stats/days-without-victory/1', { headers: { 'Content-Type': 'application/json' } })
        ])

        if (!playerResponse.ok) {
          throw new Error('No se pudo cargar la información del jugador')
        }

        const playerData = await playerResponse.json()
        setPlayer(playerData)

        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          if (statsData?.success) {
            setStatistics(statsData.data.statistics)
            setHighlights(statsData.data.tournamentDetails)
          }
        }

        if (daysResponse.ok) {
          const daysData = await daysResponse.json()
          const target = Array.isArray(daysData?.players)
            ? daysData.players.find((p: { id: string }) => p.id === playerId)
            : null

          if (target) {
            if (target.hasNeverWon) {
              setDaysWithoutVictoryLabel('Nunca ha ganado')
            } else if (typeof target.daysWithoutVictory === 'number') {
              setDaysWithoutVictoryLabel(`${target.daysWithoutVictory}`)
            }
          }
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [playerId])

  const podiumRow = useMemo(() => {
    return [
      {
        key: 'champion',
        label: 'C',
        value: statistics?.firstPlaces ?? 0,
        Icon: Trophy,
        accent: 'text-yellow-300'
      },
      {
        key: 'runnerUp',
        label: 'S',
        value: statistics?.secondPlaces ?? 0,
        Icon: Medal,
        accent: 'text-slate-200'
      },
      {
        key: 'thirdPlace',
        label: 'T',
        value: statistics?.thirdPlaces ?? 0,
        Icon: Award,
        accent: 'text-amber-500'
      }
    ]
  }, [statistics])

  const extraRow = useMemo(() => {
    return [
      {
        key: 'siete',
        label: '7',
        value: statistics?.sietePositions ?? 0
      },
      {
        key: 'dos',
        label: '2',
        value: statistics?.dosPositions ?? 0
      },
      {
        key: 'podios',
        label: 'Total',
        value: statistics?.totalPodiums ?? 0
      }
    ]
  }, [statistics])

  const renderPersonalInfo = () => {
    if (!player) return null

    return personalInfoConfig.map(({ label, key }) => {
      let value: string | number | null | undefined = player[key]

    if (Array.isArray(value)) {
      value = value.length > 0 ? value[0] : null
    }

    if (key === 'birthDate' && typeof value === 'string') {
      const parsed = new Date(value)
      if (!Number.isNaN(parsed.getTime())) {
        value = parsed.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'long'
        })
      } else {
        value = null
      }
    }

    if (!value) {
      return (
        <div key={label} className="flex items-center justify-between text-sm text-white/40">
          <span>{label}</span>
          <span className="text-white/30">—</span>
          </div>
        )
      }

      return (
        <div key={label} className="flex items-center justify-between text-sm text-white/80">
          <span>{label}</span>
          <span className="text-white/90">{value}</span>
        </div>
      )
    })
  }

  const orderedHighlights = useMemo(() => {
    if (highlights.length === 0) return []
    const priority: Record<TournamentHighlight['position'], number> = {
      champion: 1,
      runnerUp: 2,
      thirdPlace: 3,
      siete: 4,
      dos: 5
    }

    return [...highlights]
      .sort((a, b) => {
        const priorityDiff = priority[a.position] - priority[b.position]
        if (priorityDiff !== 0) return priorityDiff
        return b.tournamentNumber - a.tournamentNumber
      })
      .map(detail => ({
        ...detail,
        displayLabel: detail.position === 'champion'
          ? 'Campeón'
          : detail.position === 'runnerUp'
            ? 'Subcampeón'
            : detail.position === 'thirdPlace'
              ? 'Tercer lugar'
              : detail.position === 'siete'
                ? '7'
                : '2'
      }))
  }, [highlights])

  if (loading) {
    return (
      <div className="min-h-screen bg-poker-dark pb-safe">
        <div className="mx-auto flex max-w-xl flex-col items-center justify-center px-4 py-20 text-center text-sm text-white/60">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-poker-red" />
          Cargando información...
        </div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-poker-dark pb-safe">
        <div className="mx-auto flex max-w-xl flex-col items-center justify-center px-4 py-20 text-center text-sm text-white/60">
          No pudimos encontrar este jugador.
        </div>
      </div>
    )
  }

  const initials = `${player.firstName?.[0] ?? ''}${player.lastName?.[0] ?? ''}`.toUpperCase()
  const aliasList = player.aliases || []

  return (
    <div className="min-h-screen bg-poker-dark pb-safe">
      <div className="mx-auto max-w-4xl space-y-6 px-3 py-4 sm:px-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>

        <div className="rounded-3xl border border-white/10 bg-poker-card/90 p-4 sm:p-6 shadow-[0_18px_45px_rgba(229,9,20,0.18)]">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="relative h-24 w-24 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-poker-red/40 to-black/40 sm:h-28 sm:w-28">
                {player.photoUrl ? (
                  <Image
                    src={player.photoUrl}
                    alt={`${player.firstName} ${player.lastName}`}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-white/70">
                    {initials || '??'}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white sm:text-3xl">
                  {player.firstName} {player.lastName}
                </h1>
                {aliasList.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {aliasList.map(alias => (
                      <span
                        key={alias}
                        className="rounded-full bg-poker-red/15 px-3 py-1 text-xs font-semibold text-orange-300"
                      >
                        “{alias}”
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-xs uppercase tracking-[0.3em] text-white/50">
                  Días sin ganar: <span className="text-white/90">{daysWithoutVictoryLabel}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              {podiumRow.map(({ key, label, value, Icon, accent }) => (
                <div
                  key={key}
                  className="flex flex-col items-center rounded-2xl border border-white/10 bg-black/40 px-3 py-4 text-center"
                >
                  <Icon className={`mb-2 h-6 w-6 ${accent}`} />
                  <span className="text-lg font-bold text-white">{value}</span>
                  <span className="mt-1 text-xs text-white/70">{label}</span>
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {extraRow.map(({ key, label, value }) => (
                <div
                  key={key}
                  className="flex flex-col items-center rounded-2xl border border-white/10 bg-black/40 px-3 py-4 text-center"
                >
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                    {label}
                  </div>
                  <span className="text-lg font-bold text-white">{value}</span>
                  <span className="mt-1 text-xs text-white/70">
                    {key === 'podios' ? 'Total Podios' : `Posiciones ${label}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-black/40 p-4 sm:p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/50">Datos personales</h2>
              <div className="mt-3 space-y-3">
                {renderPersonalInfo()}
                {player.inviter && (
                  <div className="flex items-center justify-between text-sm text-white/80">
                    <span>Invitado por</span>
                    <span className="text-white/90">
                      {player.inviter.firstName} {player.inviter.lastName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-black/40 p-4 sm:p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/50">Torneos destacados</h2>
              {orderedHighlights.length === 0 ? (
                <p className="mt-4 text-sm text-white/50">No hay registros de podios para este jugador.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {orderedHighlights.slice(0, 12).map((highlight) => {
                    const isSpecial = highlight.position === 'siete' || highlight.position === 'dos'
                    return (
                      <div
                        key={`${highlight.tournamentNumber}-${highlight.position}`}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white/80"
                      >
                        <span className={isSpecial ? 'text-pink-400 font-semibold' : 'font-semibold text-white'}>
                          Torneo #{highlight.tournamentNumber}
                        </span>
                        <span className="text-xs uppercase tracking-[0.3em] text-white/60">
                          {highlight.displayLabel}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
