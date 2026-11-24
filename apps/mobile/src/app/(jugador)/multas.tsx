import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function MultasScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Multas' }} />
      <PlaceholderScreen title="Multas" area="Jugador" webPath="/multas" />
    </>
  );
}
