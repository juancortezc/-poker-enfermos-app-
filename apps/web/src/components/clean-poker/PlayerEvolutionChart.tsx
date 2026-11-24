'use client'

import {
  LineChart,
  Line,
  LabelList,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface EvolutionPoint {
  dateNumber: number
  position: number
  points: number
}

/**
 * Cómo se movió el jugador en la tabla, fecha a fecha.
 *
 * El eje va invertido: la posición 1 arriba, porque "subir" tiene que verse
 * como subir.
 *
 * Cada punto lleva su número encima. Sin eso había que cruzar la vista contra
 * el eje para saber en qué puesto estaba, y en un gráfico de 160px de alto con
 * doce fechas eso no se lee de un vistazo.
 *
 * Los colores salen de los tokens del sistema claro. Antes estaban escritos a
 * mano en blanco translúcido —de cuando esta pantalla era oscura— y sobre la
 * tarjeta blanca actual la grilla y los ejes quedaban casi invisibles.
 */
export function PlayerEvolutionChart({ evolution }: { evolution: EvolutionPoint[] }) {
  const sorted = [...evolution].sort((a, b) => a.dateNumber - b.dateNumber)
  const data = sorted.map((e) => ({ ...e, label: `F${e.dateNumber}` }))

  if (data.length === 0) {
    return (
      <div
        style={{
          padding: '24px 0',
          textAlign: 'center',
          fontSize: 'var(--cp-caption-size)',
          color: 'var(--cp-on-surface-muted)',
        }}
      >
        Todavía no hay fechas jugadas.
      </div>
    )
  }

  const maxPos = Math.max(...data.map((d) => d.position), 1)

  return (
    <div style={{ width: '100%', height: 176 }}>
      <ResponsiveContainer>
        {/* El margen de arriba deja aire para el número del puesto 1, que si no
            se corta contra el borde del gráfico. */}
        <LineChart data={data} margin={{ top: 22, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--cp-surface-border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: 'var(--cp-on-surface-variant)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            reversed
            domain={[1, maxPos]}
            allowDecimals={false}
            tick={{ fontSize: 12, fill: 'var(--cp-on-surface-variant)' }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--cp-surface)',
              border: '1px solid var(--cp-surface-border)',
              borderRadius: 8,
              fontSize: 13,
            }}
            labelStyle={{ color: 'var(--cp-on-surface)' }}
            itemStyle={{ color: 'var(--cp-primary-light)' }}
            formatter={(value: number) => [`${value}º`, 'Posición']}
          />
          <Line
            type="monotone"
            dataKey="position"
            stroke="var(--cp-primary)"
            strokeWidth={2.5}
            dot={{ r: 3.5, fill: 'var(--cp-primary)' }}
            activeDot={{ r: 5.5 }}
          >
            <LabelList
              dataKey="position"
              position="top"
              offset={9}
              style={{
                fontSize: 12,
                fontWeight: 800,
                fill: 'var(--cp-on-surface)',
              }}
            />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default PlayerEvolutionChart
