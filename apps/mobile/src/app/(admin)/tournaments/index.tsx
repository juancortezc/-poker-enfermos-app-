import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function TournamentsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Torneos' }} />
      <PlaceholderScreen title="Torneos" area="Comisión" webPath="/tournaments" />
    </>
  );
}
