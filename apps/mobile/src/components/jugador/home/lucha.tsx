/**
 * Piezas del Inicio del T31, tema lucha libre: el cartel negro (franjas y
 * cuerdas de ring o resplandor oro), titulares en Archivo 900 itálica, el
 * podio con pedestales, los tiles de foto 3:4 con texto encima, el mano a mano
 * y la mini tabla. Todo con tokens de @poker/design (`cp` = tono oscuro, el
 * de los bloques negros; `useCP()` = tono de la pantalla).
 */
import { motion } from '@poker/design';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, FadeInDown, ReduceMotion, useReducedMotion } from 'react-native-reanimated';
import Svg, { Defs, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

import { initialsOf, photoUri } from '@/components/common/PlayerAvatar';
import { alpha, cp, fonts } from '@/theme/colors';
import { useCP } from '@/theme/tone';

/** Ancho de la tarjeta protagonista del cartel y del cinturón. */
export const HERO_CARD_WIDTH = 232;

/** La tarjeta del cartel: rotada y con sombra profunda sobre el negro. */
export const HERO_CARD_STYLE = (deg: number) => ({
  transform: [{ rotate: `${deg}deg` }],
  shadowColor: cp.surface0,
  shadowOpacity: 0.6,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 18 },
  elevation: 12,
});

export const MEDALS = [cp.gold, cp.silver, cp.bronze] as const;

export const openPlayer = (id: string) => router.push({ pathname: '/players/[id]', params: { id } });

