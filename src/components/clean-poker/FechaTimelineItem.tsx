'use client'

import { Check, CalendarPlus, Cake } from 'lucide-react'
import { HomeAvatar } from './HomeAvatar'

interface EliminationDTO {
  id: number
  position: number
  points: number
  eliminatedPlayer: { id: string; firstName: string; lastName: string; photoUrl?: string | null }
  eliminatorPlayer: { id: string; firstName: string; lastName: string } | null
}

interface FechaTimelineItemProps {
  dateNumber: number
  scheduledDate: string
  status: string
  eliminations: EliminationDTO[]
  isNext: boolean
  isLast: boolean
  currentUserId: string
  birthdayPlayerName?: string | null
}

const CREAM_BG = '#F3E6D0'
const CREAM_TEXT = '#2A1F14'
const CREAM_MUTED = '#8A7860'

export function FechaTimelineItem({
  dateNumber,
  scheduledDate,
  status,
  eliminations,
  isNext,
  isLast,
  currentUserId,
  birthdayPlayerName
}: FechaTimelineItemProps) {
  const isCompleted = status === 'completed'
  const date = new Date(scheduledDate)
  const day = date.getDate()
  const month = date.toLocaleDateString('es-EC', { month: 'short' }).toUpperCase().replace('.', '')
  const time = '19h20' // hora estándar de todas las fechas del torneo
  const daysUntil = Math.max(0, Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

  const winner = eliminations.find((e) => e.position === 1)
  const myElim = eliminations.find((e) => e.eliminatedPlayer.id === currentUserId)

  const dotColor = isCompleted ? '#4CAF50' : isNext ? '#E53935' : 'transparent'
  const dotBorder = isCompleted || isNext ? 'none' : '2px solid #4A4038'

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {/* Timeline rail */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24 }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: dotColor,
            border: dotBorder,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          {isCompleted && <Check size={14} color="#0D0A08" strokeWidth={3} />}
          {!isCompleted && isNext && <CalendarPlus size={13} color="#fff" />}
        </div>
        {!isLast && <div style={{ flex: 1, width: 2, background: '#3A322B', marginTop: 2 }} />}
      </div>

      {/* Card */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          marginBottom: 12,
          borderRadius: 14,
          padding: 12,
          background: isNext ? '#FBE9E4' : CREAM_BG,
          border: isNext ? '2px solid #E53935' : '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}
      >
        <div style={{ textAlign: 'center', flexShrink: 0, width: 40 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: CREAM_MUTED }}>FECHA</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: CREAM_TEXT, lineHeight: 1.1 }}>{dateNumber}</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#E53935' }}>{day} {month}</div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {isCompleted && winner ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <HomeAvatar playerId={winner.eliminatedPlayer.id} name={winner.eliminatedPlayer.firstName} photoUrl={winner.eliminatedPlayer.photoUrl} size={40} fontSize={13} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#4CAF50', letterSpacing: '0.04em' }}>GANADOR</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: CREAM_TEXT }}>
                  {winner.eliminatedPlayer.firstName} {winner.eliminatedPlayer.lastName[0]}.
                </div>
              </div>
            </div>
          ) : birthdayPlayerName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Cake size={16} color="#D8A84E" />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: '#D8A84E', letterSpacing: '0.04em' }}>FECHA ESPECIAL</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: CREAM_TEXT }}>Cumpleaños de {birthdayPlayerName}</div>
              </div>
            </div>
          ) : isNext ? (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#E53935', letterSpacing: '0.04em' }}>PRÓXIMA FECHA</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: CREAM_TEXT }}>Faltan {daysUntil} {daysUntil === 1 ? 'día' : 'días'}</div>
              <div style={{ fontSize: 10, color: CREAM_MUTED, marginTop: 1 }}>{time}</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: CREAM_MUTED, letterSpacing: '0.04em' }}>PROGRAMADA</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: CREAM_TEXT }}>{time}</div>
            </div>
          )}
        </div>

        {isCompleted && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 9, color: CREAM_MUTED, fontWeight: 700 }}>
              {myElim?.position === 1 ? '¡GANASTE!' : 'TÚ QUEDASTE'}
            </div>
            {myElim && myElim.position !== 1 && (
              <div style={{ fontSize: 16, fontWeight: 900, color: CREAM_TEXT }}>#{myElim.position}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default FechaTimelineItem
