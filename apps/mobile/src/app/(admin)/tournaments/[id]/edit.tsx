/**
 * Editar torneo: participantes, fechas pendientes y blinds (TournamentForm de
 * la web en /tournaments/[id]/edit). Terminar y cancelar están en la ficha.
 */
import { Stack, useLocalSearchParams } from 'expo-router';

import { useMembers, useTournament } from '@/components/admin/api';
import { Notice } from '@/components/admin/Form';
import { TournamentForm } from '@/components/admin/TournamentForm';
import { Header } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/States';

export default function EditTournamentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tournamentId = parseInt(id ?? '', 10) || null;
  const t = useTournament(tournamentId);
  const m = useMembers();

  const loading = (t.isLoading && !t.data) || (m.isLoading && !m.members);
  const error = t.error ?? m.error;

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Editar torneo' }} />
      <Header overline="Comisión" title={t.data ? `Editar Torneo ${t.data.number}` : 'Editar torneo'} />
      {loading ? (
        <LoadingState />
      ) : error && (!t.data || !m.members) ? (
        <ErrorState error={error} onRetry={() => (t.mutate(), m.mutate())} />
      ) : t.data ? (
        <>
          {t.data.status === 'FINALIZADO' ? <Notice>Este torneo ya terminó: los cambios reescriben su historia.</Notice> : null}
          {/* key: si llega una versión nueva del torneo el formulario arranca de cero con ella. */}
          <TournamentForm key={t.data.id} mode="edit" tournament={t.data} members={m.members ?? []} />
        </>
      ) : null}
    </Screen>
  );
}
