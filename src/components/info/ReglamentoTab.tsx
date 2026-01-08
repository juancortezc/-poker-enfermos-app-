'use client'

import { BookOpen, Trophy, Users, Clock, AlertTriangle, DollarSign } from 'lucide-react'

interface ReglamentoSection {
  icon: React.ReactNode
  title: string
  items: string[]
}

const REGLAMENTO_SECTIONS: ReglamentoSection[] = [
  {
    icon: <Users className="w-5 h-5" />,
    title: 'Participantes',
    items: [
      'Solo pueden participar los Enfermos activos del grupo',
      'Los invitados deben ser aprobados por la Comision',
      'Cada Enfermo puede traer maximo 1 invitado por fecha',
      'Los invitados no acumulan puntos en la tabla general'
    ]
  },
  {
    icon: <Trophy className="w-5 h-5" />,
    title: 'Sistema de Puntos',
    items: [
      '1er lugar: 100% de los puntos disponibles',
      '2do lugar: 70% de los puntos',
      '3er lugar: 50% de los puntos',
      'Los puntos varian segun cantidad de jugadores',
      'Bonus por eliminar al campeon vigente'
    ]
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: 'Horarios',
    items: [
      'Inicio puntual a las 21:00 hrs',
      'Registro hasta 21:15 hrs',
      'Late registration hasta nivel 4',
      'Breaks de 10 minutos cada hora'
    ]
  },
  {
    icon: <DollarSign className="w-5 h-5" />,
    title: 'Buy-in y Premios',
    items: [
      'Buy-in fijo de $500 MXN',
      'Rebuy disponible en primeros 4 niveles',
      'Add-on al final del nivel 4',
      'Premios: 50% primer lugar, 30% segundo, 20% tercero'
    ]
  },
  {
    icon: <AlertTriangle className="w-5 h-5" />,
    title: 'Conducta',
    items: [
      'Respeto entre todos los participantes',
      'Prohibido mostrar cartas antes de terminar la mano',
      'No se permite coaching durante el juego',
      'Decisiones del TD son finales'
    ]
  }
]

export default function ReglamentoTab() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className="rounded-2xl p-4 text-center"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        <BookOpen className="w-10 h-10 mx-auto mb-2" style={{ color: '#E53935' }} />
        <h2
          className="text-lg font-bold"
          style={{ color: 'var(--cp-on-surface)' }}
        >
          Reglamento Oficial
        </h2>
        <p
          className="text-xs mt-1"
          style={{ color: 'var(--cp-on-surface-muted)' }}
        >
          Poker Enfermos - Torneo Semanal
        </p>
      </div>

      {/* Sections */}
      {REGLAMENTO_SECTIONS.map((section, index) => (
        <div
          key={index}
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--cp-surface)',
            border: '1px solid var(--cp-surface-border)',
          }}
        >
          {/* Section Header */}
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: '1px solid var(--cp-surface-border)' }}
          >
            <div style={{ color: '#E53935' }}>
              {section.icon}
            </div>
            <h3
              className="font-semibold"
              style={{
                fontSize: 'var(--cp-body-size)',
                color: 'var(--cp-on-surface)',
              }}
            >
              {section.title}
            </h3>
          </div>

          {/* Section Items */}
          <div className="px-4 py-3 space-y-2">
            {section.items.map((item, itemIndex) => (
              <div
                key={itemIndex}
                className="flex items-start gap-2"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                  style={{ background: '#f97316' }}
                />
                <p
                  style={{
                    fontSize: 'var(--cp-caption-size)',
                    color: 'var(--cp-on-surface-variant)',
                    lineHeight: '1.5',
                  }}
                >
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
