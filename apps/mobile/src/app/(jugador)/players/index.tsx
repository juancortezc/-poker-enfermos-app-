/**
 * Jugadores (web: /players → PlayersPage). Pestañas Enfermos / Invitados con
 * buscador; tocar abre el perfil. La Comisión ve además "Editar" y "Nuevo",
 * que llevan a las pantallas de Admin (F6); la gestión no se hace aquí.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { fullName } from '@poker/shared';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { SearchField } from '@/components/jugador/Bits';
import { Segmented } from '@/components/jugador/Segmented';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { Muted } from '@/components/ui/Typography';
import { useAuth } from '@/contexts/AuthContext';
import { useRefresh } from '@/hooks/useRefresh';
import { isMember, matchesSearch, usePlayers, type DirectoryPlayer } from '@/hooks/usePlayers';
import { cp as c } from '@/theme/colors';

type Tab = 'enfermos' | 'invitados';

const ROLE_PRIORITY: Record<string, number> = { Comision: 0, Enfermo: 1, Invitado: 2 };

/** Igual que la web: si hay dos fichas con el mismo nombre, gana la de rol más alto. */
function dedupe(list: DirectoryPlayer[]): DirectoryPlayer[] {
  const map = new Map<string, DirectoryPlayer>();
  list.forEach((p) => {
    const key = `${p.firstName.trim().toLowerCase()}|${p.lastName.trim().toLowerCase()}`;
    const existing = map.get(key);
    if (!existing || (ROLE_PRIORITY[p.role] ?? 9) < (ROLE_PRIORITY[existing.role] ?? 9)) map.set(key, p);
  });
  return [...map.values()];
}

export default function PlayersScreen() {
  const { can } = useAuth();
  const { players, error, isLoading, mutate } = usePlayers();
  const [tab, setTab] = useState<Tab>('enfermos');
  const [search, setSearch] = useState('');
  const { refreshing, onRefresh } = useRefresh(mutate);
  const canEdit = can('players');

  const all = useMemo(() => (players ? dedupe(players) : []), [players]);
  const enfermos = all.filter(isMember);
  const invitados = all.filter((p) => p.role === 'Invitado');
  const list = (tab === 'enfermos' ? enfermos : invitados).filter((p) => matchesSearch(p, search));

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Jugadores',
          headerRight: canEdit
            ? () => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Nuevo jugador"
                  hitSlop={10}
                  onPress={() => router.push('/players/new')}
                  className="h-11 w-11 items-center justify-center">
                  <Ionicons name="add" size={26} color={c.primaryLight} />
                </Pressable>
              )
            : undefined,
        }}
      />
      <Screen scroll={false}>
        <View className="gap-3 pb-3">
          <Segmented
            options={[
              { id: 'enfermos', label: `Enfermos (${enfermos.length})` },
              { id: 'invitados', label: `Invitados (${invitados.length})` },
            ]}
            value={tab}
            onChange={setTab}
          />
          <SearchField value={search} onChangeText={setSearch} />
        </View>
        {isLoading && !players ? (
          <LoadingState message="Cargando jugadores…" />
        ) : error && !players ? (
          <ErrorState error={error} onRetry={() => mutate()} />
        ) : (
          <FlatList
            data={list}
            keyExtractor={(p) => p.id}
            contentContainerClassName="gap-2 pb-10"
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
            ListEmptyComponent={<EmptyState icon="people-outline" message="No se encontraron jugadores." />}
            renderItem={({ item }) => <PlayerRow player={item} canEdit={canEdit} />}
          />
        )}
      </Screen>
    </>
  );
}

function PlayerRow({ player, canEdit }: { player: DirectoryPlayer; canEdit: boolean }) {
  const name = fullName(player);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver el perfil de ${name}`}
      onPress={() => router.push({ pathname: '/players/[id]', params: { id: player.id } })}
      className="min-h-[64px] flex-row items-center gap-3 rounded-cp border border-cp-surface-border bg-cp-surface-1 px-4 py-3 active:bg-cp-surface-2">
      <PlayerAvatar name={name} photoUrl={player.photoUrl} role={player.role} size={44} />
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text numberOfLines={1} className="shrink font-inter-semibold text-base text-cp-on-surface">
            {name}
          </Text>
          {player.role === 'Comision' ? (
            <View className="h-5 w-5 items-center justify-center rounded-full bg-cp-primary">
              <Text className="font-inter-bold text-[10px] text-white">C</Text>
            </View>
          ) : null}
        </View>
        {player.aliases?.[0] ? <Muted className="italic">“{player.aliases[0]}”</Muted> : null}
        {player.role === 'Invitado' && player.inviter ? (
          <Muted className="text-xs">Invitado de {fullName(player.inviter)}</Muted>
        ) : null}
      </View>
      {canEdit ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Editar a ${name}`}
          hitSlop={8}
          onPress={() =>
            router.push(
              player.role === 'Invitado'
                ? { pathname: '/players/edit-invitado/[id]', params: { id: player.id } }
                : { pathname: '/players/edit/[id]', params: { id: player.id } }
            )
          }
          className="h-11 w-11 items-center justify-center rounded-full active:bg-cp-surface-2">
          <Ionicons name="create-outline" size={20} color={c.primaryLight} />
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={c.onSurfaceMuted} />
      )}
    </Pressable>
  );
}
