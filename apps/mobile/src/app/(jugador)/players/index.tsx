import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function PlayersScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Jugadores' }} />
      <PlaceholderScreen title="Jugadores" area="Jugador" webPath="/players" />
    </>
  );
}
