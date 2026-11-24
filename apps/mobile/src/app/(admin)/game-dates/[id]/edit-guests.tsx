import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function GameDatesIdEditGuestsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Invitados de la fecha' }} />
      <PlaceholderScreen title="Invitados de la fecha" area="Comisión" webPath="/game-dates/[id]/edit-guests" />
    </>
  );
}
