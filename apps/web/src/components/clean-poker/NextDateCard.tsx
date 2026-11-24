'use client'

interface NextDateCardProps {
  dateNumber: number // #8
  date: string // "15 de Enero"
}

export function NextDateCard({ dateNumber, date }: NextDateCardProps) {
  return (
    <div className="cp-card p-4">
      <div className="flex items-center gap-3">
        {/* Date Number Badge */}
        <span
          className="font-bold shrink-0"
          style={{
            fontSize: 'var(--cp-body-size)',
            color: 'var(--cp-primary)',
          }}
        >
          #{dateNumber}
        </span>

        {/* Date */}
        <span
          style={{
            fontSize: 'var(--cp-body-size)',
            color: 'var(--cp-on-surface)',
          }}
        >
          {date}
        </span>
      </div>
    </div>
  )
}

export default NextDateCard
