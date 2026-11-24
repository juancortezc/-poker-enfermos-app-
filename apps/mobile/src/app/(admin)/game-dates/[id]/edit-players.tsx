/**
 * Jugadores de la fecha: /game-dates/[id]/edit-players de la web (ver DateParticipantsEditor).
 */
import { Stack, useLocalSearchParams } from 'expo-router';

import { DateParticipantsEditor } from '@/components/admin/DateParticipantsEditor';
import { Header } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';
import { ErrorState } from '@/components/ui/States';

export default function EditDatePlayersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const gameDateId = parseInt(id ?? '', 10);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Jugadores de la fecha' }} />
      <Header overline="Comisión" title="Editar jugadores" />
      {Number.isInteger(gameDateId) ? (
        <DateParticipantsEditor gameDateId={gameDateId} mode="players" />
      ) : (
        <ErrorState message="Fecha inválida." />
      )}
    </Screen>
  );
}
