/**
 * Registro de eliminaciones en vivo. Paridad con apps/web/src/app/registro:
 * iniciar la fecha, timer compacto con avisos, KPIs, formulario de
 * eliminación, historial editable y ranking proyectado. Solo Comisión.
 */
import { calculatePointsForPosition } from '@poker/shared';
import { useKeepAwake } from 'expo-keep-awake';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { AlertHints } from '@/components/envivo/AlertHints';
import { EliminationForm } from '@/components/envivo/EliminationForm';
import { EliminationList } from '@/components/envivo/EliminationList';
import { GameCompletedCard } from '@/components/envivo/GameCompletedCard';
import { LiveRankingCard } from '@/components/envivo/LiveRankingCard';
import { useLiveDate, useRefreshLive } from '@/components/envivo/live-data';
import { TimerStrip } from '@/components/envivo/TimerStrip';
import { useActiveGameDate } from '@/components/envivo/useActiveGameDate';
import { useBlindTimer } from '@/components/envivo/useBlindTimer';
import { useTimerAlerts } from '@/components/envivo/useTimerAlerts';
import type { ActiveGameDate } from '@/components/envivo/types';
import { Header } from '@/components/ui/Header';
import { NoirButton } from '@/components/ui/NoirButton';
import { NoirCard } from '@/components/ui/NoirCard';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState, RestrictedState } from '@/components/ui/States';
import { Muted } from '@/components/ui/Typography';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';

export default function RegistroScreen() {
  const { can } = useAuth();
  const header = <Stack.Screen options={{ title: 'Registro' }} />;

  if (!can('eliminations')) {
    return (
      <Screen scroll={false}>
        {header}
        <RestrictedState message="Solo la Comisión puede registrar eliminaciones." />
      </Screen>
    );
  }

  return (
    <>
      {header}
      <RegistroComision />
    </>
  );
}

function RegistroComision() {
  // La Comisión tiene esta pantalla abierta toda la noche.
  useKeepAwake('envivo-registro');

  const { gameDate, error, isLoading, refresh } = useActiveGameDate(10_000);

  if (isLoading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (error) {
    return (
      <Screen>
        <ErrorState error={error} onRetry={() => refresh()} />
      </Screen>
    );
  }
  if (!gameDate) {
    return (
      <Screen onRefresh={() => refresh()}>
        <EmptyState message="No existe una fecha de juego activa en este momento." icon="calendar-outline" />
      </Screen>
    );
  }
  if (gameDate.status === 'CREATED') {
    return <StartDate gameDate={gameDate} onStarted={() => refresh()} />;
  }
  return <LiveRegistro gameDate={gameDate} />;
}

function StartDate({ gameDate, onStarted }: { gameDate: ActiveGameDate; onStarted: () => void }) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setStarting(true);
    setError(null);
    try {
      await apiFetch(`/api/game-dates/${gameDate.id}`, {
        method: 'PUT',
        json: { action: 'start' },
      });
      onStarted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al iniciar la fecha');
    } finally {
      setStarting(false);
    }
  };

  return (
    <Screen>
      <Header overline={`Torneo ${gameDate.tournament.number}`} title={`Fecha ${gameDate.dateNumber}`} />
      <NoirCard accent className="gap-4">
        <Muted>
          {gameDate.playersCount} jugadores confirmados. Al iniciar arranca el timer en el nivel 1 para todos.
        </Muted>
        {error ? <Text className="font-inter text-sm text-noir-danger">{error}</Text> : null}
        <NoirButton
          title="Iniciar fecha"
          size="lg"
          loading={starting}
          onPress={() =>
            Alert.alert('Iniciar fecha', `¿Arrancar la fecha ${gameDate.dateNumber} y el timer?`, [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Iniciar', onPress: start },
            ])
          }
        />
      </NoirCard>
    </Screen>
  );
}

function LiveRegistro({ gameDate }: { gameDate: ActiveGameDate }) {
  const { can } = useAuth();
  const canWrite = can('eliminations');
  const refreshLive = useRefreshLive();
  const { players, eliminations, ranking } = useLiveDate(gameDate.id, gameDate.status === 'in_progress');

  const timer = useBlindTimer(gameDate.id, gameDate.tournament.id);
  const alerts = useTimerAlerts(timer.view, timer.levels, gameDate.dateNumber);

  const refreshAll = () => refreshLive(gameDate.tournament.id, gameDate.id);

  if ((players.isLoading && !players.data) || (eliminations.isLoading && !eliminations.data)) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (players.error || eliminations.error) {
    return (
      <Screen>
        <ErrorState error={players.error ?? eliminations.error} onRetry={refreshAll} />
      </Screen>
    );
  }

  const datePlayers = players.data ?? [];
  const elims = eliminations.data ?? [];
  const eliminatedIds = new Set(elims.map((e) => e.eliminatedPlayer.id));
  const activePlayers = datePlayers.filter((p) => !eliminatedIds.has(p.id));
  const total = datePlayers.length;
  const nextPosition = total - elims.length;
  const winnerPoints = total > 0 ? calculatePointsForPosition(1, total) : 0;

  return (
    <Screen refreshing={false} onRefresh={refreshAll}>
      <Header overline={`Torneo ${gameDate.tournament.number}`} title={`Registro fecha ${gameDate.dateNumber}`} />

      <TimerStrip view={timer.view} flash={alerts.flash} canControl={canWrite} onAction={timer.control} />
      <AlertHints
        permission={alerts.permission}
        exactAlarms={alerts.exactAlarms}
        onExactAlarms={alerts.setExactAlarms}
      />

      <View className="flex-row gap-3">
        <Kpi label="Jugando" value={activePlayers.length} highlight />
        <Kpi label="Jugadores" value={total} />
        <Kpi label="Pts máx" value={winnerPoints} />
      </View>

      {activePlayers.length > 1 ? (
        <EliminationForm
          gameDateId={gameDate.id}
          players={datePlayers}
          activePlayers={activePlayers}
          nextPosition={nextPosition}
          onRegistered={refreshAll}
        />
      ) : (
        <GameCompletedCard gameDateId={gameDate.id} status={gameDate.status} onClosed={refreshAll} />
      )}

      <EliminationList
        eliminations={elims}
        players={datePlayers}
        canWrite={canWrite}
        canUndo={gameDate.status === 'in_progress'}
        onChanged={refreshAll}
      />

      {ranking.data ? <LiveRankingCard data={ranking.data} /> : null}
    </Screen>
  );
}

function Kpi({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <NoirCard className="flex-1 items-center gap-1 p-3">
      <Muted className="text-xs uppercase tracking-[2px]">{label}</Muted>
      <Text className={`font-inter-bold text-2xl ${highlight ? 'text-noir-gold' : 'text-noir-text'}`}>{value}</Text>
    </NoirCard>
  );
}
