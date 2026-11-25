/**
 * Visor de una foto a pantalla completa: fondo negro, la imagen entera
 * (`contain`) y tres formas de cerrar: tocar en cualquier lado, deslizar hacia
 * arriba o abajo, o el botón ✕ (44 pt). Lo abre PlayerCard con `zoomable`, y
 * sirve igual para cualquier otra imagen.
 *
 * `placeholderUri` es la versión chica que ya está en caché (la de la tarjeta
 * en pantalla): se ve al instante mientras baja la grande. Con "reducir
 * movimiento" el visor aparece y se va sin animación.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { motion } from '@poker/design';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, PanResponder, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { alpha, cp } from '@/theme/colors';

type Props = {
  visible: boolean;
  uri: string;
  placeholderUri?: string | null;
  /** Ancho / alto de la imagen (2/3 la tarjeta, 3/4 la foto). */
  aspect?: number;
  /** Nombre para el lector de pantalla. */
  label: string;
  onClose: () => void;
};

/** Distancia (pt) o velocidad a partir de la cual soltar cierra el visor. */
const DISMISS_DISTANCE = 90;
const DISMISS_VELOCITY = 1.2;

export function PhotoViewer({ visible, uri, placeholderUri, aspect = 2 / 3, label, onClose }: Props) {
  const reduce = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [dy] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (visible) dy.setValue(0);
  }, [visible, dy]);

  // Cabe entero con un margen de 16 a los lados.
  const maxW = width - 32;
  const maxH = height - insets.top - insets.bottom - 96;
  const imgW = Math.min(maxW, maxH * aspect);
  const imgH = imgW / aspect;

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => dy.setValue(g.dy),
      onPanResponderRelease: (_e, g) => {
        if (Math.abs(g.dy) > DISMISS_DISTANCE || Math.abs(g.vy) > DISMISS_VELOCITY) {
          onCloseRef.current();
        } else {
          Animated.timing(dy, { toValue: 0, duration: motion.fast, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => dy.setValue(0),
    }),
  );

  const fade = dy.interpolate({ inputRange: [-300, 0, 300], outputRange: [0.4, 1, 0.4], extrapolate: 'clamp' });

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduce ? 'none' : 'fade'}
      statusBarTranslucent
      navigationBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: cp.surface0, opacity: fade }]} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
        accessibilityHint="Toca o desliza para cerrar"
        onPress={onClose}
        style={StyleSheet.absoluteFill}
        {...pan.panHandlers}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ width: imgW, height: imgH, transform: [{ translateY: dy }] }}>
            <Image
              source={{ uri }}
              placeholder={placeholderUri ? { uri: placeholderUri } : undefined}
              placeholderContentFit="contain"
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
              transition={reduce ? 0 : motion.normal}
              accessibilityLabel={label}
              accessibilityIgnoresInvertColors
            />
          </Animated.View>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar la foto"
        onPress={onClose}
        hitSlop={8}
        style={{
          position: 'absolute',
          top: insets.top + 8,
          right: 12,
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: alpha(cp.surface2, 0.7),
        }}
        className="active:opacity-70">
        <Ionicons name="close" size={24} color={cp.onSurface} />
      </Pressable>
    </Modal>
  );
}
