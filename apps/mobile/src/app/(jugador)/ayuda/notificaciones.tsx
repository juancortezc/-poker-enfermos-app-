import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function AyudaNotificacionesScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Notificaciones' }} />
      <PlaceholderScreen title="Notificaciones" area="Jugador" webPath="/ayuda/notificaciones" />
    </>
  );
}
