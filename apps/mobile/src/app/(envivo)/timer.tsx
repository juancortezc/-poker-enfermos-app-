/**
 * Timer de blinds. Paridad con apps/web/src/app/timer/page.tsx: números
 * enormes para mirarse de lejos, destello a pantalla completa en cada aviso y
 * controles solo para la Comisión.
 *
 * La cuenta regresiva la calcula timer-engine (@poker/shared) a partir del
 * estado del servidor; la pantalla puede dormirse o abrirse a mitad de la
 * noche y siempre muestra lo mismo que las demás.
 */
import { useKeepAwake } from 'expo-keep-awake';
import { Stack, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertHints } from '@/components/envivo/AlertHints';
import { TimerControls } from '@/components/envivo/TimerControls';
import { DINNER_AFTER_LEVEL, formatChips, formatRemaining, isDinnerBreak } from '@/components/envivo/timer-view';
import { useActiveGameDate } from '@/hooks/useActiveGameDate';
import { useBlindTimer } from '@/components/envivo/useBlindTimer';
import { useTimerAlerts } from '@/components/envivo/useTimerAlerts';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { cp, fonts } from '@/theme/colors';

// Destellos a pantalla completa: los mismos fondos que el timer de la web
// (apps/web/src/app/timer/page.tsx). Son exclusivos de esta pantalla.
const FLASH_BG = {
  'one-minute': '#4A3708',
  'level-change': '#7F1D1D',
} as const;

export default function TimerScreen() {
  // Pantalla siempre encendida mientras el timer está visible.
  useKeepAwake('envivo-timer');
  // Pantalla oscura: la barra de estado en claro aunque se llegue desde una clara.
  useFocusEffect(useCallback(() => setStatusBarStyle('light', true), []));

  const { can } = useAuth();
  // El control del timer es gestión de la fecha: solo Comisión (la web
  // compara role === 'Comision'; 'game-dates' es exactamente ese rol).
  const canControl = can('game-dates');

  const { gameDate, error: dateError, isLoading: dateLoading, refresh } = useActiveGameDate({ refreshInterval: 30_000 });
  // El timer existe desde que la fecha arranca; con CREATED daría inactivo.
  const timerDateId = gameDate ? gameDate.id : null;
  const {
    view,
    levels,
    control,
    error: timerError,
    isLoading: timerLoading,
  } = useBlindTimer(timerDateId, gameDate?.tournament.id ?? null);
  const { flash, permission, exactAlarms, setExactAlarms } = useTimerAlerts(view, levels, gameDate?.dateNumber ?? null);

  const header = <Stack.Screen options={{ title: 'Timer' }} />;

  if (dateLoading || (timerDateId && timerLoading && !view)) {
    return (
      <Screen>
        {header}
        <LoadingState message="Cargando el timer…" />
      </Screen>
    );
  }
  if (dateError) {
    return (
      <Screen>
        {header}
        <ErrorState error={dateError} onRetry={() => refresh()} />
      </Screen>
    );
  }
  if (!gameDate) {
    return (
      <Screen>
        {header}
        <EmptyState message="No hay fecha activa" icon="timer-outline" />
      </Screen>
    );
  }
  if (gameDate.status === 'CREATED') {
    return (
      <Screen>
        {header}
        <EmptyState
          message={`La fecha ${gameDate.dateNumber} todavía no empezó. El timer arranca solo al iniciarla desde Registro.`}
          icon="timer-outline"
        />
      </Screen>
    );
  }

  const paused = view?.status === 'paused';
  const finished = view?.status === 'completed';
  const critical = view?.status === 'active' && !view.isUnlimited && view.remainingMs <= 60_000 && view.remainingMs > 0;
  const dinner = view ? isDinnerBreak(view) : false;

  const statusLine = !view
    ? ''
    : dinner
      ? 'PAUSA DE CENA'
      : paused
        ? 'PAUSADO'
        : finished
          ? 'ESTRUCTURA TERMINADA'
          : view.status === 'inactive'
            ? 'SIN INICIAR'
            : view.nextLevel != null
              ? `Sigue: ${formatChips(view.nextSmallBlind)}/${formatChips(view.nextBigBlind)}`
              : 'Último nivel';

  // Pausado en amarillo, ultimo minuto en rojo-texto, como la web.
  const countdownColor = paused ? cp.warning : critical ? cp.primaryLight : '#FFFFFF';

  return (
    // Sin <Screen>: el fondo entero cambia de color con el destello.
    <View className="flex-1" style={{ backgroundColor: flash ? FLASH_BG[flash.kind] : cp.surface0 }}>
      {header}
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <View className="flex-1 justify-center gap-4 px-4 pb-6 pt-4">
          {flash ? (
            <Text
              accessibilityLiveRegion="assertive"
              className="text-center font-display-black text-4xl tracking-wide text-white"
              adjustsFontSizeToFit
              numberOfLines={1}>
              {flash.message}
            </Text>
          ) : null}

          <View className="items-center">
            <Text className="font-inter-medium text-sm uppercase tracking-[3.4px] text-white/45">
              Fecha {gameDate.dateNumber} · Nivel {view?.level ?? 1}
            </Text>

            <Text
              className="mt-2 text-6xl text-white"
              style={{ fontFamily: fonts.displayBlack, fontVariant: ['tabular-nums'], letterSpacing: -1 }}
              adjustsFontSizeToFit
              numberOfLines={1}>
              {formatChips(view?.smallBlind)}/{formatChips(view?.bigBlind)}
            </Text>

            <Text
              accessibilityLabel={
                view?.isUnlimited ? 'Sin límite' : `Faltan ${formatRemaining(view?.remainingMs ?? 0)}`
              }
              className={critical ? 'opacity-90' : ''}
              style={{
                fontFamily: fonts.displayBlack,
                letterSpacing: -3,
                fontSize: 112,
                lineHeight: 124,
                color: countdownColor,
                fontVariant: ['tabular-nums'],
              }}
              adjustsFontSizeToFit
              numberOfLines={1}>
              {view?.isUnlimited ? 'SIN LÍMITE' : formatRemaining(view?.remainingMs ?? 0)}
            </Text>

            <Text
              className={`mt-1 text-center font-inter-semibold text-lg ${dinner || paused ? 'text-cp-warning' : 'text-white/50'}`}>
              {statusLine}
            </Text>

            {view?.status === 'active' && view.level === DINNER_AFTER_LEVEL && levels.length > DINNER_AFTER_LEVEL ? (
              <Text className="mt-2 text-center font-inter text-sm text-white/50">
                Al terminar este nivel: pausa de cena
              </Text>
            ) : null}
          </View>

          {timerError ? <ErrorState error={timerError} /> : null}

          <View className="mt-4 gap-3">
            <TimerControls view={view} canControl={canControl} onAction={control} />
            <AlertHints permission={permission} exactAlarms={exactAlarms} onExactAlarms={setExactAlarms} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
