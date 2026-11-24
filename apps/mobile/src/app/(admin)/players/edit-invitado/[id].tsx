import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function PlayersEditInvitadoIdScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Editar invitado' }} />
      <PlaceholderScreen title="Editar invitado" area="Comisión" webPath="/players/edit-invitado/[id]" />
    </>
  );
}
