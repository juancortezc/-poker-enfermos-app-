'use client'

interface TournamentCardProps {
  tournamentNumber: number
  nextDate?: string // "15 de Enero"
}

export function TournamentCard({ tournamentNumber, nextDate }: TournamentCardProps) {
  return (
    <div
      className="p-4 pt-5 rounded-2xl text-center"
      style={{
        background: 'linear-gradient(90deg, rgba(26, 26, 26, 0.95) 0%, rgba(64, 64, 64, 0.85) 100%)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Tournament Title */}
      <h2
        className="font-extrabold"
        style={{
          fontSize: '28px',
          color: 'var(--cp-on-surface)',
          letterSpacing: '0.02em',
        }}
      >
        Torneo {tournamentNumber}
      </h2>

      {/* Next Date */}
      {nextDate && (
        <p
          className="mt-2"
          style={{
            fontSize: 'var(--cp-body-size)',
            color: 'var(--cp-on-surface-variant)',
          }}
        >
          Próxima Fecha: {nextDate}
        </p>
      )}
    </div>
  )
}

export default TournamentCard
