import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function TournamentsIdScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Torneo' }} />
      <PlaceholderScreen title="Torneo" area="Comisión" webPath="/tournaments/[id]" />
    </>
  );
}
