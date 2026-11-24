/**
 * Foto del jugador con iniciales de respaldo. Una sola para toda la app (antes
 * había una en jugador y otra en torneo):
 *
 * - Las URLs relativas pasan por `apiUrl`, las absolutas quedan igual.
 * - Los invitados llevan siempre el pato, como getPlayerPhotoUrl de la web
 *   (src/lib/player-utils.ts).
 * - Con `linkToProfile` y `playerId` la foto abre el perfil del jugador, como
 *   HomeAvatar de la web.
 */
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { apiUrl } from '@/lib/api';
import { noir } from '@/theme/colors';

const GUEST_PHOTO_URL = 'https://storage.googleapis.com/poker-enfermos/pato.png';

/** Forma mínima de un jugador para sacar sus props de avatar. */
export type AvatarPlayer = {
  firstName: string;
  lastName?: string | null;
  photoUrl?: string | null;
  role?: string | null;
};

type Props = {
  name: string;
  photoUrl?: string | null;
  /** Con 'Invitado' se muestra el pato. */
  role?: string | null;
  size?: number;
  /** Alto distinto del ancho (tarjetas de campeón). */
  height?: number;
  /** Círculo (por defecto) o tarjeta redondeada. */
  shape?: 'circle' | 'card';
  /** Borde de color (medalla, "tú"). */
  ringColor?: string;
  playerId?: string;
  linkToProfile?: boolean;
};

/** `{...avatarProps(player)}` cuando se tiene el jugador entero. */
export function avatarProps(player: AvatarPlayer) {
  return {
    name: `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim(),
    photoUrl: player.photoUrl,
    role: player.role,
  };
}

export function photoUri(photoUrl?: string | null, role?: string | null): string | null {
  if (role === 'Invitado') return GUEST_PHOTO_URL;
  if (!photoUrl) return null;
  return apiUrl(photoUrl);
}

/** Primera letra del primer y del último nombre ("Juan Antonio Cortez" → "JC"). */
export function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return `${first}${last}`.toUpperCase();
}

export function PlayerAvatar({
  name,
  photoUrl,
  role,
  size = 40,
  height,
  shape = 'circle',
  ringColor,
  playerId,
  linkToProfile = false,
}: Props) {
  const uri = photoUri(photoUrl, role);
  const content = (
    <View
      style={{
        width: size,
        height: height ?? size,
        borderRadius: shape === 'circle' ? size / 2 : 16,
        overflow: 'hidden',
        backgroundColor: noir.raised,
        borderWidth: ringColor ? 2 : 1,
        borderColor: ringColor ?? noir.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          contentPosition="top"
          transition={200}
          accessibilityLabel={name}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text style={{ fontFamily: 'Cinzel_700Bold', fontSize: Math.max(11, size * 0.34), color: ringColor ?? noir.gold }}>
          {initialsOf(name)}
        </Text>
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
