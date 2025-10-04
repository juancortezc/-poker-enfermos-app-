'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface RankingEvolutionChartProps {
  data: Array<{
    dateNumber: number;
    position: number;
    points: number;
  }>;
  playerName: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string | number;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-[#1f1a2d] via-[#181a2c] to-[#111221] px-4 py-3 shadow-[0_16px_36px_rgba(8,9,15,0.45)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55 mb-1">
          Fecha {label}
        </p>
        <p className="text-sm font-semibold text-white">
          Posición: <span className="text-poker-gold">{data.position}°</span>
        </p>
        <p className="text-sm font-semibold text-white/80">
          Puntos: <span className="text-rose-300">{data.points}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function RankingEvolutionChart({ data, playerName }: RankingEvolutionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-poker-card border border-white/10 rounded-lg p-6 h-64">
        <div className="flex items-center justify-center h-full text-poker-muted">
          <div className="text-center">
            <p>No hay datos suficientes para mostrar el gráfico</p>
            <p className="text-sm mt-1">Se necesitan al menos 2 fechas jugadas</p>
          </div>
        </div>
      </div>
    );
  }

  // Prepare data for the chart
  const chartData = data.map(item => ({
    dateNumber: item.dateNumber,
    position: item.position,
    points: item.points,
    label: `F${item.dateNumber}`
  }));

  // Calculate Y-axis domain (invert since position 1 should be at top)
  const maxPosition = Math.max(...data.map(d => d.position));
  const minPosition = Math.min(...data.map(d => d.position));
  const padding = Math.max(1, Math.ceil((maxPosition - minPosition) * 0.1));

  return (
    <div className="rounded-3xl border border-white/12 bg-gradient-to-br from-[#1b1d2f] via-[#181a2c] to-[#111221] p-6">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
          >
            <defs>
              <linearGradient id="pokerNewLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#d73552" />
                <stop offset="100%" stopColor="#ff4b2b" />
              </linearGradient>
              <linearGradient id="pokerNewGrid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 8" stroke="url(#pokerNewGrid)" />
            <XAxis
              dataKey="label"
              stroke="rgba(255, 255, 255, 0.45)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="rgba(255, 255, 255, 0.45)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={[minPosition - padding, maxPosition + padding]}
              reversed={true} // Invert Y-axis so position 1 is at top
              tickFormatter={(value) => `${value}°`}
            />
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ stroke: 'rgba(255,93,143,0.6)', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="position"
              stroke="url(#pokerNewLine)"
              strokeWidth={5}
              dot={{
                fill: '#d73552',
                strokeWidth: 2,
                stroke: '#ff4b2b',
                r: 8
              }}
              activeDot={{
                r: 12,
                fill: '#ff4b2b',
                stroke: '#ffffff',
                strokeWidth: 2
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Chart info */}
      <div className="mt-4 text-center">
        <p className="text-sm text-white/60">
          Evolución de {playerName} a través de {data.length} fechas jugadas
        </p>
        <div className="flex justify-center items-center gap-4 mt-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-1 w-6 rounded-full bg-gradient-to-r from-[#d73552] to-[#ff4b2b]" />
            <span className="text-white/70">Posición en ranking</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-[#ff4b2b]" />
            <span className="text-white/70">Fecha jugada</span>
          </div>
        </div>
      </div>
    </div>
  );
}
