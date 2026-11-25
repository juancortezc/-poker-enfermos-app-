/**
 * Piezas comunes a las dos vistas del home: el podio escalonado y el bloque
 * rosa de los malazos 7/2. Siempre sobre papel (el home va en claro).
 */
import { scoreOf, shortenFullName, type PlayerRanking } from '@poker/shared';
import { Pressable, Text, View } from 'react-native';

import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { fonts } from '@/theme/colors';
import { useCP } from '@/theme/tone';

import { METAL, ON_COLOR, Tile, TileOverline } from './bento';

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

export function rankingPodium(rankings: PlayerRanking[]): PodiumEntry[] {
  return [...rankings]
    .sort((a, b) => a.position - b.position)
    .slice(0, 3)
    .map((r) => ({ id: r.playerId, name: shortenFullName(r.playerName), photoUrl: r.playerPhoto, score: scoreOf(r) }));
}

/** Los dos ultimos de la tabla (el 7/2): el bloque ROSA, a todo el ancho. */
export function MalazosTile({ rankings, index }: { rankings: PlayerRanking[]; index: number }) {
  const bottom2 = rankings.length >= 2 ? [...rankings].sort((a, b) => b.position - a.position).slice(0, 2).reverse() : [];
  if (bottom2.length === 0) return null;
  return (
    <Tile tone="rosa" index={index}>
      <TileOverline color={ON_COLOR.soft}>Malazos 7/2</TileOverline>
      <View className="mt-3 flex-row">
        {bottom2.map((p, k) => (
          <View
            key={p.playerId}
            className="min-w-0 flex-1 flex-row items-center"
            style={{ gap: 10, paddingLeft: k ? 12 : 0, borderLeftWidth: k ? 1 : 0, borderLeftColor: ON_COLOR.line }}>
            <PlayerAvatar name={p.playerName} photoUrl={p.playerPhoto} size={52} playerId={p.playerId} linkToProfile />
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: '#FFFFFF' }}>
                {shortenFullName(p.playerName)}
              </Text>
              <Text style={{ fontFamily: fonts.display, fontSize: 17, color: '#FFFFFF' }}>{scoreOf(p)}</Text>
            </View>
          </View>
        ))}
      </View>
    </Tile>
  );
}
