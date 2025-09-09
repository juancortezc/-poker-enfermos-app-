interface GameStatsCardsProps {
  activePlayers: number
  totalPlayers: number
  winnerPoints: number
}

export function GameStatsCards({ activePlayers, totalPlayers, winnerPoints }: GameStatsCardsProps) {
  const stats = [
    {
      label: 'Jugando',
      value: activePlayers,
      highlight: true // Destacar el número de jugadores activos
    },
    {
      label: 'Jugadores', 
      value: totalPlayers,
      highlight: false
    },
    {
      label: 'Pts Max',
      value: winnerPoints,
      highlight: false
    }
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-poker-card rounded-lg p-4 text-center border border-white/5">
          <div className="text-sm text-poker-muted mb-1">
            {stat.label}
          </div>
          <div className={`text-2xl font-bold ${
            stat.highlight ? 'text-poker-red' : 'text-white'
          }`}>
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  )
}