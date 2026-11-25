/**
 * Grilla de bloques del home: bento.ts de la web, con los valores de
 * @poker/design. Dos columnas; cada bloque ocupa una o las dos y tiene su
 * tratamiento (papel, negro, rosa, verde, oro). Sobre papel hacen falta
 * anclas: el negro, el rojo y el rosa son piezas dentro de la pantalla.
 *
 * Entrada escalonada por bloque (`cp-rise`) y cifras que cuentan al aparecer,
 * todo bajo "reducir movimiento" del sistema.
 */
import { bento, motion, type TileStyle, type TileTone } from '@poker/design';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { Easing, FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { fonts } from '@/theme/colors';
import { useCP } from '@/theme/tone';

const { tileLayout, overline: OVERLINE } = bento;
export const ON_COLOR = bento.onColor;
export const METAL = bento.metalOnLight;
export const GOLD_RULE = bento.goldRule;

/** ¿El sistema pide menos movimiento? (null mientras se consulta). */
export function useReduceMotion(): boolean | null {
  const [reduce, setReduce] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setReduce(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/** Cuenta de 0 al valor (easeOutCubic), o el valor de una con movimiento reducido. */
export function useCountUp(target: number, duration: number = motion.countUp): number {
  const reduce = useReduceMotion();
  const [anim, setAnim] = useState<{ target: number; value: number } | null>(null);
  useEffect(() => {
    if (reduce !== false) return;
    let raf = 0;
    const t0 = Date.now();
    const step = () => {
      const p = Math.min(1, (Date.now() - t0) / duration);
      setAnim({ target, value: Math.round(target * (1 - Math.pow(1 - p, 3))) });
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduce]);
  // Con movimiento reducido, el valor final de una; si no, desde 0.
  if (reduce === true) return target;
  return anim?.target === target ? anim.value : 0;
}

/** Cifra de marcador (`.cp-score`) que cuenta al aparecer. */
export function BigScore({
  value,
  size,
  color,
  prefix,
  style,
}: {
  value: number;
  size: number;
  color: string;
  prefix?: string;
  style?: StyleProp<TextStyle>;
}) {
  const shown = useCountUp(Math.abs(value));
  return (
    <Text
      style={[
        {
          fontFamily: fonts.display,
          fontSize: size,
          lineHeight: Math.round(size * 1.05),
          letterSpacing: -0.03 * size,
          color,
          fontVariant: ['tabular-nums'],
        },
        style,
      ]}>
      {prefix}
      {value < 0 ? '−' : ''}
      {shown}
    </Text>
  );
}

/** "#" chico arriba y la cifra grande, como en la web. */
export function HashScore({ value, size, color, hashColor }: { value: number; size: number; color: string; hashColor: string }) {
  return (
    <View className="flex-row items-start">
      <Text style={{ fontFamily: fonts.display, fontSize: size * 0.43, lineHeight: size * 0.6, color: hashColor, marginTop: size * 0.08 }}>#</Text>
      <BigScore value={value} size={size} color={color} />
    </View>
  );
}

/** Rotulo chico en mayuscula: el extremo bajo de la escala. */
export function TileOverline({ children, color, style }: { children: React.ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  const c = useCP();
  return (
    <Text
      style={[
        {
          fontFamily: fonts.display,
          fontSize: 11,
          letterSpacing: OVERLINE.letterSpacing * 11,
          textTransform: 'uppercase',
          color: color ?? c.onSurfaceVariant,
        },
        style,
      ]}>
      {children}
    </Text>
  );
}

/** Enlace de texto "TABLA →" en rojo. */
export function TileLink({ title, onPress, color, style }: { title: string; onPress: () => void; color?: string; style?: StyleProp<ViewStyle> }) {
  const c = useCP();
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={12} style={style} className="active:opacity-60">
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12.5, letterSpacing: 0.5, color: color ?? c.primaryLight }}>{title} →</Text>
    </Pressable>
  );
}

function shadowOf(s: TileStyle['shadow']): ViewStyle {
  const m = s.color.match(/rgba?\(([^)]+)\)/);
  const parts = m ? m[1].split(',').map((x) => x.trim()) : ['0', '0', '0', '0.1'];
  return {
    shadowColor: `rgb(${parts[0]},${parts[1]},${parts[2]})`,
    shadowOpacity: Number(parts[3] ?? 0.1),
    shadowRadius: s.blur / 2,
    shadowOffset: { width: s.x, height: s.y },
    elevation: Math.max(2, Math.round(s.y / 2)),
  };
}

type TileProps = {
  tone: TileTone | 'rojo';
  /** 1 = media columna, 2 = ancho completo. */
  span?: 1 | 2;
  /** Orden de entrada (0, 1, 2…) para el escalonado. */
  index?: number;
  padding?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

/** Un bloque de la grilla. */
export function Tile({ tone, span = 2, index = 0, padding = tileLayout.padding, style, children }: TileProps) {
  const c = useCP();
  const t: TileStyle = tone === 'rojo' ? bento.tileRojo : bento.tile[tone];
  const border = t.border?.startsWith('var(') ? c.surfaceBorder : t.border;
  const stagger = motion.rise.stagger;
  const delay = stagger[Math.min(index, stagger.length - 1)];
  return (
    <Animated.View
      entering={FadeInDown.duration(motion.rise.duration).delay(delay).easing(Easing.bezier(0.22, 1, 0.36, 1)).reduceMotion(ReduceMotion.System)}
      style={[
        { flexBasis: span === 2 ? '100%' : 0, flexGrow: 1, borderRadius: tileLayout.radius, minWidth: 0 },
        shadowOf(t.shadow),
        style,
      ]}>
      <LinearGradient
        colors={[t.from, t.to]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{
          flex: 1,
          borderRadius: tileLayout.radius,
          padding,
          overflow: 'hidden',
          borderWidth: border ? 1 : 0,
          borderColor: border,
        }}>
        {children}
      </LinearGradient>
    </Animated.View>
  );
}

/** Fila de bloques de media columna. */
export function TileRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: tileLayout.gap, alignItems: 'stretch' }}>{children}</View>;
}

/** La grilla (columna con el gap del bento). */
export function Bento({ children }: { children: React.ReactNode }) {
  return <View style={{ gap: tileLayout.gap }}>{children}</View>;
}
