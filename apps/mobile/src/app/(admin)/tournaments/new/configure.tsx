/**
 * Nuevo torneo, paso 2: jugadores, calendario y blinds (TournamentForm de la
 * web en /tournaments/new/configure?number=N).
 */
import { Stack, useLocalSearchParams } from 'expo-router';

import { useMembers } from '@/components/admin/api';
import { TournamentForm } from '@/components/admin/TournamentForm';
import { Header } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/States';

export default function ConfigureTournamentScreen() {
  const { number: raw } = useLocalSearchParams<{ number?: string }>();
  const number = parseInt(raw ?? '', 10);
  const { members, error, isLoading, mutate } = useMembers();

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Configurar torneo' }} />
      <Header overline="Nuevo torneo" title={Number.isInteger(number) ? `Torneo ${number}` : 'Torneo'} />
      {!Number.isInteger(number) || number < 1 ? (
        <ErrorState message="Falta el número del torneo. Volvé al paso anterior." />
      ) : isLoading && !members ? (
        <LoadingState message="Cargando jugadores…" />
      ) : error && !members ? (
        <ErrorState error={error} onRetry={() => mutate()} />
      ) : (
        <TournamentForm mode="create" number={number} members={members ?? []} />
      )}
    </Screen>
  );
}
