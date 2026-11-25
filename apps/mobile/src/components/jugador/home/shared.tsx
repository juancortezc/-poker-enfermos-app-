/**
 * El podio escalonado de fotos (lo usa la tarjeta del torneo finalizado).
 * Siempre sobre papel (el home va en claro).
 */
import { Pressable, Text, View } from 'react-native';

import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { fonts } from '@/theme/colors';
import { useCP } from '@/theme/tone';

import { METAL, TileOverline } from './bento';

/** Numero de puesto sobre la foto, en el metal. */
export function MedalBadge({ place, size = 21 }: { place: number; size?: number }) {
  return (
    <View
      style={{
        position: 'absolute',
        bottom: -6,
        alignSelf: 'center',
        backgroundColor: METAL[place - 1],
        minWidth: size,
        height: size,
        borderRadius: size / 2,
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontFamily: fonts.display, fontSize: size * 0.55, color: '#FFFFFF' }}>{place}</Text>
    </View>
  );
}

export type PodiumEntry = { id: string; name: string; photoUrl?: string | null; score?: number; label?: string };

/**
 * Podio con forma de podio: 2-1-3, el primero mas grande y mas alto.
 * `onPressName` abre la comparacion (vista Torneo); la foto abre el perfil.
 */
export function PodiumRow({
  podium,
  big = 106,
  small = 78,
  onPressName,
  selectedId,
}: {
  podium: PodiumEntry[];
  big?: number;
  small?: number;
  onPressName?: (id: string) => void;
  selectedId?: string | null;
}) {
  const c = useCP();
  if (podium.length < 3) return null;
  return (
    <View className="flex-row items-end justify-center" style={{ gap: 12 }}>
      {[1, 0, 2].map((idx) => {
        const p = podium[idx];
        const first = idx === 0;
        const label = (
          <View className="items-center" style={{ gap: 4, marginTop: 9 }}>
            <Text
              numberOfLines={1}
              style={{ fontFamily: fonts.bodyBold, fontSize: first ? 13 : 12, color: c.onSurface, textAlign: 'center' }}>
              {p.name}
            </Text>
            {p.score !== undefined ? (
              <Text style={{ fontFamily: fonts.display, fontSize: first ? 19 : 15, color: METAL[idx], letterSpacing: -0.5 }}>{p.score}</Text>
            ) : (
              <TileOverline color={METAL[idx]} style={{ fontSize: 10 }}>
                {p.label ?? `${idx + 1}º`}
              </TileOverline>
            )}
          </View>
        );
        return (
          <View key={p.id} className="min-w-0 flex-1 items-center" style={{ marginBottom: first ? 12 : 0 }}>
            <View style={{ transform: [{ translateY: selectedId === p.id ? -3 : 0 }] }}>
              <PlayerAvatar name={p.name} photoUrl={p.photoUrl} size={first ? big : small} playerId={p.id} linkToProfile />
              <MedalBadge place={idx + 1} />
            </View>
            {onPressName ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: selectedId === p.id }}
                onPress={() => onPressName(p.id)}
                className="min-h-[44px] active:opacity-70">
                {label}
              </Pressable>
            ) : (
              label
            )}
          </View>
        );
      })}
    </View>
  );
}
