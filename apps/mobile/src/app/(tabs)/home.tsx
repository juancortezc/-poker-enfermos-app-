/**
 * Inicio. Port de HomePage de la web (estados B y C; el A, sin sesión, es la
 * pantalla de login de la app):
 *
 * - Fecha en curso → la entrada al en vivo (HomeLive).
 * - Si no → celebraciones, aviso de clave vieja y el selector
 *   Última Fecha / Torneo. Última Fecha es la vista de entrada mientras haya
 *   una fecha jugada; al arrancar el torneo, Torneo.
 */
import { googleCalendarUrl } from '@poker/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, View } from 'react-native';

import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { CelebrationsCard } from '@/components/jugador/home/CelebrationsCard';
import { ClaveDebilBanner } from '@/components/jugador/home/ClaveDebilBanner';
import { HomeLive } from '@/components/jugador/home/HomeLive';
import { HomeTorneo } from '@/components/jugador/home/HomeTorneo';
import { HomeUltimaFecha } from '@/components/jugador/home/HomeUltimaFecha';
import { Segmented } from '@/components/jugador/Segmented';
import { Header } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveGameDate } from '@/hooks/useActiveGameDate';
import { useActiveTournament } from '@/hooks/useActiveTournament';
import { useRefresh } from '@/hooks/useRefresh';
import { useTournamentInsights, useTournamentRanking } from '@/hooks/useTournamentRanking';

type HomeView = 'ultimaFecha' | 'torneo';

export default function HomeScreen() {
  const { user } = useAuth();
  const active = useActiveTournament();
  const tournament = active.tournament;
  const rankingSwr = useTournamentRanking(tournament?.id, { refreshInterval: 300000 });
  const insightsSwr = useTournamentInsights(tournament?.id);
  const gameDateSwr = useActiveGameDate();
  const [chosenView, setView] = useState<HomeView | null>(null);

  const { refreshing, onRefresh } = useRefresh(active.mutate, rankingSwr.mutate, insightsSwr.mutate, gameDateSwr.mutate);

  const number = tournament?.number;
  const view: HomeView = chosenView ?? (active.lastCompletedDate ? 'ultimaFecha' : 'torneo');
  const rankings = rankingSwr.ranking?.rankings ?? [];
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
            { id: 'ultimaFecha', label: 'Última Fecha', disabled: !active.lastCompletedDate },
            { id: 'torneo', label: 'Torneo' },
          ]}
          value={view}
          onChange={setView}
        />
        {rankingSwr.isLoading ? (
          <LoadingState />
        ) : view === 'ultimaFecha' && active.lastCompletedDate ? (
          <HomeUltimaFecha
            userId={user?.id ?? ''}
            tournamentNumber={number ?? 0}
            rankings={rankings}
            lastCompletedDate={active.lastCompletedDate}
            onOpenProfile={openProfile}
            onSeeAllResults={() => router.push('/fecha')}
            onSeeResultsTab={() => router.push({ pathname: '/fecha', params: { tab: 'eliminaciones' } })}
            onSeeTabla={() => router.push('/ranking')}
          />
        ) : (
          <HomeTorneo
            userId={user?.id ?? ''}
            tournamentId={tournament.id}
            tournamentNumber={number ?? 0}
            rankings={rankings}
            nextDate={active.nextDate}
            seasonHighlights={insightsSwr.insights?.seasonHighlights}
            onOpenProfile={openProfile}
            onOpenCalendarPage={() => router.push('/calendario')}
            onAddToPersonalCalendar={() => {
              const d = active.nextDate;
              if (d?.scheduledDate) Linking.openURL(googleCalendarUrl(d.dateNumber, d.scheduledDate)).catch(() => {});
            }}
            onSeeTabla={() => router.push('/ranking')}
          />
        )}
      </>
    );
  })();

  return (
    <Screen edges={['top']} refreshing={refreshing} onRefresh={onRefresh}>
      <Header
        overline={number ? `Torneo ${number}` : 'Poker Enfermos'}
        title={user ? `Hola, ${user.firstName}` : 'Inicio'}
        right={
          user ? (
            <View>
              <PlayerAvatar name={`${user.firstName} ${user.lastName}`} photoUrl={user.photoUrl} size={48} playerId={user.id} linkToProfile />
            </View>
          ) : undefined
        }
      />
      {body}
    </Screen>
  );
}
