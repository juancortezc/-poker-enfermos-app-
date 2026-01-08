'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { ChevronDown } from 'lucide-react'

interface Player {
  firstName: string
  lastName: string
  isActive: boolean
  photoUrl?: string
  aliases: string[]
}

interface TournamentWinner {
  tournamentNumber: number
  champion: Player
  runnerUp: Player
  thirdPlace: Player
  siete: Player
  dos: Player
}

export default function CPTorneosTab() {
  const [tournaments, setTournaments] = useState<TournamentWinner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTournament, setSelectedTournament] = useState<number | 'all'>('all')
  const [selectedChampion, setSelectedChampion] = useState<string | 'all'>('all')
  const [selectedPlayer, setSelectedPlayer] = useState<string | 'all'>('all')
  const tournamentRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  useEffect(() => {
    fetchTournaments()
  }, [])

  const fetchTournaments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/tournaments/winners')

      if (!response.ok) {
        throw new Error('Error al cargar torneos')
      }

      const result = await response.json()

      if (result.success) {
        const sortedTournaments = result.data.sort((a: TournamentWinner, b: TournamentWinner) =>
          b.tournamentNumber - a.tournamentNumber
        )
        setTournaments(sortedTournaments)
      } else {
        throw new Error(result.error || 'Error desconocido')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const formatPlayerName = (player: Player) => {
    return `${player.firstName} ${player.lastName}`
  }

  const getPlayerAlias = (player?: Player) => {
    if (!player) return ''
    return player.aliases && player.aliases.length > 0 ? player.aliases[0] : ''
  }

  const handleTournamentSelect = (value: string) => {
    if (value === 'all') {
      setSelectedTournament('all')
    } else {
      const tournamentNum = parseInt(value)
      setSelectedTournament(tournamentNum)
      setSelectedChampion('all')
      setSelectedPlayer('all')
      // Scroll to the selected tournament
      setTimeout(() => {
        const ref = tournamentRefs.current.get(tournamentNum)
        if (ref) {
          ref.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    }
  }

  const handleChampionSelect = (value: string) => {
    setSelectedChampion(value)
    setSelectedTournament('all')
    setSelectedPlayer('all')
  }

  const handlePlayerSelect = (value: string) => {
    setSelectedPlayer(value)
    setSelectedTournament('all')
    setSelectedChampion('all')
  }

  // Get unique champions for the filter
  const uniqueChampions = tournaments.reduce((acc, t) => {
    const key = `${t.champion.firstName} ${t.champion.lastName}`
    if (!acc.find(c => `${c.firstName} ${c.lastName}` === key)) {
      acc.push(t.champion)
    }
    return acc
  }, [] as Player[]).sort((a, b) => a.firstName.localeCompare(b.firstName))

  // Get all unique players (from all positions) for the player filter
  const uniquePlayers = tournaments.reduce((acc, t) => {
    const players = [t.champion, t.runnerUp, t.thirdPlace, t.siete, t.dos]
    players.forEach(player => {
      const key = `${player.firstName} ${player.lastName}`
      if (!acc.find(p => `${p.firstName} ${p.lastName}` === key)) {
        acc.push(player)
      }
    })
    return acc
  }, [] as Player[]).sort((a, b) => a.firstName.localeCompare(b.firstName))

  // Helper to check if player is in any position of a tournament
  const playerInTournament = (t: TournamentWinner, playerName: string) => {
    return (
      `${t.champion.firstName} ${t.champion.lastName}` === playerName ||
      `${t.runnerUp.firstName} ${t.runnerUp.lastName}` === playerName ||
      `${t.thirdPlace.firstName} ${t.thirdPlace.lastName}` === playerName ||
      `${t.siete.firstName} ${t.siete.lastName}` === playerName ||
      `${t.dos.firstName} ${t.dos.lastName}` === playerName
    )
  }

  // Filter tournaments
  let filteredTournaments = tournaments
  if (selectedTournament !== 'all') {
    filteredTournaments = tournaments.filter(t => t.tournamentNumber === selectedTournament)
  } else if (selectedChampion !== 'all') {
    filteredTournaments = tournaments.filter(t =>
      `${t.champion.firstName} ${t.champion.lastName}` === selectedChampion
    )
  } else if (selectedPlayer !== 'all') {
    filteredTournaments = tournaments.filter(t => playerInTournament(t, selectedPlayer))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div style={{ color: 'var(--cp-on-surface-muted)' }}>Cargando torneos...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        <p style={{ color: '#E53935', fontSize: 'var(--cp-body-size)' }}>
          Error: {error}
        </p>
        <button
          onClick={fetchTournaments}
          className="mt-4 px-4 py-2 rounded-lg font-medium"
          style={{ background: '#E53935', color: 'white' }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (!tournaments.length) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-body-size)' }}>
          No hay datos de torneos historicos
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex justify-center gap-2 flex-wrap">
        {/* Tournament Filter */}
        <div className="relative">
          <select
            value={selectedTournament}
            onChange={(e) => handleTournamentSelect(e.target.value)}
            className="appearance-none rounded px-3 py-2 pr-8 font-medium min-w-[140px] cursor-pointer transition-all text-sm"
            style={{
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
              color: 'var(--cp-on-surface)',
            }}
          >
            <option value="all" style={{ background: '#1a1a1a' }}>
              Torneo
            </option>
            {tournaments.map(t => (
              <option key={t.tournamentNumber} value={t.tournamentNumber} style={{ background: '#1a1a1a' }}>
                T{t.tournamentNumber}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--cp-on-surface-muted)' }}
          />
        </div>

        {/* Champion Filter */}
        <div className="relative">
          <select
            value={selectedChampion}
            onChange={(e) => handleChampionSelect(e.target.value)}
            className="appearance-none rounded px-3 py-2 pr-8 font-medium min-w-[140px] cursor-pointer transition-all text-sm"
            style={{
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
              color: 'var(--cp-on-surface)',
            }}
          >
            <option value="all" style={{ background: '#1a1a1a' }}>
              Campeon
            </option>
            {uniqueChampions.map(c => (
              <option key={`${c.firstName}-${c.lastName}`} value={`${c.firstName} ${c.lastName}`} style={{ background: '#1a1a1a' }}>
                {c.firstName} {c.lastName.charAt(0)}.
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--cp-on-surface-muted)' }}
          />
        </div>

        {/* Player Filter */}
        <div className="relative">
          <select
            value={selectedPlayer}
            onChange={(e) => handlePlayerSelect(e.target.value)}
            className="appearance-none rounded px-3 py-2 pr-8 font-medium min-w-[140px] cursor-pointer transition-all text-sm"
            style={{
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
              color: 'var(--cp-on-surface)',
            }}
          >
            <option value="all" style={{ background: '#1a1a1a' }}>
              Jugador
            </option>
            {uniquePlayers.map(p => (
              <option key={`player-${p.firstName}-${p.lastName}`} value={`${p.firstName} ${p.lastName}`} style={{ background: '#1a1a1a' }}>
                {p.firstName} {p.lastName.charAt(0)}.
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--cp-on-surface-muted)' }}
          />
        </div>
      </div>

      {/* Tournament Cards */}
      <div className="space-y-6">
        {filteredTournaments.map((tournament) => (
          <div
            key={tournament.tournamentNumber}
            ref={(el) => {
              if (el) tournamentRefs.current.set(tournament.tournamentNumber, el)
            }}
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
            }}
          >
          {/* Tournament Header with Champion */}
          <div className="relative p-4">
            {/* Tournament Number Badge */}
            <div className="absolute top-4 right-4 flex items-center gap-1">
              <span
                className="text-xs uppercase tracking-wider"
                style={{ color: 'var(--cp-on-surface-muted)' }}
              >
                Torneo
              </span>
              <span
                className="text-2xl font-bold"
                style={{ color: 'var(--cp-on-surface)' }}
              >
                {tournament.tournamentNumber}
              </span>
            </div>

            {/* Champion Section */}
            <div className="flex items-center gap-4">
              {/* Champion Photo */}
              <div className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 border-yellow-500/50">
                {tournament.champion.photoUrl ? (
                  <Image
                    src={tournament.champion.photoUrl}
                    alt={formatPlayerName(tournament.champion)}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-3xl"
                    style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
                  >
                    🏆
                  </div>
                )}
              </div>

              {/* Champion Info */}
              <div className="flex-1">
                <span
                  className="text-xs uppercase tracking-wider"
                  style={{ color: '#fbbf24' }}
                >
                  Campeon
                </span>
                <h3
                  className="font-bold"
                  style={{
                    fontSize: 'var(--cp-body-size)',
                    color: 'var(--cp-on-surface)',
                  }}
                >
                  {formatPlayerName(tournament.champion)}
                </h3>
                {getPlayerAlias(tournament.champion) && (
                  <p style={{ fontSize: 'var(--cp-caption-size)', color: '#f97316' }}>
                    ({getPlayerAlias(tournament.champion)})
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Positions Grid */}
          <div
            className="grid grid-cols-2 gap-px"
            style={{ background: 'var(--cp-surface-border)' }}
          >
            {/* Runner Up */}
            <PositionCard
              badge="2"
              badgeColor="#94a3b8"
              player={tournament.runnerUp}
            />

            {/* Third Place */}
            <PositionCard
              badge="3"
              badgeColor="#f97316"
              player={tournament.thirdPlace}
            />

            {/* Siete */}
            <PositionCard
              badge="7"
              badgeColor="#ec4899"
              player={tournament.siete}
              isMalazo
            />

            {/* Dos */}
            <PositionCard
              badge="2"
              badgeColor="#ec4899"
              player={tournament.dos}
              isMalazo
            />
          </div>
        </div>
        ))}
      </div>
    </div>
  )
}

interface PositionCardProps {
  badge: string
  badgeColor: string
  player: Player
  isMalazo?: boolean
}

function PositionCard({ badge, badgeColor, player, isMalazo }: PositionCardProps) {
  const formatName = (p: Player) => `${p.firstName} ${p.lastName}`

  return (
    <div
      className="flex items-center gap-3 p-3"
      style={{ background: 'var(--cp-surface)' }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
        style={{
          background: isMalazo ? badgeColor : `${badgeColor}30`,
          color: isMalazo ? '#fff' : badgeColor
        }}
      >
        {badge}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="font-medium truncate"
          style={{
            fontSize: 'var(--cp-body-size)',
            color: 'var(--cp-on-surface)',
          }}
        >
          {formatName(player)}
        </p>
      </div>
    </div>
  )
}
