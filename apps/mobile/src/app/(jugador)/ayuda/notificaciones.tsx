/**
 * Ayuda de notificaciones. La web explica cómo instalar la PWA en iPhone para
 * recibir push; en la app eso no hace falta: las notificaciones son nativas y
 * solo dependen del permiso del sistema.
 *
 * El estado del permiso y el botón de activar llegan con expo-notifications
 * (área En Vivo, F4). Mientras, la pantalla explica el camino y lleva a los
 * Ajustes del sistema, que es donde se arregla un "no" dado sin querer.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { Linking, Platform, View } from 'react-native';

import { CPButton } from '@/components/ui/CPButton';
import { CPCard } from '@/components/ui/CPCard';
import { Screen } from '@/components/ui/Screen';
import { Body, Muted, Title } from '@/components/ui/Typography';
import { cpLight as c } from '@/theme/colors';

const AJUSTES = Platform.OS === 'ios' ? 'Ajustes → Notificaciones → Poker Enfermos' : 'Ajustes → Apps → Poker Enfermos → Notificaciones';

const PASOS: { icon: React.ComponentProps<typeof Ionicons>['name']; titulo: string; detalle: string }[] = [
  {
    icon: 'notifications-outline',
    titulo: 'Aceptá el permiso',
    detalle: 'La primera vez que la app lo pida, respondé que sí. Es lo único que hace falta: no hay que instalar nada más.',
  },
  {
    icon: 'timer-outline',
    titulo: 'Qué te va a llegar',
    detalle: 'Avisos del timer (cambio de nivel, la cena), eliminaciones de la fecha en vivo, el ganador y anuncios de la Comisión.',
  },
  {
    icon: 'settings-outline',
    titulo: 'Si dijiste que no',
    detalle: `El sistema no vuelve a preguntar. Hay que habilitarlas a mano en ${AJUSTES}.`,
  },
];

export default function AyudaNotificacionesScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Notificaciones' }} />
      <Screen tone="light">
        <View className="gap-1">
          <Title className="text-xl">Notificaciones en la app</Title>
          <Muted>En el teléfono las notificaciones son nativas: funcionan igual en iPhone y Android.</Muted>
        </View>

        <CPCard className="gap-4">
          {PASOS.map((p, i) => (
            <View key={p.titulo} className="flex-row items-start gap-3">
              <View className="h-7 w-7 items-center justify-center rounded-full bg-cp-primary">
                <Body className="font-inter-bold text-sm text-white">{i + 1}</Body>
              </View>
              <View className="flex-1 gap-1">
                <View className="flex-row items-center gap-2">
                  <Ionicons name={p.icon} size={16} color={c.onSurfaceMuted} />
                  <Body className="font-inter-semibold text-base">{p.titulo}</Body>
                </View>
                <Muted>{p.detalle}</Muted>
              </View>
            </View>
          ))}
        </CPCard>

        <CPButton
          title="Abrir ajustes del sistema"
          icon={<Ionicons name="settings-outline" size={18} color="white" />}
          onPress={() => Linking.openSettings().catch(() => {})}
        />
      </Screen>
    </>
  );
}
