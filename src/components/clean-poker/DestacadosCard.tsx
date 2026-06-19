'use client'

import Image from 'next/image'
import useSWR from 'swr'
import { useActiveTournament } from '@/hooks/useActiveTournament'

interface PlayerRanking {
  playerId: string
  playerName: string
  playerPhoto?: string
  positionsChanged: number
}

interface Elimination {
  eliminatedPlayerId: string
  eliminatorPlayerId: string | null
  position: number
  eliminatedPlayer: { firstName: string; lastName: string; photoUrl?: string }
  eliminatorPlayer: { firstName: string; lastName: string; photoUrl?: string } | null
}

interface DestacadosCardProps {
  rankings: PlayerRanking[]
}

function shortName(full: string) {
  const p = full.split(' ').filter(Boolean)
  return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0]
}

function MiniAvatar({ photoUrl, name, size = 28 }: { photoUrl?: string; name: string; size?: number }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        overflow: 'hidden', flexShrink: 0,
        background: 'rgba(255,255,255,0.10)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      {photoUrl ? (
        <Image src={photoUrl} alt={name} width={size} height={size} className="object-cover w-full h-full" unoptimized />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
            {name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
          </span>
        </div>
      )}
    </div>
  )
}

function Row({ photo, name, label, stat, statColor }: {
  photo?: string; name: string; label: string; stat: string; statColor: string
}) {
  return (
    <div className="flex items-center gap-2">
      <MiniAvatar photoUrl={photo} name={name} size={28} />
      <div className="flex-1 min-w-0">
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.80)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
          {shortName(name)}
        </span>
        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.38)' }}>{label}</span>
      </div>
      <span style={{ fontSize: '11px', fontWeight: 700, color: statColor, flexShrink: 0 }}>{stat}</span>
    </div>
  )
}

export function DestacadosCard({ rankings }: DestacadosCardProps) {
  const { data: tournamentData } = useActiveTournament({ refreshInterval: 300000 })
  const lastDateId = tournamentData?.stats?.lastCompletedDate?.id
  const lastDateNumber = tournamentData?.stats?.lastCompletedDate?.dateNumber

  const { data: eliminations } = useSWR<Elimination[]>(
    lastDateId ? `/api/eliminations/game-date/${lastDateId}` : null,
    { dedupingInterval: 60000 }
  )

  // From rankings: biggest gainer and loser
  const sorted = [...rankings].filter(r => r.positionsChanged !== 0).sort((a, b) => b.positionsChanged - a.positionsChanged)
  const topGainer = sorted[0]
  const topLoser = sorted[sorted.length - 1]?.positionsChanged < 0 ? sorted[sorted.length - 1] : null

  // From eliminations: first out (highest position number) + most kills
  const firstOut = eliminations?.length
    ? eliminations.reduce((max, e) => e.position > max.position ? e : max, eliminations[0])
    : null

  const killMap: Record<string, { count: number; name: string; photo?: string }> = {}
  eliminations?.forEach(e => {
    if (e.eliminatorPlayerId && e.eliminatorPlayer) {
      const id = e.eliminatorPlayerId
      const full = `${e.eliminatorPlayer.firstName} ${e.eliminatorPlayer.lastName}`
      killMap[id] = { count: (killMap[id]?.count ?? 0) + 1, name: full, photo: e.eliminatorPlayer.photoUrl }
    }
  })
  const topKiller = Object.values(killMap).sort((a, b) => b.count - a.count)[0] ?? null

  const hasAnyData = topGainer || topLoser || firstOut || topKiller
  if (!hasAnyData) return null

  return (
    <div
      style={{
        borderRadius: '5px',
        padding: '10px 12px',
        background: 'linear-gradient(135deg, #180410 0%, #200812 50%, #180410 100%)',
        border: '1px solid rgba(200,30,70,0.18)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.55), 0 0 28px rgba(160,10,40,0.12)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.50)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Destacados
        </span>
        {lastDateNumber && (
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.28)' }}>Fecha {lastDateNumber}</span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {topGainer && (
          <Row
            photo={topGainer.playerPhoto}
            name={topGainer.playerName}
            label="mayor ascenso"
            stat={`+${topGainer.positionsChanged}`}
            statColor="#4CAF50"
          />
        )}
        {topLoser && (
          <Row
            photo={topLoser.playerPhoto}
            name={topLoser.playerName}
            label="mayor caída"
            stat={`${topLoser.positionsChanged}`}
            statColor="#E53935"
          />
        )}
        {firstOut && (
          <Row
            photo={firstOut.eliminatedPlayer.photoUrl}
            name={`${firstOut.eliminatedPlayer.firstName} ${firstOut.eliminatedPlayer.lastName}`}
            label="primero eliminado"
            stat={`#${firstOut.position}`}
            statColor="rgba(255,255,255,0.45)"
          />
        )}
        {topKiller && (
          <Row
            photo={topKiller.photo}
            name={topKiller.name}
            label="más eliminaciones"
            stat={`${topKiller.count} kills`}
            statColor="#E8830A"
          />
        )}
      </div>
    </div>
  )
}

export default DestacadosCard
