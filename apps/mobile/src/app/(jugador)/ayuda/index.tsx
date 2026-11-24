import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function AyudaScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Ayuda' }} />
      <PlaceholderScreen title="Ayuda" area="Jugador" webPath="/ayuda" />
    </>
  );
}
