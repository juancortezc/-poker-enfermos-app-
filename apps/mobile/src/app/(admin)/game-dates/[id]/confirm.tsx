/**
 * Confirmar e iniciar una fecha. Paridad con /game-dates/[id]/confirm de la
 * web: resumen, editar jugadores e invitados mientras está configurada,
 * iniciar (arranca el timer, no se deshace) e ir al registro si ya está en
 * curso. Suma la lista de participantes y eliminar la fecha configurada, que
 * en la web está en la pestaña Activar.
 */
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import useSWR from 'swr';

import {
  adminKeys,
  confirmAction,
  errorMessage,
  longDate,
  statusLabel,
  useAdminRefresh,
  useGameDate,
  type AdminPlayer,
  type GameDateDetail,
} from '@/components/admin/api';
import { FormError, Notice } from '@/components/admin/Form';
import { Header } from '@/components/ui/Header';
import { CPButton } from '@/components/ui/CPButton';
import { CPCard } from '@/components/ui/CPCard';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { Muted, Overline } from '@/components/ui/Typography';
import { useRefresh } from '@/hooks/useRefresh';
import { apiFetch } from '@/lib/api';

export default function ConfirmGameDateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const gameDateId = parseInt(id ?? '', 10) || null;
  const { data, error, isLoading, mutate } = useGameDate(gameDateId);
  const players = useSWR<AdminPlayer[]>(gameDateId ? adminKeys.datePlayers(gameDateId) : null);
  const { refreshing, onRefresh } = useRefresh(() => mutate(), () => players.mutate());

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Stack.Screen options={{ title: 'Fecha' }} />
      {isLoading && !data ? (
        <LoadingState message="Cargando la fecha…" />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={() => mutate()} />
      ) : data ? (
        <Body gameDate={data.gameDate} players={players.data ?? []} onChanged={() => (mutate(), players.mutate())} />
      ) : null}
    </Screen>
  );
}

function Body({ gameDate, players, onChanged }: { gameDate: GameDateDetail; players: AdminPlayer[]; onChanged: () => void }) {
  const refresh = useAdminRefresh();
  const [busy, setBusy] = useState<'start' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const created = gameDate.status === 'CREATED';
  const live = gameDate.status === 'in_progress';
  const uniqueCount = new Set(gameDate.playerIds).size;

  const start = async () => {
    const ok = await confirmAction(
      'Iniciar fecha',
      `Arranca la fecha ${gameDate.dateNumber} con ${uniqueCount} jugadores y el timer en el nivel 1. No se puede deshacer.`,
      'Iniciar',
      false
    );
    if (!ok) return;
    setBusy('start');
    setError(null);
    try {
      await apiFetch(`/api/game-dates/${gameDate.id}`, { method: 'PUT', json: { action: 'start' } });
      refresh.gameDate(gameDate.tournament.id, gameDate.id);
      onChanged();
      router.push('/registro');
    } catch (e) {
      setError(errorMessage(e, 'Error al iniciar la fecha'));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    const ok = await confirmAction(
      `Eliminar la fecha ${gameDate.dateNumber}`,
      'Se borra la fecha configurada con su lista de participantes. Esta acción no se puede deshacer.',
      'Eliminar'
    );
    if (!ok) return;
    setBusy('delete');
    setError(null);
    try {
      await apiFetch(`/api/game-dates/${gameDate.id}`, { method: 'DELETE' });
      refresh.gameDate(gameDate.tournament.id, gameDate.id);
      router.back();
    } catch (e) {
      setError(errorMessage(e, 'Error al eliminar la fecha'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Header
        overline={`Torneo ${gameDate.tournament.number}`}
        title={`Fecha ${gameDate.dateNumber}`}
        subtitle={longDate(gameDate.scheduledDate)}
      />

      <View className="flex-row gap-3">
        <Stat label="Participantes" value={String(gameDate.playersCount)} />
        <Stat label="Estado" value={statusLabel[gameDate.status]} />
      </View>

      {uniqueCount !== gameDate.playerIds.length ? (
        <Notice tone="danger">
          La lista tiene {gameDate.playerIds.length - uniqueCount} jugador(es) repetido(s). Guardá los jugadores de nuevo para
          limpiarla.
        </Notice>
      ) : null}

      {created ? (
        <Notice>Al iniciar la fecha arranca el timer para todos y ya no se puede deshacer. Confirmá que estén todos.</Notice>
      ) : live ? (
        <Notice tone="ok">La fecha está en curso. Las eliminaciones se cargan en el registro.</Notice>
      ) : null}

      <FormError message={error} />

      {created ? (
        <View className="gap-3">
          <CPButton title="Iniciar fecha" size="lg" loading={busy === 'start'} disabled={!!busy} onPress={start} />
          <View className="flex-row gap-3">
            <CPButton
              title="Jugadores"
              variant="outline"
              className="flex-1"
              onPress={() => router.push({ pathname: '/game-dates/[id]/edit-players', params: { id: String(gameDate.id) } })}
            />
            <CPButton
              title="Invitados"
              variant="outline"
              className="flex-1"
              onPress={() => router.push({ pathname: '/game-dates/[id]/edit-guests', params: { id: String(gameDate.id) } })}
            />
          </View>
        </View>
      ) : live ? (
        <View className="gap-3">
          <CPButton title="Ir al registro" size="lg" onPress={() => router.push('/registro')} />
          <CPButton
            title="Gestionar jugadores"
            variant="outline"
            onPress={() => router.push({ pathname: '/game-dates/[id]/manage-players', params: { id: String(gameDate.id) } })}
          />
        </View>
      ) : null}

      <CPCard className="gap-2 p-4">
        <Overline>Participantes ({players.length})</Overline>
        {players.length === 0 ? (
          <Muted>Sin jugadores.</Muted>
        ) : (
          <Text className="font-inter text-sm leading-6 text-cp-on-surface">
            {players.map((p) => `${p.firstName} ${p.lastName}`.trim()).join(' · ')}
          </Text>
        )}
      </CPCard>

      {created ? (
        <CPButton title="Eliminar fecha" variant="ghost" loading={busy === 'delete'} disabled={!!busy} onPress={remove} />
      ) : null}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <CPCard className="flex-1 items-center gap-1 p-3">
      <Muted className="text-xs uppercase tracking-[1.5px]">{label}</Muted>
      <Text className="font-display text-xl text-cp-on-surface">{value}</Text>
    </CPCard>
  );
}
