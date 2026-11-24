import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function PropuestasV2Screen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Propuestas' }} />
      <PlaceholderScreen title="Propuestas" area="Torneo" webPath="/propuestas-v2" />
    </>
  );
}
