import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function CalendarioScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Calendario' }} />
      <PlaceholderScreen title="Calendario" area="Jugador" webPath="/calendario" />
    </>
  );
}
