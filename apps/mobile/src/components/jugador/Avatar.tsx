/**
 * Foto redonda del jugador con iniciales de respaldo. Como en la web
 * (HomeAvatar), con `linkToProfile` la foto abre el perfil del jugador.
 */
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { noir } from '@/theme/colors';

type Props = {
  name: string;
  photoUrl?: string | null;
  size?: number;
  playerId?: string;
  linkToProfile?: boolean;
  /** Borde de color (medalla, "tú"). */
  ringColor?: string;
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Avatar({ name, photoUrl, size = 40, playerId, linkToProfile = false, ringColor }: Props) {
  const content = (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        backgroundColor: noir.raised,
        borderWidth: ringColor ? 2 : 1,
        borderColor: ringColor ?? noir.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          contentPosition="top"
          transition={200}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: size * 0.34, color: noir.gold }}>{initialsOf(name)}</Text>
      )}
    </View>
  );

  if (!linkToProfile || !playerId) return content;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Ver el perfil de ${name}`}
      hitSlop={size < 44 ? (44 - size) / 2 : 0}
      onPress={() => router.push({ pathname: '/players/[id]', params: { id: playerId } })}
      className="active:opacity-70">
      {content}
    </Pressable>
  );
}
