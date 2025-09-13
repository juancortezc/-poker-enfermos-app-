interface LiveStatsProps {
  playersRemaining: number
  totalPlayers: number
  winnerPoints: number
  eliminationsCount: number
}

export function LiveStats({ 
  playersRemaining, 
  totalPlayers, 
  winnerPoints, 
  eliminationsCount 
}: LiveStatsProps) {
  const stats = [
    {
      label: 'Jugando',
      value: playersRemaining,
      icon: '👥',
      color: 'text-orange-400'
    },
    {
      label: 'Total',
      value: totalPlayers,
      icon: '🎯',
      color: 'text-white'
    },
    {
      label: 'PTS Ganador',
      value: winnerPoints,
      icon: '🏆',
      color: 'text-yellow-400'
    }
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat, index) => (
        <div key={index} className="bg-poker-card border border-white/10 rounded-lg p-4 text-center">
          <div className="text-2xl mb-2">{stat.icon}</div>
          <div className={`text-2xl font-bold mb-1 ${stat.color}`}>
            {stat.value}
          </div>
          <div className="text-xs text-poker-muted">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  )
}