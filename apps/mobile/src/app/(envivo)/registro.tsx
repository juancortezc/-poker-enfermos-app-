import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function RegistroScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Registro' }} />
      <PlaceholderScreen title="Registro" area="En vivo" webPath="/registro" />
    </>
  );
}
