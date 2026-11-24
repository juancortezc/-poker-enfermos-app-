/**
 * Invitados de la fecha: /game-dates/[id]/edit-guests de la web (ver DateParticipantsEditor).
 */
import { Stack, useLocalSearchParams } from 'expo-router';

import { DateParticipantsEditor } from '@/components/admin/DateParticipantsEditor';
import { Header } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';
import { ErrorState } from '@/components/ui/States';

export default function EditDateGuestsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const gameDateId = parseInt(id ?? '', 10);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Invitados de la fecha' }} />
      <Header overline="Comisión" title="Editar invitados" />
      {Number.isInteger(gameDateId) ? (
        <DateParticipantsEditor gameDateId={gameDateId} mode="guests" />
      ) : (
        <ErrorState message="Fecha inválida." />
      )}
    </Screen>
  );
}
