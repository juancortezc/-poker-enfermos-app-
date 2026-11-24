import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function PerfilScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Perfil' }} />
      <PlaceholderScreen title="Perfil" area="Jugador" webPath="/perfil" />
    </>
  );
}
