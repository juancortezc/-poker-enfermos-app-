/**
 * Recordatorio para quien entra con una clave vieja (4 números). Igual que en
 * la web: se evalúa la clave guardada en el dispositivo contra la regla actual
 * sin preguntarle nada al servidor, y se puede posponer una semana.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { isValidPinForCreation, PIN_RULE_TEXT } from '@poker/shared';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { NoirButton } from '@/components/ui/NoirButton';
import { NoirCard } from '@/components/ui/NoirCard';
import { Body, Muted } from '@/components/ui/Typography';
import { authStorage } from '@/lib/secure-auth-storage';
import { noir } from '@/theme/colors';

const SNOOZE_KEY = 'clave_debil_pospuesta';
const DIAS_SNOOZE = 7;

export function ClaveDebilBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pin = await authStorage.getPin();
      if (!pin || isValidPinForCreation(pin)) return;
      const snoozed = await SecureStore.getItemAsync(SNOOZE_KEY).catch(() => null);
      const when = snoozed ? new Date(snoozed).getTime() : NaN;
      if (!Number.isNaN(when) && Date.now() - when < DIAS_SNOOZE * 86400000) return;
      if (!cancelled) setVisible(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  const posponer = () => {
    setVisible(false);
    SecureStore.setItemAsync(SNOOZE_KEY, new Date().toISOString()).catch(() => {});
  };

  return (
    <NoirCard className="flex-row items-start gap-3" style={{ borderColor: `${noir.copper}AA` }}>
      <Ionicons name="shield-outline" size={22} color={noir.copper} />
      <View className="flex-1 gap-2">
        <Body className="font-inter-semibold text-base">Actualizá tu clave</Body>
        <Muted>
          La tuya es de las viejas, de cuatro números: son diez mil combinaciones y se adivinan solas. Ahora la clave admite
          letras. {PIN_RULE_TEXT}.
        </Muted>
        <NoirButton title="Cambiarla ahora" variant="copper" onPress={() => router.push('/perfil')} className="self-start" />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Recordármelo después"
        onPress={posponer}
        hitSlop={12}
        className="h-8 w-8 items-center justify-center rounded-full active:bg-noir-raised">
        <Ionicons name="close" size={18} color={noir.muted} />
      </Pressable>
    </NoirCard>
  );
}
