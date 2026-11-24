import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function CompartirScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Compartir' }} />
      <PlaceholderScreen title="Compartir" area="Torneo" webPath="/compartir" />
    </>
  );
}
