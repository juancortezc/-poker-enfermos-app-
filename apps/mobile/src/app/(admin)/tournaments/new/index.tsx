import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function TournamentsNewScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Nuevo torneo' }} />
      <PlaceholderScreen title="Nuevo torneo" area="Comisión" webPath="/tournaments/new" />
    </>
  );
}
