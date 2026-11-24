/**
 * Nuevo jugador: /players/new de la web. Con `?type=invitado` muestra el
 * formulario de invitado, igual que allí.
 */
import { Stack, useLocalSearchParams } from 'expo-router';

import { InvitadoForm } from '@/components/admin/InvitadoForm';
import { PlayerForm } from '@/components/admin/PlayerForm';
import { Header } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';

export default function NewPlayerScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  const invitado = type === 'invitado';

  return (
    <Screen>
      <Stack.Screen options={{ title: invitado ? 'Nuevo invitado' : 'Nuevo jugador' }} />
      <Header overline="Comisión" title={invitado ? 'Nuevo invitado' : 'Nuevo jugador'} />
      {invitado ? <InvitadoForm /> : <PlayerForm />}
    </Screen>
  );
}
