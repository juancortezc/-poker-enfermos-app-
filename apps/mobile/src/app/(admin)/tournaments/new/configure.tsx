import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function TournamentsNewConfigureScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Configurar torneo' }} />
      <PlaceholderScreen title="Configurar torneo" area="Comisión" webPath="/tournaments/new/configure" />
    </>
  );
}
