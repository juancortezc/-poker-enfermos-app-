/**
 * Foto del jugador o sus iniciales. Los invitados llevan siempre el pato,
 * igual que getPlayerPhotoUrl de la web (src/lib/player-utils.ts).
 */
import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { apiUrl } from '@/lib/api';
import { noir } from '@/theme/colors';

const GUEST_PHOTO_URL = 'https://storage.googleapis.com/poker-enfermos/pato.png';

export type AvatarPlayer = {
  firstName: string;
  lastName?: string | null;
  photoUrl?: string | null;
  role?: string | null;
};

export function photoUri(player: AvatarPlayer): string | null {
  if (player.role === 'Invitado') return GUEST_PHOTO_URL;
  if (!player.photoUrl) return null;
  return apiUrl(player.photoUrl);
}

export function initials(player: AvatarPlayer): string {
  return `${player.firstName?.[0] ?? ''}${player.lastName?.[0] ?? ''}`.toUpperCase();
}

type Props = {
  player: AvatarPlayer;
  size?: number;
  /** Color del borde; por defecto el borde Noir. */
  ring?: string;
  /** Esquinas: círculo (por defecto) o tarjeta redondeada. */
  shape?: 'circle' | 'card';
  height?: number;
};

export function PlayerAvatar({ player, size = 40, ring = noir.border, shape = 'circle', height }: Props) {
  const uri = photoUri(player);
  const h = height ?? size;
  const radius = shape === 'circle' ? size / 2 : 16;
  return (
    <View
      style={{
        width: size,
        height: h,
        borderRadius: radius,
        borderWidth: 2,
        borderColor: ring,
        overflow: 'hidden',
        backgroundColor: noir.raised,
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
          accessibilityLabel={`${player.firstName} ${player.lastName ?? ''}`.trim()}
        />
      ) : (
        <Text style={{ color: ring === noir.border ? noir.gold : ring, fontSize: Math.max(11, size * 0.32) }} className="font-cinzel-bold">
          {initials(player)}
        </Text>
      )}
    </View>
  );
}
