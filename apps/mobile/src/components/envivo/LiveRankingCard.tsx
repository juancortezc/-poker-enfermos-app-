/**
 * Ranking del torneo proyectado en vivo (GET /api/game-dates/[id]/live-ranking,
 * calculado por lib/live-ranking.ts de la web): a los que siguen en mesa se
 * les cuentan los puntos que recibiría el próximo eliminado.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CPCard } from '@/components/ui/CPCard';
import { Muted, Overline } from '@/components/ui/Typography';
import { useCP } from '@/theme/tone';

import type { LiveRankingData } from './types';

const COLLAPSED_ROWS = 10;

export function LiveRankingCard({ data }: { data: LiveRankingData }) {
  const c = useCP();
  const [expanded, setExpanded] = useState(false);
  const rows = data.rows.filter((r) => r.state !== 'absent' || expanded);
  const visible = expanded ? rows : rows.slice(0, COLLAPSED_ROWS);

  return (
    <CPCard className="gap-3">
      <View className="flex-row items-center justify-between">
        <Overline>Ranking en vivo</Overline>
        <Muted className="text-xs">
          Próximo: {data.projection.nextPoints} pts
          {data.projection.eliminasActive ? ` · ELIMINA ${data.projection.datesToEliminate}` : ''}
        </Muted>
      </View>

      {data.lastElimination ? (
        <Muted>
          Última: {data.lastElimination.playerName} ({data.lastElimination.position}.º, {data.lastElimination.points}{' '}
          pts) vs {data.lastElimination.eliminatorName}
        </Muted>
      ) : null}

      {visible.map((r) => (
        <View key={r.playerId} className="min-h-[40px] flex-row items-center gap-2 border-b border-cp-surface-border/50 py-1">
          <Text className="w-7 text-center font-display text-base text-cp-on-surface">{r.position}</Text>
          <Movement delta={r.positionsChanged} />
          <View className="flex-1 flex-row items-center gap-2">
            <View
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor:
                  r.state === 'playing' ? c.positive : r.state === 'eliminated' ? c.negative : c.surfaceBorder,
              }}
            />
            <Text
              className={`flex-1 font-inter text-base ${r.state === 'playing' ? 'text-cp-on-surface' : 'text-cp-on-surface-muted'}`}
              numberOfLines={1}>
              {r.playerName}
            </Text>
          </View>
          <Text className="w-12 text-right font-inter text-sm text-cp-on-surface-muted">
            {r.state === 'absent' ? '—' : `+${r.todayPoints}`}
          </Text>
          <Text className="w-12 text-right font-display text-base text-cp-on-surface">{r.score}</Text>
        </View>
      ))}

      {data.rows.length > COLLAPSED_ROWS ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded((v) => !v)}
          className="min-h-[44px] items-center justify-center active:opacity-70">
          <Text className="font-inter-medium text-sm text-cp-primary-light">{expanded ? 'Ver menos' : 'Ver todos'}</Text>
        </Pressable>
      ) : null}
    </CPCard>
  );
}

function Movement({ delta }: { delta: number }) {
  const c = useCP();
  if (delta === 0) return <View className="w-8" />;
  const up = delta > 0;
  return (
    <View className="w-8 flex-row items-center">
      <Ionicons name={up ? 'caret-up' : 'caret-down'} size={12} color={up ? c.positive : c.negative} />
      <Text className="font-inter text-xs" style={{ color: up ? c.positive : c.negative }}>
        {Math.abs(delta)}
      </Text>
    </View>
  );
}
