import { Trophy, Award, Medal, Users, UserX, CalendarX, Target, Crown } from 'lucide-react'
import Image from 'next/image'

interface AwardPlayer {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string | null
}

interface AwardCardProps {
  title: string
  description: string
  icon: 'trophy' | 'award' | 'medal' | 'users' | 'userx' | 'calendar' | 'target' | 'crown'
  players: Array<{
    player: AwardPlayer
    value?: number
  }>
  valueLabel?: string
  accentColor?: 'red' | 'emerald' | 'amber' | 'rose' | 'purple' | 'blue'
}

const iconMap = {
  trophy: Trophy,
  award: Award,
  medal: Medal,
  users: Users,
  userx: UserX,
  calendar: CalendarX,
  target: Target,
  crown: Crown
}

const accentColors = {
  red: {
    bg: 'bg-poker-red/20',
    text: 'text-poker-red',
    border: 'border-poker-red/40',
    gradient: 'from-poker-red/10 via-poker-dark to-poker-dark'
  },
  emerald: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
    gradient: 'from-emerald-500/10 via-poker-dark to-poker-dark'
  },
  amber: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/40',
    gradient: 'from-amber-500/10 via-poker-dark to-poker-dark'
  },
  rose: {
    bg: 'bg-rose-500/20',
    text: 'text-rose-400',
    border: 'border-rose-500/40',
    gradient: 'from-rose-500/10 via-poker-dark to-poker-dark'
  },
  purple: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    border: 'border-purple-500/40',
    gradient: 'from-purple-500/10 via-poker-dark to-poker-dark'
  },
  blue: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/40',
    gradient: 'from-blue-500/10 via-poker-dark to-poker-dark'
  }
}

export default function AwardCard({
  title,
  description,
  icon,
  players,
  valueLabel,
  accentColor = 'red'
}: AwardCardProps) {
  const Icon = iconMap[icon]
  const colors = accentColors[accentColor]

  return (
    <div
      className={`rounded-3xl border ${colors.border} bg-gradient-to-br ${colors.gradient} p-5 shadow-[0_18px_40px_rgba(11,12,32,0.35)] transition-all hover:-translate-y-1 hover:border-opacity-60`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-white/60">{description}</p>
          <h3 className="mt-1 text-xl font-semibold text-white tracking-tight">{title}</h3>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${colors.bg}`}>
          <Icon className={`h-6 w-6 ${colors.text}`} />
        </div>
      </div>

      {/* Players List */}
      {players.length > 0 ? (
        <div className="space-y-3">
          {players.map((item, index) => (
            <div
              key={item.player.id}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
            >
              {/* Player Photo */}
              <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-white/10">
                {item.player.photoUrl ? (
                  <Image
                    src={item.player.photoUrl}
                    alt={`${item.player.firstName} ${item.player.lastName}`}
                    fill
                    loading="lazy"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-white/10 text-xs font-semibold text-white">
                    {item.player.firstName[0]}
                    {item.player.lastName[0]}
                  </div>
                )}
              </div>

              {/* Player Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {item.player.firstName} {item.player.lastName}
                </p>
                {index === 0 && players.length > 1 && (
                  <p className="text-xs text-white/50">Líder</p>
                )}
              </div>

              {/* Value */}
              {item.value !== undefined && (
                <div className={`flex flex-col items-end text-right px-3 py-1 rounded-lg ${colors.bg}`}>
                  <span className={`text-lg font-bold ${colors.text}`}>{item.value}</span>
                  {valueLabel && (
                    <span className="text-[10px] uppercase tracking-wider text-white/50">{valueLabel}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-sm text-white/55">No hay datos disponibles</p>
        </div>
      )}

      {/* Footer Count */}
      {players.length > 0 && (
        <div className="mt-4 text-center text-xs text-white/50">
          {players.length} jugador{players.length !== 1 ? 'es' : ''}
        </div>
      )}
    </div>
  )
}
