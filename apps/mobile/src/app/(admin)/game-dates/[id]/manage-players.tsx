/**
 * Gestionar jugadores de la fecha en curso: el modal "Gestionar Jugadores"
 * del registro en vivo de la web (CPPlayersModal). Agregar o quitar un
 * participante recalcula posiciones y puntos de las eliminaciones ya
 * cargadas; quitar a un eliminado borra su eliminación. Por eso, igual que la
 * web, cada cambio pide dos confirmaciones.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { fullName } from '@poker/shared';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import useSWR from 'swr';

import {
  adminKeys,
  confirmAction,
  errorMessage,
  useAdminRefresh,
  useGameDate,
  type AdminPlayer,
} from '@/components/admin/api';
import { FormError, Notice } from '@/components/admin/Form';
import type { Elimination } from '@/components/envivo/types';
import { SearchField } from '@/components/jugador/Bits';
import { PlayerAvatar } from '@/components/torneo/PlayerAvatar';
import { Header } from '@/components/ui/Header';
import { NoirCard } from '@/components/ui/NoirCard';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { Muted, Overline } from '@/components/ui/Typography';
import { useRefresh } from '@/hooks/useRefresh';
import { apiFetch } from '@/lib/api';
import { swrKeys } from '@/lib/swr';
import { noir } from '@/theme/colors';

export default function ManagePlayersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const gameDateId = parseInt(id ?? '', 10) || null;
  const gd = useGameDate(gameDateId);
  const inDate = useSWR<AdminPlayer[]>(gameDateId ? adminKeys.datePlayers(gameDateId) : null);
  const elims = useSWR<Elimination[]>(gameDateId ? swrKeys.gameDateEliminations(gameDateId) : null);
  const everyone = useSWR<AdminPlayer[]>(adminKeys.allPlayers());
  const { refreshing, onRefresh } = useRefresh(
    () => gd.mutate(),
    () => inDate.mutate(),
    () => elims.mutate(),
    () => everyone.mutate()
  );
  const refresh = useAdminRefresh();

  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const header = <Stack.Screen options={{ title: 'Gestionar jugadores' }} />;
  const loading = (gd.isLoading && !gd.data) || (inDate.isLoading && !inDate.data) || (elims.isLoading && !elims.data);
  const loadError = gd.error ?? inDate.error ?? elims.error;

  if (loading || loadError || !gd.data) {
    return (
      <Screen>
        {header}
        {loading ? (
          <LoadingState />
        ) : (
          <ErrorState error={loadError} onRetry={() => (gd.mutate(), inDate.mutate(), elims.mutate())} />
        )}
      </Screen>
    );
  }

  const gameDate = gd.data.gameDate;
  const live = gameDate.status === 'in_progress';
  const players = inDate.data ?? [];
  const eliminatedIds = new Set((elims.data ?? []).map((e) => e.eliminatedPlayer.id));
  const active = players.filter((p) => !eliminatedIds.has(p.id));
  const eliminated = players.filter((p) => eliminatedIds.has(p.id));
  const inDateIds = new Set(players.map((p) => p.id));
  const t = search.trim().toLowerCase();
  const toAdd = (everyone.data ?? [])
    .filter((p) => !inDateIds.has(p.id))
    .filter((p) => !t || `${p.firstName} ${p.lastName}`.toLowerCase().includes(t));

  const afterChange = async (msg: string) => {
    setMessage(msg);
    refresh.gameDate(gameDate.tournament.id, gameDate.id);
    await Promise.allSettled([gd.mutate(), inDate.mutate(), elims.mutate()]);
  };

  const add = async (p: AdminPlayer) => {
    const name = fullName(p);
    if (!(await confirmAction('Agregar participante', `¿Agregar a ${name} a la fecha ${gameDate.dateNumber}?`, 'Continuar', false))) return;
    if (
      !(await confirmAction(
        'Confirmar',
        `Entra como jugador activo y se recalculan los puntos de ${elims.data?.length ?? 0} eliminaciones con ${players.length + 1} jugadores.`,
        'Agregar',
        false
      ))
    )
      return;
    setBusyId(p.id);
    setError(null);
    setMessage(null);
    try {
      const r = await apiFetch<{ message?: string }>(`/api/game-dates/${gameDate.id}/players`, { method: 'POST', json: { playerId: p.id } });
      await afterChange(r?.message ?? `${name} agregado.`);
      setSearch('');
    } catch (e) {
      setError(errorMessage(e, 'Error al agregar participante'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (p: AdminPlayer, wasEliminated: boolean) => {
    const name = fullName(p);
    if (!(await confirmAction('Quitar participante', `¿Quitar a ${name} de la fecha ${gameDate.dateNumber}?`, 'Continuar'))) return;
    if (
      !(await confirmAction(
        'Confirmar',
        wasEliminated
          ? `${name} ya fue eliminado: se borra su eliminación y se recalculan las posiciones y puntos de los demás.`
          : `Se recalculan posiciones y puntos con ${players.length - 1} jugadores.`,
        'Quitar'
      ))
    )
      return;
    setBusyId(p.id);
    setError(null);
    setMessage(null);
    try {
      const r = await apiFetch<{ message?: string }>(`/api/game-dates/${gameDate.id}/players`, { method: 'DELETE', json: { playerId: p.id } });
      await afterChange(r?.message ?? `${name} quitado.`);
    } catch (e) {
      setError(errorMessage(e, 'Error al quitar participante'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      {header}
      <Header overline={`Torneo ${gameDate.tournament.number}`} title={`Fecha ${gameDate.dateNumber}`} subtitle={`${players.length} participantes`} />
      {!live ? <Notice tone="danger">Solo se gestionan jugadores con la fecha en curso. Para una fecha configurada, editá jugadores e invitados.</Notice> : null}
      {message ? <Notice tone="ok">{message}</Notice> : null}
      <FormError message={error} />

      <NoirCard className="gap-1 p-4">
        <Overline className="pb-1">Jugando ({active.length})</Overline>
        {active.map((p) => (
          <PlayerRow key={p.id} player={p} action="remove" busy={busyId === p.id} disabled={!live || !!busyId} onPress={() => remove(p, false)} />
        ))}
      </NoirCard>

      {eliminated.length > 0 ? (
        <NoirCard className="gap-1 p-4">
          <Overline className="pb-1">Eliminados ({eliminated.length})</Overline>
          {eliminated.map((p) => (
            <PlayerRow key={p.id} player={p} action="remove" busy={busyId === p.id} disabled={!live || !!busyId} onPress={() => remove(p, true)} />
          ))}
        </NoirCard>
      ) : null}

      <NoirCard className="gap-3 p-4">
        <Overline>Agregar</Overline>
        <SearchField value={search} onChangeText={setSearch} />
        {everyone.isLoading && !everyone.data ? (
          <Muted>Cargando jugadores…</Muted>
        ) : toAdd.length === 0 ? (
          <Muted>{t ? 'Nadie coincide.' : 'Todos los jugadores activos ya están en la fecha.'}</Muted>
        ) : (
          (t ? toAdd : toAdd.slice(0, 30)).map((p) => (
            <PlayerRow key={p.id} player={p} action="add" busy={busyId === p.id} disabled={!live || !!busyId} onPress={() => add(p)} />
          ))
        )}
      </NoirCard>
    </Screen>
  );
}

function PlayerRow({
  player,
  action,
  busy,
  disabled,
  onPress,
}: {
  player: AdminPlayer;
  action: 'add' | 'remove';
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const name = fullName(player);
  const color = action === 'add' ? noir.gold : noir.danger;
  return (
    <View className="min-h-[52px] flex-row items-center gap-3 border-b border-noir-border py-1.5">
      <PlayerAvatar player={player} size={34} />
      <Text numberOfLines={1} className="flex-1 font-inter text-base text-noir-text">
        {name}
        {player.role === 'Invitado' ? <Text className="text-noir-muted"> · invitado</Text> : null}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${action === 'add' ? 'Agregar' : 'Quitar'} a ${name}`}
        disabled={disabled}
        onPress={onPress}
        className={`h-11 w-11 items-center justify-center rounded-full ${disabled ? 'opacity-40' : 'active:bg-noir-raised'}`}>
        <Ionicons name={busy ? 'hourglass-outline' : action === 'add' ? 'add-circle-outline' : 'remove-circle-outline'} size={24} color={color} />
      </Pressable>
    </View>
  );
}
