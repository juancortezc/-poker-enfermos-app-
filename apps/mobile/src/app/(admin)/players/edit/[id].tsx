/**
 * Editar Enfermo o Comisión: /players/edit/[id] de la web. Si el id es de un
 * invitado se muestra su formulario, para no convertirlo en Enfermo sin querer.
 */
import { Stack, useLocalSearchParams } from 'expo-router';
import useSWR from 'swr';

import { adminKeys } from '@/components/admin/api';
import { InvitadoForm, type EditableInvitado } from '@/components/admin/InvitadoForm';
import { PlayerForm, type EditablePlayer } from '@/components/admin/PlayerForm';
import { Header } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/States';

export default function EditPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, isLoading, mutate } = useSWR<EditablePlayer & EditableInvitado>(id ? adminKeys.player(id) : null);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Editar jugador' }} />
      <Header overline="Comisión" title={data ? `${data.firstName} ${data.lastName}`.trim() : 'Editar jugador'} />
      {isLoading && !data ? (
        <LoadingState />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={() => mutate()} />
      ) : data ? (
        data.role === 'Invitado' ? (
          <InvitadoForm key={data.id} invitado={data} />
        ) : (
          <PlayerForm key={data.id} player={data} />
        )
      ) : null}
    </Screen>
  );
}
