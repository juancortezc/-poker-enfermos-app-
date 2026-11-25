/**
 * Torneos. Paridad con /tournaments de la web (TournamentsPage): pestañas
 * Activos/Finalizados, progreso de fechas, crear y entrar a cada torneo.
 * Terminar o cancelar se hace desde la ficha del torneo, con confirmación.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTournaments, type TournamentListItem } from '@/components/admin/api';
import { Pill } from '@/components/admin/Form';
import { Segmented } from '@/components/jugador/Segmented';
import { CPButton } from '@/components/ui/CPButton';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { Muted } from '@/components/ui/Typography';
import { useRefresh } from '@/hooks/useRefresh';
import { useCP } from '@/theme/tone';

export default function TournamentsScreen() {
  const c = useCP();
  const [tab, setTab] = useState<'ACTIVO' | 'FINALIZADO'>('ACTIVO');
  const { data, error, isLoading, mutate } = useTournaments(tab);
  const { refreshing, onRefresh } = useRefresh(() => mutate());

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Torneos',
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Nuevo torneo"
              hitSlop={10}
              onPress={() => router.push('/tournaments/new')}
              className="h-11 w-11 items-center justify-center">
              <Ionicons name="add" size={26} color={c.primaryLight} />
            </Pressable>
          ),
        }}
      />
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        <Segmented
          options={[
            { id: 'ACTIVO', label: 'Activos' },
            { id: 'FINALIZADO', label: 'Finalizados' },
          ]}
          value={tab}
          onChange={setTab}
        />
        {isLoading && !data ? (
          <LoadingState message="Cargando torneos…" />
        ) : error && !data ? (
          <ErrorState error={error} onRetry={() => mutate()} />
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon="trophy-outline"
            message={tab === 'ACTIVO' ? 'No hay torneos activos.' : 'Todavía no hay torneos finalizados.'}
            actionTitle={tab === 'ACTIVO' ? 'Crear torneo' : undefined}
            onAction={tab === 'ACTIVO' ? () => router.push('/tournaments/new') : undefined}
          />
        ) : (
          data.map((t) => <TournamentRow key={t.id} t={t} />)
        )}
        {tab === 'ACTIVO' && data && data.length > 0 ? (
          <CPButton title="Nuevo torneo" variant="outline" onPress={() => router.push('/tournaments/new')} />
        ) : null}
      </Screen>
    </>
  );
}

function TournamentRow({ t }: { t: TournamentListItem }) {
  const c = useCP();
  const completed = t.gameDates.filter((d) => d.status === 'completed').length;
  const total = t.gameDates.length || 12;
  const pct = Math.min(1, completed / total);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Torneo ${t.number}`}
      onPress={() => router.push({ pathname: '/tournaments/[id]', params: { id: String(t.id) } })}
      className="gap-3 rounded-card border border-cp-surface-border bg-cp-surface-1 p-4 active:bg-cp-surface-2">
      <View className="flex-row items-center justify-between">
        <Text className="font-display text-xl text-cp-on-surface">Torneo {t.number}</Text>
        <Pill label={t.status === 'ACTIVO' ? 'Activo' : 'Finalizado'} tone={t.status === 'ACTIVO' ? 'ok' : 'muted'} />
      </View>
      {t.status === 'ACTIVO' ? (
        <View className="h-2 overflow-hidden rounded-full bg-cp-surface-2">
          <View className="h-2 rounded-full bg-cp-primary" style={{ width: `${pct * 100}%` }} />
        </View>
      ) : null}
      <View className="flex-row items-center gap-4">
        <Muted>
          <Ionicons name="people-outline" size={13} color={c.onSurfaceVariant} /> {t._count.tournamentParticipants} jugadores
        </Muted>
        <Muted>
          <Ionicons name="calendar-outline" size={13} color={c.onSurfaceVariant} /> {completed}/{total} fechas
        </Muted>
      </View>
    </Pressable>
  );
}
