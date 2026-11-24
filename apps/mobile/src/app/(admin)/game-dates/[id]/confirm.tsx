import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function GameDatesIdConfirmScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Confirmar fecha' }} />
      <PlaceholderScreen title="Confirmar fecha" area="Comisión" webPath="/game-dates/[id]/confirm" />
    </>
  );
}
