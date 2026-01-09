'use client';

import { useMemo } from 'react';
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
      <div className="rounded-2xl border border-[#e0b66c]/20 bg-gradient-to-br from-[#2a1a14]/95 via-[#24160f]/95 to-[#1f1410]/95 px-4 py-3 shadow-[0_16px_36px_rgba(11,6,3,0.55)] backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e8e3e3] mb-1">
          Fecha {label}
        </p>
        <p className="text-sm font-semibold text-[#f3e6c5]">
          Posición: <span className="text-[#e0b66c]">{data.position}°</span>
        </p>
        <p className="text-sm font-semibold text-[#f3e6c5]/80">
          Puntos: <span className="text-[#a9441c]">{data.points}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function RankingEvolutionChart({ data, playerName }: RankingEvolutionChartProps) {
  // OPTIMIZATION: Memoize chart data transformation
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map(item => ({
      dateNumber: item.dateNumber,
      position: item.position,
      points: item.points,
      label: `F${item.dateNumber}`
    }));
  }, [data]);

  // OPTIMIZATION: Memoize Y-axis domain calculations
  const { maxPosition, minPosition, padding } = useMemo(() => {
    if (!data || data.length === 0) return { maxPosition: 1, minPosition: 1, padding: 0 };
    const max = Math.max(...data.map(d => d.position));
    const min = Math.min(...data.map(d => d.position));
    const pad = Math.max(1, Math.ceil((max - min) * 0.1));
    return { maxPosition: max, minPosition: min, padding: pad };
  }, [data]);

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

  return (
    <div className="rounded-3xl border border-[#e0b66c]/15 bg-gradient-to-br from-[#2a1a14] via-[#24160f] to-[#1f1410] p-6 shadow-[0_18px_40px_rgba(11,12,32,0.35)]">
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
              <linearGradient id="noirJazzLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#e0b66c" />
                <stop offset="100%" stopColor="#a9441c" />
              </linearGradient>
              <linearGradient id="noirJazzGrid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(224,182,108,0.08)" />
                <stop offset="100%" stopColor="rgba(224,182,108,0.03)" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 8" stroke="url(#noirJazzGrid)" />
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
              cursor={{ stroke: 'rgba(224,182,108,0.6)', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="position"
              stroke="url(#noirJazzLine)"
              strokeWidth={5}
              dot={{
                fill: '#e0b66c',
                strokeWidth: 2,
                stroke: '#a9441c',
                r: 8
              }}
              activeDot={{
                r: 12,
                fill: '#e0b66c',
                stroke: '#f3e6c5',
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
