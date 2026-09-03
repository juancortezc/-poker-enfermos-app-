'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface EvolutionPoint {
  dateNumber: number
  position: number
  points: number
}

export function PlayerEvolutionChart({ evolution }: { evolution: EvolutionPoint[] }) {
  const sorted = [...evolution].sort((a, b) => a.dateNumber - b.dateNumber)
  const data = sorted.map((e) => ({ ...e, label: `F${e.dateNumber}` }))
  const maxPos = Math.max(...data.map((d) => d.position), 1)

  return (
    <div style={{ width: '100%', height: 160 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
          <YAxis
            reversed
            domain={[1, maxPos]}
            allowDecimals={false}
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={{ background: '#17140F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: '#F5EFE6' }}
            itemStyle={{ color: '#E53935' }}
            formatter={(value: number) => [`#${value}`, 'Posición']}
          />
          <Line type="monotone" dataKey="position" stroke="#E53935" strokeWidth={2.5} dot={{ r: 3, fill: '#E53935' }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default PlayerEvolutionChart
