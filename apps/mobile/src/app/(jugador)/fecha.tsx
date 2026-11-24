import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function FechaScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Fecha' }} />
      <PlaceholderScreen title="Fecha" area="Jugador" webPath="/fecha" />
    </>
  );
}
