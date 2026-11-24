import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function GameDatesIdEditPlayersScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Jugadores de la fecha' }} />
      <PlaceholderScreen title="Jugadores de la fecha" area="Comisión" webPath="/game-dates/[id]/edit-players" />
    </>
  );
}
