import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function AdminScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Admin' }} />
      <PlaceholderScreen title="Admin" area="Comisión" webPath="/admin" />
    </>
  );
}
