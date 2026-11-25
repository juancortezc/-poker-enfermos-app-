/**
 * Una categoría de premio con su ranking. Equivale a CPAwardCard de la web
 * (admin > Premiación): los 5 primeros y "ver todos" para el resto.
 * `accent` es el color del rol, ya en la variante del tono (useCP).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { avatarProps, PlayerAvatar, type AvatarPlayer } from '@/components/common/PlayerAvatar';
import { Muted, CPCard } from '@/components/ui';

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
    <CPCard className="p-0">
      <View className="flex-row items-center gap-3 border-b border-cp-surface-border px-4 py-3" style={{ backgroundColor: `${accent}14` }}>
        <View className="h-10 w-10 items-center justify-center rounded-cp" style={{ backgroundColor: `${accent}26` }}>
          <Ionicons name={icon} size={20} color={accent} />
        </View>
        <View className="flex-1">
          <Text className="font-display text-base text-cp-on-surface">{title}</Text>
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
          className={`flex-row items-center gap-3 px-4 py-2.5 ${i < shown.length - 1 ? 'border-b border-cp-surface-border' : ''}`}>
          <Text className="w-5 text-center font-inter text-xs text-cp-on-surface-muted">{i + 1}</Text>
          <PlayerAvatar {...avatarProps(item.player)} size={44} ringColor={i === 0 ? accent : undefined} />
          <Text numberOfLines={1} className="flex-1 font-inter text-base text-cp-on-surface">
            {item.player.firstName} {item.player.lastName}
          </Text>
          {item.value !== undefined ? (
            <View className="flex-row items-baseline gap-1">
              <Text className="font-display text-base text-cp-on-surface" style={{ fontVariant: ['tabular-nums'] }}>{item.value}</Text>
              {valueLabel ? <Text className="font-inter text-[11px] uppercase text-cp-on-surface-muted">{valueLabel}</Text> : null}
            </View>
          ) : null}
        </View>
      ))}

      {players.length > 5 && !expandedByDefault ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded((v) => !v)}
          className="min-h-[44px] items-center justify-center border-t border-cp-surface-border active:opacity-80">
          <Text style={{ color: accent }} className="font-inter-semibold text-xs uppercase tracking-[0.6px]">
            {expanded ? 'Ver menos' : `Ver todos (${players.length})`}
          </Text>
        </Pressable>
      ) : null}
    </CPCard>
  );
}
