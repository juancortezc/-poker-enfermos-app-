import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function TournamentsIdEditScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Editar torneo' }} />
      <PlaceholderScreen title="Editar torneo" area="Comisión" webPath="/tournaments/[id]/edit" />
    </>
  );
}
