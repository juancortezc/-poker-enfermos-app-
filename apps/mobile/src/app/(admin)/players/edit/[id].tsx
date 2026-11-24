import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function PlayersEditIdScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Editar jugador' }} />
      <PlaceholderScreen title="Editar jugador" area="Comisión" webPath="/players/edit/[id]" />
    </>
  );
}
