/**
 * Inicio. Port de HomePage de la web (estados B y C; el A, sin sesión, es la
 * pantalla de login de la app):
 *
 * - Fecha en curso → la entrada al en vivo (HomeLive).
 * - Si no → celebraciones, aviso de clave vieja y el selector
 *   Última Fecha / Torneo. Última Fecha es la vista de entrada mientras haya
 *   una fecha jugada; al arrancar el torneo, Torneo.
 */
import { router } from 'expo-router';
import { useState } from 'react';

import { CelebrationsCard } from '@/components/jugador/home/CelebrationsCard';
import { ClaveDebilBanner } from '@/components/jugador/home/ClaveDebilBanner';
import { HomeLive } from '@/components/jugador/home/HomeLive';
import { HomeTorneo } from '@/components/jugador/home/HomeTorneo';
import { HomeUltimaFecha } from '@/components/jugador/home/HomeUltimaFecha';
import { Segmented } from '@/components/jugador/Segmented';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveGameDate } from '@/hooks/useActiveGameDate';
import { useActiveTournament } from '@/hooks/useActiveTournament';
import { useRefresh } from '@/hooks/useRefresh';
import { useTournamentRanking } from '@/hooks/useTournamentRanking';

type HomeView = 'ultimaFecha' | 'torneo';

export default function HomeScreen() {
  const { user } = useAuth();
  const active = useActiveTournament();
  const tournament = active.tournament;
  const rankingSwr = useTournamentRanking(tournament?.id, { refreshInterval: 300000 });
  // Al arrancar un torneo, "Última Fecha" es la última noche del anterior: su
  // recap necesita la tabla de ESE torneo, no la del que arranca (en 0).
  const lastPlayed = active.lastPlayedDate;
  const fromPrevious = !!lastPlayed && !!tournament && lastPlayed.tournamentId !== tournament.id;
  const previousRankingSwr = useTournamentRanking(fromPrevious ? lastPlayed.tournamentId : undefined, { refreshInterval: 0 });
  const gameDateSwr = useActiveGameDate();
  const [chosenView, setView] = useState<HomeView | null>(null);

  const { refreshing, onRefresh } = useRefresh(active.mutate, rankingSwr.mutate, gameDateSwr.mutate);

  const number = tournament?.number;
  const view: HomeView = chosenView ?? (lastPlayed ? 'ultimaFecha' : 'torneo');
  const rankings = rankingSwr.ranking?.rankings ?? [];
  const fechaParams = fromPrevious && lastPlayed ? { torneo: String(lastPlayed.tournamentId) } : {};
  const openProfile = () => user && router.push({ pathname: '/players/[id]', params: { id: user.id } });

  const body = (() => {
    if (active.isLoading) return <LoadingState />;
    if (gameDateSwr.gameDate?.status === 'in_progress') return <HomeLive gameDate={gameDateSwr.gameDate} />;
    if (active.error && !active.isNotFound) return <ErrorState error={active.error} onRetry={() => active.mutate()} />;
    if (!tournament)
      return <EmptyState icon="trophy-outline" message="No hay torneo activo. Volvé cuando arranque el próximo." />;
    if (rankingSwr.error) return <ErrorState error={rankingSwr.error} onRetry={() => rankingSwr.mutate()} />;

    return (
      <>
        <CelebrationsCard />
        <ClaveDebilBanner />
        <Segmented
          options={[
            { id: 'ultimaFecha', label: 'Última Fecha', disabled: !lastPlayed },
            { id: 'torneo', label: 'Torneo' },
          ]}
          value={view}
          onChange={setView}
        />
        {rankingSwr.isLoading ? (
          <LoadingState />
        ) : view === 'ultimaFecha' && lastPlayed ? (
          <HomeUltimaFecha
            userId={user?.id ?? ''}
            rankings={fromPrevious ? (previousRankingSwr.ranking?.rankings ?? []) : rankings}
            lastCompletedDate={lastPlayed}
            tournamentNumber={fromPrevious ? lastPlayed.tournamentNumber : undefined}
            onOpenProfile={openProfile}
            onSeeAllResults={() => router.push({ pathname: '/fecha', params: fechaParams })}
            onSeeResultsTab={() => router.push({ pathname: '/fecha', params: { ...fechaParams, tab: 'eliminaciones' } })}
          />
        ) : (
          <HomeTorneo
            tournamentNumber={number ?? 0}
            finished={active.isFinished}
            rankings={rankings}
            lastDateNumber={active.lastCompletedDate?.dateNumber ?? null}
            progress={active.progress}
            nextDate={active.nextDate}
            registeredCount={tournament.participantIds?.length}
            onSeeTabla={() => router.push('/ranking')}
          />
        )}
      </>
    );
  })();

  // Como la web: el home va en claro (papel); mientras se juega la fecha es
  // el tablero de la mesa y va en oscuro.
  const live = gameDateSwr.gameDate?.status === 'in_progress';

  return (
    <Screen
      edges={['top']}
      tone={live ? 'dark' : 'light'}
      appBar
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentClassName="gap-5 px-5 pt-5 pb-8">
      {body}
    </Screen>
  );
}
