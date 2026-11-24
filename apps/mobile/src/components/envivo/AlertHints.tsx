/**
 * Avisos sobre los permisos que hacen falta para que el timer suene con la
 * app en segundo plano.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, Pressable, View } from 'react-native';

import { Muted } from '@/components/ui/Typography';
import { noir } from '@/theme/colors';

import { requestExactAlarms } from './timer-alerts';
import type { AlertPermission } from './timer-alerts';

export function AlertHints({
  permission,
  exactAlarms,
  onExactAlarms,
}: {
  permission: AlertPermission | null;
  exactAlarms: boolean;
  onExactAlarms: (granted: boolean) => void;
}) {
  if (permission === 'denied') {
    return (
      <Hint
        text="Las notificaciones están desactivadas: el timer no va a sonar con la app cerrada. Tocá para abrir Ajustes."
        onPress={() => Linking.openSettings()}
      />
    );
  }
  if (permission === 'granted' && !exactAlarms) {
    return (
      <Hint
        text="Android puede atrasar los avisos unos minutos. Tocá para permitir alarmas exactas."
        onPress={async () => onExactAlarms(await requestExactAlarms())}
      />
    );
  }
  return null;
}

function Hint({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-[44px] flex-row items-center gap-2 rounded-xl border border-noir-copper/60 px-3 py-2 active:opacity-80">
      <Ionicons name="notifications-off-outline" size={18} color={noir.gold} />
      <View className="flex-1">
        <Muted>{text}</Muted>
      </View>
    </Pressable>
  );
}
