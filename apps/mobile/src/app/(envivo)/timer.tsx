import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function TimerScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Timer' }} />
      <PlaceholderScreen title="Timer" area="En vivo" webPath="/timer" />
    </>
  );
}
