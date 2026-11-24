import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function ContactosScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Contactos' }} />
      <PlaceholderScreen title="Contactos" area="Jugador" webPath="/contactos" />
    </>
  );
}
