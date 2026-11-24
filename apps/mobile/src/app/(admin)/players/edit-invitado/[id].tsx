/**
 * Editar invitado: /players/edit-invitado/[id] de la web.
 */
import { Stack, useLocalSearchParams } from 'expo-router';
import useSWR from 'swr';

import { adminKeys } from '@/components/admin/api';
import { Notice } from '@/components/admin/Form';
import { InvitadoForm, type EditableInvitado } from '@/components/admin/InvitadoForm';
import { Header } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/States';

export default function EditInvitadoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, isLoading, mutate } = useSWR<EditableInvitado & { role: string }>(id ? adminKeys.player(id) : null);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Editar invitado' }} />
      <Header overline="Comisión" title={data ? `${data.firstName} ${data.lastName}`.trim() : 'Editar invitado'} />
      {isLoading && !data ? (
        <LoadingState />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={() => mutate()} />
      ) : data ? (
        data.role !== 'Invitado' ? (
          <Notice tone="danger">Este jugador no es invitado. Editalo desde su ficha de Enfermo.</Notice>
        ) : (
          <InvitadoForm key={data.id} invitado={data} />
        )
      ) : null}
    </Screen>
  );
}
