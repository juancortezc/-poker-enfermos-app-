import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function PlayersNewScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Nuevo jugador' }} />
      <PlaceholderScreen title="Nuevo jugador" area="Comisión" webPath="/players/new" />
    </>
  );
}
