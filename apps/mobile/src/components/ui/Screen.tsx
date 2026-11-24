/**
 * Contenedor de pantalla: fondo Noir, textura de papel sutil y safe area.
 *
 * - En pantallas con cabecera nativa (stack) la cabecera ya respeta el notch:
 *   usar `edges={['bottom']}` (por defecto).
 * - En tabs (sin cabecera nativa) usar `edges={['top']}`; la barra inferior
 *   ya respeta el borde de abajo.
 */
import paper from '@/assets/textures/paper.jpg';
import { Image, RefreshControl, ScrollView, View, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { noir } from '@/theme/colors';

type Props = ViewProps & {
  edges?: Edge[];
  /** Envuelve el contenido en ScrollView (por defecto true). */
  scroll?: boolean;
  /** Pull-to-refresh (solo con scroll). */
  refreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
  contentClassName?: string;
};

export function Screen({
  edges = ['bottom'],
  scroll = true,
  refreshing,
  onRefresh,
  className = '',
  contentClassName = '',
  children,
  ...rest
}: Props) {
  return (
    <View className={`flex-1 bg-noir-bg ${className}`} {...rest}>
      <Image
        source={paper}
        resizeMode="cover"
        className="absolute inset-0 h-full w-full opacity-[0.06]"
        accessibilityIgnoresInvertColors
        alt=""
      />
      <SafeAreaView edges={edges} style={{ flex: 1 }}>
        {scroll ? (
          <ScrollView
            contentContainerClassName={`px-4 pb-10 pt-4 gap-4 ${contentClassName}`}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={noir.gold} />
              ) : undefined
            }>
            {children}
          </ScrollView>
        ) : (
          <View className={`flex-1 px-4 pt-4 ${contentClassName}`}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}
