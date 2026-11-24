/** Bloques comunes a las dos vistas de la home: podio del torneo y malazos 7/2. */
import { scoreOf, shortenFullName, type PlayerRanking } from '@poker/shared';
import { Pressable, Text, View } from 'react-native';

import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { MALAZO, MEDAL, Score } from '@/components/jugador/Bits';
import { NoirCard } from '@/components/ui/NoirCard';
import { Overline } from '@/components/ui/Typography';

/** Podio 2-1-3 con el primero más grande. `onPressName` abre el detalle (vista Torneo). */
export function PodiumRow({
  podium,
  onPressName,
  selectedId,
}: {
  podium: PlayerRanking[];
  onPressName?: (playerId: string) => void;
  selectedId?: string | null;
}) {
  if (podium.length < 3) return null;
  return (
    <View className="flex-row items-end justify-center gap-4">
      {[podium[1], podium[0], podium[2]].map((p) => {
        const idx = podium.indexOf(p);
        const first = idx === 0;
        const name = (
          <View className="items-center">
            <Text numberOfLines={1} className="mt-2 font-inter-semibold text-xs text-noir-text">
              {shortenFullName(p.playerName)}
            </Text>
            <Score value={scoreOf(p)} size={first ? 19 : 15} color={MEDAL[idx]} />
          </View>
        );
        return (
          <View key={p.playerId} className="min-w-0 flex-1 items-center" style={{ marginBottom: first ? 12 : 0 }}>
            <View style={{ transform: [{ translateY: selectedId === p.playerId ? -3 : 0 }] }}>
              <PlayerAvatar
                name={p.playerName}
                photoUrl={p.playerPhoto}
                size={first ? 96 : 72}
                ringColor={MEDAL[idx]}
                playerId={p.playerId}
                linkToProfile
              />
              <View
                style={{ backgroundColor: MEDAL[idx], position: 'absolute', bottom: -6, alignSelf: 'center' }}
                className="h-5 min-w-5 items-center justify-center rounded-full px-1.5">
                <Text className="font-inter-bold text-[11px] text-noir-bg">{idx + 1}</Text>
              </View>
            </View>
            {onPressName ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: selectedId === p.playerId }}
                onPress={() => onPressName(p.playerId)}
                className="min-h-[44px] active:opacity-70">
                {name}
              </Pressable>
            ) : (
              name
            )}
          </View>
        );
      })}
    </View>
  );
}

/** Los dos últimos de la tabla (el 7/2). */
export function MalazosCard({ rankings }: { rankings: PlayerRanking[] }) {
  const bottom2 = rankings.length >= 2 ? [...rankings].sort((a, b) => b.position - a.position).slice(0, 2).reverse() : [];
  if (bottom2.length === 0) return null;
  return (
    <NoirCard className="gap-3" style={{ borderColor: `${MALAZO}66`, backgroundColor: 'rgba(236,72,153,0.10)' }}>
      <Overline style={{ color: MALAZO }}>Malazos 7/2</Overline>
      <View className="flex-row">
        {bottom2.map((p, k) => (
          <View key={p.playerId} className={`flex-1 flex-row items-center gap-3 ${k > 0 ? 'border-l border-noir-border pl-3' : ''}`}>
            <PlayerAvatar name={p.playerName} photoUrl={p.playerPhoto} size={48} playerId={p.playerId} linkToProfile />
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="font-inter-semibold text-sm text-noir-text">
                {shortenFullName(p.playerName)}
              </Text>
              <Score value={scoreOf(p)} size={16} />
            </View>
          </View>
        ))}
      </View>
    </NoirCard>
  );
}
