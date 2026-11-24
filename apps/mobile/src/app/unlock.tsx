/**
 * Desbloqueo con biometría al abrir la app (solo si el usuario la activó).
 * Se lanza sola al entrar; si falla o se cancela, queda el botón para
 * reintentar y la salida "Usar clave".
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import logo from '@/assets/icons/favicon-512.png';
import { NoirButton } from '@/components/ui/NoirButton';
import { Screen } from '@/components/ui/Screen';
import { Muted, Title } from '@/components/ui/Typography';
import { useAuth } from '@/contexts/AuthContext';
import { noir } from '@/theme/colors';

export default function UnlockScreen() {
  const { user, unlock, switchToPin, biometric } = useAuth();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  const tryUnlock = async () => {
    setBusy(true);
    const ok = await unlock();
    if (!ok) {
      setFailed(true);
      setBusy(false);
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void tryUnlock();
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen edges={['top', 'bottom']} contentClassName="flex-grow justify-center gap-8">
      <View className="items-center gap-3">
        <Image source={logo} style={{ width: 120, height: 120 }} contentFit="contain" alt="Poker Enfermos" />
        <Title className="text-center">{user ? `Hola, ${user.firstName}` : 'Poker Enfermos'}</Title>
        <Muted className="text-center">
          {failed ? `No se pudo verificar con ${biometric.label}.` : `Desbloqueá con ${biometric.label}.`}
        </Muted>
      </View>

      <View className="items-center">
        <Ionicons
          name={biometric.kind === 'faceid' ? 'scan-outline' : 'finger-print-outline'}
          size={72}
          color={noir.gold}
        />
      </View>

      <View className="gap-3">
        <NoirButton title={`Usar ${biometric.label}`} size="lg" onPress={tryUnlock} loading={busy} />
        <NoirButton title="Usar clave" variant="ghost" onPress={switchToPin} disabled={busy} />
      </View>
    </Screen>
  );
}
