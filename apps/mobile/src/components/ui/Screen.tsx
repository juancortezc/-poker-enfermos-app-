/**
 * Contenedor de pantalla Clean Poker: fondo del tono, safe area y cabecera.
 *
 * - `tone`: 'light' (papel, como casi toda la web) o 'dark' (en vivo, timer,
 *   registro, propuestas, formularios). Publica las variables del tono para
 *   todo lo de adentro y ajusta la cabecera nativa y la barra de estado.
 * - `appBar`: la barra de arriba de la web (CPHeader) — para las pestañas,
 *   que no tienen cabecera nativa.
 * - En pantallas con cabecera nativa (stack) usar `edges={['bottom']}` (por
 *   defecto). En tabs, `edges={['top']}`. Si la pantalla tiene la barra
 *   inferior debajo (CPTabBar), el borde de abajo se ignora: lo reserva ella.
 */
import { useFocusEffect, useNavigation } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useLayoutEffect } from 'react';
import { RefreshControl, ScrollView, View, type ViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useHasTabBar } from '@/components/navigation/CPTabBar';
import { CPHeader } from '@/components/ui/CPHeader';
import { fonts } from '@/theme/colors';
import { ToneView, type Tone } from '@/theme/tone';
import { tones } from '@poker/design';

type Props = ViewProps & {
  edges?: Edge[];
  tone?: Exclude<Tone, 'paper'>;
  appBar?: boolean;
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
  tone = 'dark',
  appBar = false,
  scroll = true,
  refreshing,
  onRefresh,
  className = '',
  contentClassName = '',
  children,
  ...rest
}: Props) {
  const c = tones[tone];
  const navigation = useNavigation();
  // Con la barra inferior debajo, el borde seguro de abajo ya lo reserva ella.
  const hasTabBar = useHasTabBar();
  const safeEdges = hasTabBar ? edges.filter((e) => e !== 'bottom') : edges;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: c.surface0 },
      headerTintColor: c.onSurface,
      headerTitleStyle: { fontFamily: fonts.display, color: c.onSurface },
      contentStyle: { backgroundColor: c.surface0 },
    });
  }, [navigation, c]);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(tone === 'light' ? 'dark' : 'light', true);
    }, [tone]),
  );

  return (
    <ToneView tone={tone} className={`flex-1 bg-cp-surface-0 ${className}`} {...rest}>
      {tone === 'light' && appBar ? (
        // El resplandor rojo arriba de CPAppShell en claro.
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(229,57,53,0.07)', 'rgba(229,57,53,0)']}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 320 }}
        />
      ) : null}
      <SafeAreaView edges={safeEdges} style={{ flex: 1 }}>
        {appBar ? <CPHeader /> : null}
        {scroll ? (
          <ScrollView
            contentContainerClassName={`px-4 pb-10 pt-4 gap-4 ${contentClassName}`}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={!!refreshing}
                  onRefresh={onRefresh}
                  tintColor={c.primary}
                  colors={[c.primary]}
                  progressBackgroundColor={c.surface1}
                />
              ) : undefined
            }>
            {children}
          </ScrollView>
        ) : (
          <View className={`flex-1 px-4 pt-4 ${contentClassName}`}>{children}</View>
        )}
      </SafeAreaView>
    </ToneView>
  );
}
