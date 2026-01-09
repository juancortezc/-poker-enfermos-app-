'use client'

import { BookOpen, Trophy, Clock, AlertTriangle, Coins } from 'lucide-react'

interface ReglamentoSection {
  icon: React.ReactNode
  title: string
  items: string[]
}

const REGLAMENTO_SECTIONS: ReglamentoSection[] = [
  {
    icon: <Trophy className="w-5 h-5" />,
    title: 'Sistema de Puntos',
    items: [
      'Los puntos se calculan en base a la cantidad de jugadores de la fecha',
      '1 punto para el primer eliminado, incrementando en 1 hasta la posicion 10',
      'Posicion 9: 2 puntos mas que la 10',
      'Posiciones 8 a 4: incrementan en 1 punto',
      'Posicion 3: 3 puntos mas que posicion 4',
      'Posicion 2: 3 puntos mas que posicion 3',
      'Ganador: 3 puntos mas que posicion 2'
    ]
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: 'Horarios',
    items: [
      'Hora de inicio: 19h20',
      'La comida se calcula al final del blind 400/800',
      'Registro para participar cierra el domingo anterior a las 20h00'
    ]
  },
  {
    icon: <Coins className="w-5 h-5" />,
    title: 'Multas',
    items: [
      '1000 fichas por cada blind en el cual el jugador no participe por ausencia',
      'Valor del small blind durante cada mesa que el jugador este ausente',
      '5 puntos al puntaje general por no pagar la fecha hasta las 19h20'
    ]
  },
  {
    icon: <AlertTriangle className="w-5 h-5" />,
    title: 'Conducta',
    items: [
      'Si se enseña las cartas a 1 jugador, todos deben poder verlas al final de la mesa',
      'Cuando un jugador declara all in, la mesa no puede hablar, excepto quien tiene que aceptar o pasar la apuesta',
      'Lo declarado manda sobre la cantidad de fichas movidas',
      'Si no se declara la apuesta, las fichas determinan el valor - no se puede cambiar declarando posteriormente',
      'Las cartas colocadas despues de la linea blanca se consideran fold',
      'Si un jugador solo enseña una carta, solo juega con esa carta y 4 de la mesa - no se acepta abrir las cartas de manera individual'
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
