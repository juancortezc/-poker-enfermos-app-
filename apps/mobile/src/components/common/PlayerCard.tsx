/**
 * Tarjeta del jugador para los lugares que celebran (líder de la Tabla, ficha,
 * perfil, campeón; Inicio la reutiliza).
 *
 * - Desde el T31 cada jugador tiene una tarjeta estilo lucha libre (2:3, con
 *   marco y apodo): `playerCardUrl` de @poker/shared la deriva de su foto de
 *   perfil. Si la foto es de una temporada sin tarjetas, se muestra la foto
 *   normal en 3:4 (`fallback`), y sin foto, las iniciales en el mismo 3:4.
 * - La imagen pasa por el optimizador de la web (`photoUri`) al ancho que se
 *   muestra; mientras carga queda el fondo con las iniciales.
 * - `zoomable`: tocarla abre el visor a pantalla completa (PhotoViewer).
 *   `onPress` es la alternativa (p. ej. ir al perfil). Sin ninguna de las dos
 *   es solo imagen.
 *
 * Ancho: `width` fijo, o sin `width` ocupa el ancho del contenedor (el alto
 * sale del aspecto). `displayWidth` ayuda a elegir la resolución en ese caso.
 *
 * ```tsx
 * <PlayerCard name="Juan Cortez" photoUrl={p.photoUrl} role={p.role} width={150} />
 * <PlayerCard name={name} photoUrl={url} zoomable />            // a lo ancho, con visor
 * <PlayerCard name={name} photoUrl={url} cardOnly={false} width={64} />  // foto 3:4 sin marco
 * ```
 */
import { elevation } from '@poker/design';
import { playerCardUrl } from '@poker/shared';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, Text, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { initialsOf, photoUri } from '@/components/common/PlayerAvatar';
import { PhotoViewer } from '@/components/common/PhotoViewer';
import { fonts } from '@/theme/colors';
import { useCP, useTone } from '@/theme/tone';

/** Tarjeta completa del T31 (800x1200). */
export const CARD_ASPECT = 2 / 3;
/** Recorte de perfil (600x800). */
export const PHOTO_ASPECT = 3 / 4;
/** Radio de la tarjeta: entre el de la foto (8) y el de los bloques (18/20). */
export const CARD_RADIUS = 12;

type Props = {
  name: string;
  photoUrl?: string | null;
  /** Con 'Invitado' sale el pato (foto y tarjeta). */
  role?: string | null;
  /** Ancho en pt. Sin él, ocupa el ancho del contenedor. */
  width?: number;
  /** Ancho estimado cuando no hay `width` (por defecto, el de la pantalla). */
  displayWidth?: number;
  /** false: siempre la foto de perfil 3:4, aunque haya tarjeta (#2/#3 de la Tabla). */
  cardOnly?: boolean;
  /** Borde de color (medalla). Sin él, la tarjeta no lleva borde. */
  ringColor?: string;
  /** Grosor del borde (2 por defecto). */
  ringWidth?: number;
  /** Sombra con la elevación del tono (por defecto 2; 0 sin sombra). */
  elevate?: 0 | 1 | 2;
  /** Tocar abre el visor a pantalla completa. */
  zoomable?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Sombra de RN a partir de la capa más marcada de la elevación del tono. */
function shadowStyle(tone: 'dark' | 'light' | 'paper', level: 1 | 2): ViewStyle {
  const layers = elevation[tone === 'dark' ? 'dark' : 'light'][level];
  const s = layers[layers.length - 1];
  const m = s.color.match(/rgba?\(([^)]+)\)/);
  const [r, g, b, a] = m ? m[1].split(',').map((x) => x.trim()) : ['0', '0', '0', '0.1'];
  return {
    shadowColor: `rgb(${r},${g},${b})`,
    // La capa sola queda tenue frente a la sombra doble de la web: se duplica.
    shadowOpacity: Math.min(1, Number(a) * 2),
    shadowRadius: s.blur / 2,
    shadowOffset: { width: s.x, height: s.y },
    elevation: level * 3,
  };
}

/** URLs de la tarjeta (o de la foto 3:4) para mostrar y para el visor. */
export function playerCardSources(photoUrl: string | null | undefined, role: string | null | undefined, displayWidth: number, cardOnly = true) {
  const card = cardOnly ? playerCardUrl(photoUrl, role) : null;
  if (card) {
    return { aspect: CARD_ASPECT, uri: photoUri(card, null, displayWidth), full: photoUri(card, null, 400) };
  }
  return { aspect: PHOTO_ASPECT, uri: photoUri(photoUrl, role, displayWidth), full: photoUri(photoUrl, role, 400) };
}

export function PlayerCard({
  name,
  photoUrl,
  role,
  width,
  displayWidth,
  cardOnly = true,
  ringColor,
  ringWidth = 2,
  elevate = 2,
  zoomable = false,
  onPress,
  accessibilityLabel,
  style,
}: Props) {
  const c = useCP();
  const tone = useTone();
  const reduce = useReducedMotion();
  const screen = useWindowDimensions().width;
  const [failed, setFailed] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const shown = width ?? displayWidth ?? screen;
  const src = playerCardSources(photoUrl, role, shown, cardOnly);
  const uri = src.uri && failed !== src.uri ? src.uri : null;

  const frame = (
    <View
      style={[
        { width: width ?? '100%', aspectRatio: src.aspect, borderRadius: CARD_RADIUS, backgroundColor: c.surface2 },
        elevate ? shadowStyle(tone, elevate) : null,
        style,
      ]}>
      <View
        style={{
          flex: 1,
          borderRadius: CARD_RADIUS,
          overflow: 'hidden',
          backgroundColor: c.surface2,
          borderWidth: ringColor ? ringWidth : 0,
          borderColor: ringColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {/* Iniciales de fondo: se ven mientras carga y si la imagen falla. */}
        <Text style={{ fontFamily: fonts.display, fontSize: Math.max(14, shown * 0.22), color: ringColor ?? c.onSurfaceMuted }}>
          {initialsOf(name)}
        </Text>
        {uri ? (
          <Image
            source={{ uri }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            contentFit="cover"
            contentPosition="top"
            transition={reduce ? 0 : 250}
            accessibilityLabel={name}
            accessibilityIgnoresInvertColors
            onError={() => setFailed(src.uri)}
          />
        ) : null}
      </View>
    </View>
  );

  if (zoomable && uri) {
    return (
      <>
        <Pressable
          accessibilityRole="imagebutton"
          accessibilityLabel={accessibilityLabel ?? `Ver la tarjeta de ${name} en grande`}
          onPress={() => setOpen(true)}
          className="active:opacity-90">
          {frame}
        </Pressable>
        <PhotoViewer visible={open} uri={src.full ?? uri} placeholderUri={uri} aspect={src.aspect} label={name} onClose={() => setOpen(false)} />
      </>
    );
  }
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? name} onPress={onPress} className="active:opacity-80">
        {frame}
      </Pressable>
    );
  }
  return frame;
}

/**
 * La tarjeta como encabezado de una pantalla (ficha, perfil): centrada, casi a
 * lo ancho (82%, tope 360) y con visor al tocarla.
 */
export function PlayerHeroCard({ name, photoUrl, role }: { name: string; photoUrl?: string | null; role?: string | null }) {
  return (
    <View className="items-center">
      <View style={{ width: '82%', maxWidth: 360 }}>
        <PlayerCard name={name} photoUrl={photoUrl} role={role} displayWidth={300} zoomable />
      </View>
    </View>
  );
}
