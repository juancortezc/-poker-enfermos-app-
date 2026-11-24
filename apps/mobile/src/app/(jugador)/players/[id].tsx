import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function PlayersIdScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Jugador' }} />
      <PlaceholderScreen title="Jugador" area="Jugador" webPath="/players/[id]" />
    </>
  );
}
