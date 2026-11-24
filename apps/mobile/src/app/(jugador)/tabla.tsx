import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function TablaScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Tabla completa' }} />
      <PlaceholderScreen title="Tabla completa" area="Jugador" webPath="/tabla" />
    </>
  );
}
