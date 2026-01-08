'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Award, Loader2, Trophy, UserX, Medal, Users, Crown, Target, CalendarX, ChevronDown, Zap } from 'lucide-react'
import Image from 'next/image'

interface AwardPlayer {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string | null
}

interface Tournament {
  id: number
  number: number
  name: string
}

interface AwardsResponse {
  tournament: Tournament
  awards: {
    varon: { player: AwardPlayer; eliminations: number }[]
    gay: { player: AwardPlayer; eliminations: number }[]
    podios: { player: AwardPlayer; count: number }[]
    sieteYDos: { player: AwardPlayer; count: number }[]
    sinPodio: AwardPlayer[]
    faltas: { player: AwardPlayer; count: number }[]
    mesasFinales: { player: AwardPlayer; count: number }[]
    victorias: { player: AwardPlayer; count: number }[]
  }
}

interface ParentChildPlayer {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string | null
  role: string
}

interface ParentChildRelation {
  id: number
  eliminationCount: number
  firstElimination: string
  lastElimination: string
  parentPlayer: ParentChildPlayer
  childPlayer: ParentChildPlayer
}

interface ParentChildResponse {
  tournament: Tournament
  parentChildRelations: ParentChildRelation[]
  totalRelations: number
}

interface TournamentOption {
  id: number
  number: number
  name: string
  status: string
}

interface CPPremiacionTabProps {
  tournamentId?: number
}

const fetcher = async (url: string) => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' }
  })
  if (!response.ok) throw new Error('Error fetching data')
  return response.json()
}

type SubTabType = 'premios' | 'stats' | 'ph'

const SUB_TABS = [
  { id: 'premios' as const, label: 'Premios' },
  { id: 'stats' as const, label: 'Stats' },
  { id: 'ph' as const, label: 'P&H' },
]

