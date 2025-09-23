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
      <div className="bg-poker-red border-2 border-poker-gold rounded-lg p-3 shadow-xl">
        <p className="text-white font-semibold">Fecha {label}</p>
        <p className="text-poker-gold">
          Posición: {data.position}°
        </p>
        <p className="text-poker-orange">
          Puntos: {data.points}
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
    <div className="bg-poker-table border-2 border-poker-red rounded-lg p-6">
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
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(229, 9, 20, 0.2)" 
            />
            <XAxis
              dataKey="label"
              stroke="rgba(255, 255, 255, 0.6)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="rgba(255, 255, 255, 0.6)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={[minPosition - padding, maxPosition + padding]}
              reversed={true} // Invert Y-axis so position 1 is at top
              tickFormatter={(value) => `${value}°`}
            />
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ stroke: '#E50914', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="position"
              stroke="#E50914"
              strokeWidth={6}
              dot={{ 
                fill: '#FF8C00', 
                strokeWidth: 3, 
                stroke: '#E50914',
                r: 10 
              }}
              activeDot={{ 
                r: 14, 
                fill: '#FFD700',
                stroke: '#E50914',
                strokeWidth: 3
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Chart info */}
      <div className="mt-4 text-center">
        <p className="text-poker-muted text-sm">
          Evolución de {playerName} a través de {data.length} fechas jugadas
        </p>
        <div className="flex justify-center items-center gap-4 mt-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-1 bg-poker-red rounded"></div>
            <span className="text-white">Posición en ranking</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-poker-orange rounded-full"></div>
            <span className="text-white">Fecha jugada</span>
          </div>
        </div>
      </div>
    </div>
  );
}