/**
 * Una categoría de premio con su ranking. Equivale a CPAwardCard de la web
 * (admin > Premiación): los 5 primeros y "ver todos" para el resto.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { PlayerAvatar, type AvatarPlayer } from '@/components/torneo/PlayerAvatar';
import { Muted, NoirCard } from '@/components/ui';

export type AwardPlayer = AvatarPlayer & { id: string };

type Props = {
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  accent: string;
  players: { player: AwardPlayer; value?: number }[];
  valueLabel?: string;
  /** Sin "ver todos": para la imagen que se comparte. */
  expandedByDefault?: boolean;
};

export function AwardCard({ title, description, icon, accent, players, valueLabel, expandedByDefault = false }: Props) {
  const [expanded, setExpanded] = useState(expandedByDefault);
  if (players.length === 0) return null;
  const shown = expanded ? players : players.slice(0, 5);

  return (
    <NoirCard className="p-0">
      <View className="flex-row items-center gap-3 border-b border-noir-border px-4 py-3" style={{ backgroundColor: `${accent}14` }}>
        <View className="h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}26` }}>
          <Ionicons name={icon} size={20} color={accent} />
        </View>
        <View className="flex-1">
          <Text className="font-cinzel-bold text-base text-noir-text">{title}</Text>
          <Muted className="text-xs">{description}</Muted>
        </View>
        <View className="rounded px-2 py-0.5" style={{ backgroundColor: `${accent}26` }}>
          <Text style={{ color: accent }} className="font-inter-semibold text-xs">
            {players.length}
          </Text>
        </View>
      </View>

      {shown.map((item, i) => (
        <View
          key={item.player.id}
          className={`flex-row items-center gap-3 px-4 py-2.5 ${i < shown.length - 1 ? 'border-b border-noir-border' : ''}`}>
          <Text className="w-5 text-center font-inter text-xs text-noir-muted">{i + 1}</Text>
          <PlayerAvatar player={item.player} size={32} ring={i === 0 ? accent : undefined} />
          <Text numberOfLines={1} className="flex-1 font-inter text-base text-noir-text">
            {item.player.firstName} {item.player.lastName}
          </Text>
          {item.value !== undefined ? (
            <View className="flex-row items-baseline gap-1">
              <Text className="font-inter-bold text-base text-noir-text">{item.value}</Text>
              {valueLabel ? <Text className="font-inter text-[11px] uppercase text-noir-muted">{valueLabel}</Text> : null}
            </View>
          ) : null}
        </View>
      ))}

      {players.length > 5 && !expandedByDefault ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded((v) => !v)}
          className="min-h-[44px] items-center justify-center border-t border-noir-border active:opacity-80">
          <Text style={{ color: accent }} className="font-inter-semibold text-xs uppercase tracking-[1.5px]">
            {expanded ? 'Ver menos' : `Ver todos (${players.length})`}
          </Text>
        </Pressable>
      ) : null}
    </NoirCard>
  );
}