export default function CPPremiacionTab({ tournamentId }: CPPremiacionTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('premios')
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(tournamentId ?? null)
  const [showSelector, setShowSelector] = useState(false)

  // Fetch all tournaments for the selector
  const { data: tournaments } = useSWR<TournamentOption[]>(
    '/api/tournaments',
    fetcher
  )

  // Set default tournament when tournaments load
  useEffect(() => {
    if (tournaments && tournaments.length > 0 && selectedTournamentId === null) {
      // Default to the first (most recent) tournament
      setSelectedTournamentId(tournaments[0].id)
    }
  }, [tournaments, selectedTournamentId])

  const effectiveTournamentId = selectedTournamentId ?? tournamentId ?? 1

  const { data: awardsData, isLoading: awardsLoading } = useSWR<AwardsResponse>(
    effectiveTournamentId && (activeSubTab === 'premios' || activeSubTab === 'stats')
      ? `/api/stats/awards/${effectiveTournamentId}`
      : null,
    fetcher,
    { refreshInterval: 30000, revalidateOnFocus: true }
  )

  const { data: phData, isLoading: phLoading } = useSWR<ParentChildResponse>(
    effectiveTournamentId && activeSubTab === 'ph'
      ? `/api/stats/parent-child/${effectiveTournamentId}`
      : null,
    fetcher,
    { refreshInterval: 30000, revalidateOnFocus: true }
  )

  const isLoading = (activeSubTab === 'ph' && phLoading) || ((activeSubTab === 'premios' || activeSubTab === 'stats') && awardsLoading)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
            style={{
              borderColor: 'var(--cp-surface-border)',
              borderTopColor: '#E53935'
            }}
          />
          <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-caption-size)' }}>
            Cargando premiacion...
          </p>
        </div>
      </div>
    )
  }

  const awards = awardsData?.awards
  const selectedTournament = tournaments?.find(t => t.id === selectedTournamentId)
  const tournamentNumber = selectedTournament?.number ?? awardsData?.tournament?.number ?? effectiveTournamentId

  return (
    <div className="space-y-4">
      {/* Tournament Selector */}
      <div className="relative flex justify-center">
        <button
          onClick={() => setShowSelector(!showSelector)}
          className="flex items-center gap-2 px-4 py-2 transition-all"
          style={{
            background: 'var(--cp-surface)',
            border: '1px solid var(--cp-surface-border)',
            borderRadius: '4px',
          }}
        >
          <span style={{ fontSize: 'var(--cp-body-size)', color: 'var(--cp-on-surface)' }}>
            Torneo {tournamentNumber}
          </span>
          <ChevronDown
            size={16}
            style={{
              color: 'var(--cp-on-surface-muted)',
              transform: showSelector ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          />
        </button>

        {/* Dropdown */}
        {showSelector && tournaments && tournaments.length > 0 && (
          <div
            className="absolute top-full mt-2 w-48 overflow-hidden z-20"
            style={{
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              borderRadius: '4px',
            }}
          >
            {tournaments.map((tournament) => (
              <button
                key={tournament.id}
                onClick={() => {
                  setSelectedTournamentId(tournament.id)
                  setShowSelector(false)
                }}
                className="w-full px-4 py-2.5 text-left transition-colors hover:bg-white/5"
                style={{
                  fontSize: 'var(--cp-body-size)',
                  color: tournament.id === selectedTournamentId ? '#E53935' : 'var(--cp-on-surface)',
                  fontWeight: tournament.id === selectedTournamentId ? 600 : 400,
                  borderBottom: '1px solid var(--cp-surface-border)',
                }}
              >
                Torneo {tournament.number}
                {tournament.status === 'ACTIVO' && (
                  <span
                    className="ml-2 px-1.5 py-0.5 rounded text-xs"
                    style={{ background: 'rgba(229, 57, 53, 0.2)', color: '#E53935' }}
                  >
                    Activo
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CleanPoker Sub Tabs - text with red underline */}
      <div className="flex justify-center gap-8">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className="pb-2 transition-all duration-200"
            style={{
              fontSize: 'var(--cp-body-size)',
              fontWeight: activeSubTab === tab.id ? 700 : 400,
              color: activeSubTab === tab.id ? 'var(--cp-on-surface)' : 'var(--cp-on-surface-muted)',
              borderBottom: activeSubTab === tab.id ? '2px solid #E53935' : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Awards Content */}
      {awards && activeSubTab === 'premios' && (
        <div className="space-y-3">
          {/* Varon del Torneo */}
          <CPAwardCard
            title="Varon del Torneo"
            description="Mayor cantidad de eliminaciones"
            icon={<Trophy size={20} />}
            accentColor="#E53935"
            players={awards.varon.map(v => ({ player: v.player, value: v.eliminations }))}
            valueLabel="Elims"
          />

          {/* Gay del Torneo */}
          <CPAwardCard
            title="Gay del Torneo"
            description="Menor cantidad de eliminaciones"
            icon={<UserX size={20} />}
            accentColor="#AB47BC"
            players={awards.gay.map(g => ({ player: g.player, value: g.eliminations }))}
            valueLabel="Elims"
          />

          {/* Victorias */}
          <CPAwardCard
            title="Victorias"
            description="Mayor cantidad de 1er lugar"
            icon={<Crown size={20} />}
            accentColor="#FFB300"
            players={awards.victorias.map(v => ({ player: v.player, value: v.count }))}
            valueLabel="Wins"
          />

          {/* Podios */}
          <CPAwardCard
            title="Podios"
            description="Mayor cantidad de Top 3"
            icon={<Medal size={20} />}
            accentColor="#FFB300"
            players={awards.podios.map(p => ({ player: p.player, value: p.count }))}
            valueLabel="Podios"
          />
        </div>
      )}

      {awards && activeSubTab === 'stats' && (
        <div className="space-y-3">
          {/* Ultimos */}
          <CPAwardCard
            title="Ultimos"
            description="Ultimo lugar"
            icon={<Target size={20} />}
            accentColor="#EC407A"
            players={awards.sieteYDos.map(s => ({ player: s.player, value: s.count }))}
            valueLabel="Veces"
          />

          {/* Mesas Finales */}
          <CPAwardCard
            title="Mesas Finales"
            description="Mayor cantidad en Top 9"
            icon={<Users size={20} />}
            accentColor="#66BB6A"
            players={awards.mesasFinales.map(m => ({ player: m.player, value: m.count }))}
            valueLabel="Veces"
          />

          {/* Sin Podio */}
          <CPAwardCard
            title="Sin Podio"
            description="Nunca en el Top 3"
            icon={<CalendarX size={20} />}
            accentColor="#42A5F5"
            players={awards.sinPodio.map(p => ({ player: p }))}
          />

          {/* Faltas */}
          <CPAwardCard
            title="Faltas"
            description="Mayor cantidad de ausencias"
            icon={<UserX size={20} />}
            accentColor="#EC407A"
            players={awards.faltas.map(f => ({ player: f.player, value: f.count }))}
            valueLabel="Faltas"
          />
        </div>
      )}

      {/* P&H Content */}
      {activeSubTab === 'ph' && (
        <div className="space-y-3">
          {phData?.parentChildRelations && phData.parentChildRelations.length > 0 ? (
            <>
              {phData.parentChildRelations.map((relation) => (
                <CPParentChildCard key={relation.id} relation={relation} />
              ))}
              <p
                className="text-center pt-2"
                style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-muted)' }}
              >
                {phData.parentChildRelations.length} relacion{phData.parentChildRelations.length !== 1 ? 'es' : ''} activa{phData.parentChildRelations.length !== 1 ? 's' : ''}
              </p>
            </>
          ) : (
            <div
              className="p-8 text-center"
              style={{
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '4px',
              }}
            >
              <Users size={32} className="mx-auto mb-3" style={{ color: 'var(--cp-on-surface-muted)' }} />
              <p style={{ color: 'var(--cp-on-surface)', fontSize: 'var(--cp-body-size)' }}>
                Sin relaciones padre-hijo
              </p>
              <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-caption-size)' }}>
                Ningun enfermo ha eliminado 3+ veces al mismo jugador
              </p>
            </div>
          )}
        </div>
      )}

      {!awards && activeSubTab !== 'ph' && (
        <div
          className="p-8 text-center"
          style={{
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '4px',
          }}
        >
          <Award size={32} className="mx-auto mb-3" style={{ color: 'var(--cp-on-surface-muted)' }} />
          <p style={{ color: 'var(--cp-on-surface)', fontSize: 'var(--cp-body-size)' }}>
            No hay datos disponibles
          </p>
          <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-caption-size)' }}>
            Los premios se mostraran cuando haya datos del torneo
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================
// CP Award Card Component
// ============================================
interface CPAwardCardProps {
  title: string
  description: string
  icon: React.ReactNode
  accentColor: string
  players: Array<{
    player: AwardPlayer
    value?: number
  }>
  valueLabel?: string
}

function CPAwardCard({
  title,
  description,
  icon,
  accentColor,
  players,
  valueLabel
}: CPAwardCardProps) {
  if (players.length === 0) return null

  return (
    <div
      className="overflow-hidden"
      style={{
        background: 'var(--cp-surface)',
        border: '1px solid var(--cp-surface-border)',
        borderRadius: '4px',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{
          background: `linear-gradient(90deg, ${accentColor}12 0%, transparent 100%)`,
          borderBottom: '1px solid var(--cp-surface-border)',
        }}
      >
        <div
          className="w-7 h-7 flex items-center justify-center"
          style={{
            background: `${accentColor}15`,
            borderRadius: '4px',
          }}
        >
          <span style={{ color: accentColor }}>{icon}</span>
        </div>
        <div>
          <p style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {title}
          </p>
          <p style={{ fontSize: '10px', color: 'var(--cp-on-surface-muted)' }}>
            {description}
          </p>
        </div>
      </div>

      {/* Players */}
      <div style={{ background: 'var(--cp-background)' }}>
        {players.slice(0, 5).map((item, index) => (
          <div
            key={item.player.id}
            className="px-4 py-2 flex items-center gap-3"
            style={{
              borderBottom: index < Math.min(players.length, 5) - 1 ? '1px solid var(--cp-surface-border)' : 'none',
            }}
          >
            {/* Avatar */}
            <div
              className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center shrink-0"
              style={{
                background: item.player.photoUrl ? 'transparent' : 'var(--cp-surface)',
                border: '1px solid var(--cp-surface-border)',
              }}
            >
              {item.player.photoUrl ? (
                <Image
                  src={item.player.photoUrl}
                  alt={`${item.player.firstName} ${item.player.lastName}`}
                  width={32}
                  height={32}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--cp-on-surface-variant)',
                    fontWeight: 600,
                  }}
                >
                  {item.player.firstName[0]}{item.player.lastName[0]}
                </span>
              )}
            </div>

            {/* Name */}
            <p
              className="flex-1 truncate"
              style={{
                fontSize: 'var(--cp-body-size)',
                color: 'var(--cp-on-surface)',
                fontWeight: 400,
              }}
            >
              {item.player.firstName} {item.player.lastName}
            </p>

            {/* Value */}
            {item.value !== undefined && (
              <div className="flex items-center gap-1">
                <span
                  style={{
                    fontSize: 'var(--cp-body-size)',
                    fontWeight: 700,
                    color: 'var(--cp-on-surface)',
                  }}
                >
                  {item.value}
                </span>
                {valueLabel && (
                  <span
                    style={{
                      fontSize: '9px',
                      color: 'var(--cp-on-surface-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {valueLabel}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* More indicator */}
      {players.length > 5 && (
        <div
          className="px-4 py-2 text-center"
          style={{
            background: 'var(--cp-background)',
            borderTop: '1px solid var(--cp-surface-border)',
          }}
        >
          <span style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-muted)' }}>
            +{players.length - 5} mas
          </span>
        </div>
      )}
    </div>
  )
}

// ============================================
// CP Parent Child Card Component
// ============================================
interface CPParentChildCardProps {
  relation: ParentChildRelation
}

function CPParentChildCard({ relation }: CPParentChildCardProps) {
  const { parentPlayer, childPlayer, eliminationCount } = relation

  const getInitials = (player: ParentChildPlayer) => {
    return `${player.firstName[0] || ''}${player.lastName[0] || ''}`.toUpperCase()
  }

  const PlayerAvatar = ({ player, label, color }: { player: ParentChildPlayer; label: string; color: string }) => (
    <div className="flex flex-col items-center gap-1">
      <span
        style={{
          fontSize: '9px',
          color: 'var(--cp-on-surface-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {label}
      </span>
      <div
        className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center"
        style={{
          background: player.photoUrl ? 'transparent' : 'var(--cp-surface)',
          border: `2px solid ${color}`,
        }}
      >
        {player.photoUrl ? (
          <Image
            src={player.photoUrl}
            alt={`${player.firstName} ${player.lastName}`}
            width={40}
            height={40}
            className="object-cover w-full h-full"
          />
        ) : (
          <span
            style={{
              fontSize: '11px',
              color: 'var(--cp-on-surface-variant)',
              fontWeight: 600,
            }}
          >
            {getInitials(player)}
          </span>
        )}
      </div>
      <span
        style={{
          fontSize: 'var(--cp-caption-size)',
          color: 'var(--cp-on-surface)',
          fontWeight: 500,
        }}
      >
        {player.firstName}
      </span>
    </div>
  )

  return (
    <div
      className="overflow-hidden"
      style={{
        background: 'var(--cp-surface)',
        border: '1px solid var(--cp-surface-border)',
        borderRadius: '4px',
      }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{
          background: 'linear-gradient(90deg, rgba(229, 57, 53, 0.08) 0%, transparent 100%)',
        }}
      >
        {/* Parent */}
        <PlayerAvatar player={parentPlayer} label="Padre" color="#E53935" />

        {/* Count */}
        <div className="flex flex-col items-center">
          <span
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--cp-on-surface)',
              lineHeight: 1,
            }}
          >
            {eliminationCount}
          </span>
          <span
            className="px-2 py-0.5 mt-1"
            style={{
              fontSize: '9px',
              color: '#E53935',
              background: 'rgba(229, 57, 53, 0.15)',
              borderRadius: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 600,
            }}
          >
            Elims
          </span>
        </div>

        {/* Child */}
        <PlayerAvatar player={childPlayer} label="Hijo" color="#EC407A" />
      </div>
    </div>
  )
}
