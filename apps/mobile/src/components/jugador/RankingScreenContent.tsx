/**
 * Pantalla de la tabla, compartida por la pestaña "Tabla" y la ruta /tabla.
 * En claro, como /ranking en la web; la pestaña lleva además la barra de
 * arriba (CPHeader).
 */
import type { Edge } from 'react-native-safe-area-context';

import { RankingView } from '@/components/jugador/RankingView';
import { Header } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveTournament } from '@/hooks/useActiveTournament';
import { useRefresh } from '@/hooks/useRefresh';
import { useTournamentRanking } from '@/hooks/useTournamentRanking';

export function RankingScreenContent({ edges, showHeader }: { edges?: Edge[]; showHeader?: boolean }) {
  const { user } = useAuth();
  const active = useActiveTournament();
  const tournament = active.tournament;
  const rankingSwr = useTournamentRanking(tournament?.id);
  const { refreshing, onRefresh } = useRefresh(active.mutate, rankingSwr.mutate);

  const number = tournament?.number;

  const body = (() => {
    if (active.isLoading) return <LoadingState message="Cargando la tabla…" />;
    if (active.isNotFound || (!tournament && !active.error))
      return <EmptyState icon="trophy-outline" message="No hay torneo activo. La tabla se mostrará cuando inicie uno nuevo." />;
    if (active.error) return <ErrorState error={active.error} onRetry={() => active.mutate()} />;
    if (rankingSwr.isLoading) return <LoadingState message="Cargando la tabla…" />;
    if (rankingSwr.error) return <ErrorState error={rankingSwr.error} onRetry={() => rankingSwr.mutate()} />;
    if (!rankingSwr.ranking || rankingSwr.ranking.rankings.length === 0)
      return <EmptyState icon="list-outline" message="Todavía no hay datos de tabla." />;
    return <RankingView data={rankingSwr.ranking} tournamentNumber={number ?? 0} currentUserId={user?.id} />;
  })();

  return (
    <Screen edges={edges} tone="light" appBar={showHeader} refreshing={refreshing} onRefresh={onRefresh}>
      {showHeader ? <Header overline={number ? `Torneo ${number}` : 'Torneo'} title="Tabla" /> : null}
      {body}
    </Screen>
  );
}
