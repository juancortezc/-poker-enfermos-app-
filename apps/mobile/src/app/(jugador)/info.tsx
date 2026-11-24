import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function InfoScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Info' }} />
      <PlaceholderScreen title="Info" area="Jugador" webPath="/info" />
    </>
  );
}