/** Entrada escalonada (la del bento); sin animación con "reducir movimiento". */
export function Rise({ index, children, style }: { index: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const stagger = motion.rise.stagger;
  return (
    <Animated.View
      style={style}
      entering={FadeInDown.duration(motion.rise.duration)
        .delay(stagger[Math.min(index, stagger.length - 1)])
        .easing(Easing.bezier(0.22, 1, 0.36, 1))
        .reduceMotion(ReduceMotion.System)}>
      {children}
    </Animated.View>
  );
}

/** Título de sección ("EL PODIO") con enlace opcional a la derecha. */
export function SectionTitle({ title, link, onLink }: { title: string; link?: string; onLink?: () => void }) {
  const c = useCP();
  return (
    <View className="flex-row items-center justify-between">
      <Text accessibilityRole="header" style={{ fontFamily: fonts.displayBlack, fontSize: 26, letterSpacing: 0.5, color: c.onSurface }}>
        {title}
      </Text>
      {link && onLink ? (
        <Pressable accessibilityRole="link" onPress={onLink} hitSlop={12} className="min-h-[44px] justify-center active:opacity-60">
          <Text style={{ fontFamily: fonts.display, fontSize: 13, letterSpacing: 1.5, color: c.primaryLight }}>{link} →</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Rótulo dorado del cartel ("FUNCIÓN ESTELAR · FECHA 14"). */
export function MarqueeOverline({ children, icon }: { children: string; icon: string }) {
  return (
    <Text style={{ fontFamily: fonts.display, fontSize: 12, letterSpacing: 3, color: cp.gold, textAlign: 'center' }}>
      {icon} {children} {icon}
    </Text>
  );
}

/**
 * Bloque negro del cartel. `pattern`: franjas diagonales rojas con tres
 * cuerdas de ring (el ganador de la noche) o resplandor oro (el cinturón).
 */
export function Marquee({ pattern, children }: { pattern: 'ring' | 'glow'; children: React.ReactNode }) {
  return (
    <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: cp.surface0 }}>
      <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <Pattern id="franjas" patternUnits="userSpaceOnUse" width={28} height={28} patternTransform="rotate(45)">
            <Rect x={0} y={0} width={14} height={28} fill={cp.primary} fillOpacity={0.16} />
          </Pattern>
          <RadialGradient id="brillo" cx="50%" cy="30%" r="60%">
            <Stop offset="0" stopColor={cp.gold} stopOpacity={0.22} />
            <Stop offset="1" stopColor={cp.gold} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={pattern === 'ring' ? 'url(#franjas)' : 'url(#brillo)'} />
      </Svg>
      {pattern === 'ring'
        ? [150, 200, 250].map((top) => (
            <View
              key={top}
              pointerEvents="none"
              style={{ position: 'absolute', left: 0, right: 0, top, height: 3, backgroundColor: cp.primary, opacity: 0.55 }}
            />
          ))
        : null}
      <View style={{ paddingTop: 22, paddingBottom: 24, paddingHorizontal: 20, alignItems: 'center', gap: 14 }}>{children}</View>
    </View>
  );
}

/**
 * Titular de dos líneas (la frase de @poker/shared), en mayúsculas, Archivo
 * 900 itálica. El tamaño baja con la línea más larga para que entre a lo ancho.
 */
export function Headline({ lines, accent, max = 46 }: { lines: readonly [string, string]; accent: string; max?: number }) {
  const { width } = useWindowDimensions();
  const available = width - 40 - 40; // padding de la pantalla (20+20) y del cartel (20+20)
  const longest = Math.max(lines[0].length, lines[1].length);
  const size = Math.round(Math.max(28, Math.min(max, available / (longest * 0.6))));
  return (
    <Text
      accessibilityRole="header"
      style={{
        fontFamily: fonts.displayBlackItalic,
        fontSize: size,
        lineHeight: Math.round(size * 0.98),
        letterSpacing: -0.5,
        textAlign: 'center',
        textTransform: 'uppercase',
        color: cp.onSurface,
        marginTop: 6,
      }}>
      {lines[0]}
      {'\n'}
      <Text style={{ color: accent }}>{lines[1]}</Text>
    </Text>
  );
}

/** Foto que llena su contenedor, con iniciales de fondo mientras carga. */
export function PhotoFill({ name, photoUrl, role, width }: { name: string; photoUrl?: string | null; role?: string | null; width: number }) {
  const c = useCP();
  const reduce = useReducedMotion();
  const [failed, setFailed] = useState<string | null>(null);
  const candidate = photoUri(photoUrl, role, width);
  const uri = candidate && failed !== candidate ? candidate : null;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface2 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: Math.max(14, width * 0.24), color: c.onSurfaceMuted }}>{initialsOf(name)}</Text>
      {uri ? (
        <Image
          source={{ uri }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="cover"
          contentPosition="top"
          transition={reduce ? 0 : motion.normal}
          accessibilityIgnoresInvertColors
          onError={() => setFailed(candidate)}
        />
      ) : null}
    </View>
  );
}

export type PodiumSpot = { id: string; name: string; photoUrl?: string | null; points: number };

const PEDESTAL = [92, 64, 48];
const PEDESTAL_NUM = [34, 24, 20];

/** Podio 2-1-3: foto 3:4 con borde de medalla sobre un pedestal del mismo color. */
export function MedalPodium({ spots }: { spots: PodiumSpot[] }) {
  const { width } = useWindowDimensions();
  const colW = (width - 32 - 20) / 3;
  const order = [1, 0, 2].filter((i) => spots[i]);
  return (
    <View className="flex-row items-end" style={{ gap: 10 }}>
      {order.map((i) => {
        const p = spots[i];
        const medal = MEDALS[i];
        return (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            accessibilityLabel={`${i + 1}° lugar, ${p.name}, ${p.points} puntos. Ver su ficha`}
            onPress={() => openPlayer(p.id)}
            className="flex-1 active:opacity-80">
            <View
              style={{
                aspectRatio: 3 / 4,
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
                overflow: 'hidden',
                borderWidth: 3,
                borderBottomWidth: 0,
                borderColor: medal,
              }}>
              <PhotoFill name={p.name} photoUrl={p.photoUrl} width={colW} />
            </View>
            <View
              style={{
                height: PEDESTAL[i],
                backgroundColor: medal,
                borderBottomLeftRadius: 10,
                borderBottomRightRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 4,
              }}>
              <Text style={{ fontFamily: fonts.displayBlack, fontSize: PEDESTAL_NUM[i], lineHeight: PEDESTAL_NUM[i] + 2, color: cp.ink }}>
                {i + 1}
              </Text>
              <Text numberOfLines={1} style={{ fontFamily: i === 0 ? fonts.bodyBold : fonts.bodySemibold, fontSize: 12, color: cp.ink }}>
                {p.name} · {p.points}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Tile 3:4 a foto completa con degradado oscuro y el texto encima: etiqueta de
 * color (Varón, 7/2…), nombre y detalle. Tocarlo abre la ficha.
 */
export function PhotoTile({
  playerId,
  name,
  photoUrl,
  role,
  tag,
  tagColor,
  tagText,
  top,
  topColor,
  detail,
  big,
  align = 'left',
  ringColor,
}: {
  playerId: string;
  name: string;
  photoUrl?: string | null;
  role?: string | null;
  tag?: string;
  tagColor?: string;
  tagText?: string;
  /** Rótulo chico encima del nombre (#1). */
  top?: string;
  topColor?: string;
  detail?: string;
  /** Cifra grande debajo del nombre (puntos). */
  big?: string | number;
  align?: 'left' | 'right';
  ringColor?: string;
}) {
  const { width } = useWindowDimensions();
  const tileW = (width - 32 - 12) / 2;
  const right = align === 'right';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[tag, top, name, detail, big !== undefined ? `${big} puntos` : null].filter(Boolean).join(', ')}
      onPress={() => openPlayer(playerId)}
      className="flex-1 active:opacity-80">
      <View
        style={{
          aspectRatio: 3 / 4,
          borderRadius: 18,
          overflow: 'hidden',
          backgroundColor: cp.surface1,
          borderWidth: ringColor ? 3 : 0,
          borderColor: ringColor,
        }}>
        <PhotoFill name={name} photoUrl={photoUrl} role={role} width={tileW} />
        <LinearGradient
          pointerEvents="none"
          colors={[alpha(cp.surface0, 0), alpha(cp.surface0, 0.88)]}
          locations={[0, 0.55]}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 40, paddingHorizontal: 12, paddingBottom: 12, gap: 2, alignItems: right ? 'flex-end' : 'flex-start' }}>
          {tag ? (
            <Text
              style={{
                backgroundColor: tagColor,
                color: tagText,
                fontFamily: fonts.displayBlack,
                fontSize: 12,
                letterSpacing: 1.5,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 5,
                overflow: 'hidden',
              }}>
              {tag}
            </Text>
          ) : null}
          {top ? <Text style={{ fontFamily: fonts.displayBlack, fontSize: 13, letterSpacing: 1.5, color: topColor }}>{top}</Text> : null}
          <Text numberOfLines={1} style={{ fontFamily: fonts.displayBlack, fontSize: 20, color: cp.onSurface, textAlign: right ? 'right' : 'left' }}>
            {name}
          </Text>
          {big !== undefined ? <Text style={{ fontFamily: fonts.displayBlack, fontSize: 26, color: cp.onSurface }}>{big}</Text> : null}
          {detail ? <Text style={{ fontFamily: fonts.body, fontSize: 13, color: cp.onSurfaceMuted }}>{detail}</Text> : null}
        </LinearGradient>
      </View>
    </Pressable>
  );
}

/** Dos tiles lado a lado. */
export function TilePair({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', gap: 12 }, style]}>{children}</View>;
}

/** Círculo rojo "VS" del mano a mano, entre los dos tiles. */
export function VsBadge() {
  const c = useCP();
  return (
    <View
      pointerEvents="none"
      aria-hidden
      style={{
        position: 'absolute',
        left: '50%',
        top: '38%',
        width: 68,
        height: 68,
        marginLeft: -34,
        marginTop: -34,
        borderRadius: 34,
        backgroundColor: cp.primary,
        borderWidth: 4,
        borderColor: c.surface0,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: '-8deg' }],
        shadowColor: cp.surface0,
        shadowOpacity: 0.35,
        shadowRadius: 9,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
      }}>
      <Text style={{ fontFamily: fonts.displayBlackItalic, fontSize: 28, color: cp.onPrimary }}>VS</Text>
    </View>
  );
}
