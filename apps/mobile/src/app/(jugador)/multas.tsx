/** Multas registradas del torneo activo (web: /multas → MultasTab). */
import Ionicons from '@expo/vector-icons/Ionicons';
import { fullName } from '@poker/shared';
import { Stack } from 'expo-router';
import { FlatList, RefreshControl, Text, View } from 'react-native';

import { POSITIVE } from '@/components/jugador/Bits';
import { NoirCard } from '@/components/ui/NoirCard';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { Muted, Title } from '@/components/ui/Typography';
import { useActiveTournament } from '@/hooks/useActiveTournament';
import { useMultas, type Multa } from '@/hooks/useMultas';
import { useRefresh } from '@/hooks/useRefresh';
import { noir } from '@/theme/colors';

export default function MultasScreen() {
  const active = useActiveTournament();
  const { multas, error, mutate } = useMultas(active.tournament?.id);
  const { refreshing, onRefresh } = useRefresh(active.mutate, mutate);

  const header = (
    <NoirCard className="mb-2 items-center gap-1">
      <Ionicons name="receipt-outline" size={36} color={noir.copper} />
      <Title className="text-xl">Multas registradas</Title>
      <Muted className="text-center">
        Torneo {active.tournament?.number ?? ''} — registro oficial de multas por incumplimiento
      </Muted>
    </NoirCard>
  );

  const content = (() => {
    if (active.isLoading || (active.tournament && !multas && !error)) return <LoadingState message="Cargando multas…" />;
    if (!active.tournament) return <EmptyState icon="trophy-outline" message="No hay torneo activo." />;
    if (error) return <ErrorState error={error} onRetry={() => mutate()} />;
    return null;
  })();

  return (
    <>
      <Stack.Screen options={{ title: 'Multas' }} />
      <Screen scroll={false}>
        <FlatList
          data={content ? [] : (multas ?? [])}
          keyExtractor={(m) => String(m.id)}
          contentContainerClassName="gap-2 pb-10"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={noir.gold} />}
          ListHeaderComponent={header}
          ListEmptyComponent={content ?? <EmptyState icon="happy-outline" message="No hay multas registradas en este torneo." />}
          renderItem={({ item }) => <MultaCard multa={item} />}
        />
      </Screen>
    </>
  );
}

function MultaCard({ multa }: { multa: Multa }) {
  return (
    <View className="gap-1 rounded-2xl border border-noir-border bg-noir-surface px-4 py-3">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 font-inter-semibold text-base text-noir-text">{fullName(multa.player)}</Text>
        <Text
          style={{
            color: multa.paid ? POSITIVE : noir.danger,
            backgroundColor: multa.paid ? 'rgba(110,203,113,0.15)' : 'rgba(229,115,90,0.15)',
          }}
          className="overflow-hidden rounded-full px-2 py-0.5 font-inter-semibold text-xs">
          {multa.paid ? 'Pagada' : 'Pendiente'}
        </Text>
      </View>
      <Muted>{multa.reason}</Muted>
      <View className="flex-row flex-wrap gap-4 pt-1">
        {multa.pointsPenalty > 0 ? (
          <Text className="font-inter-semibold text-sm" style={{ color: noir.danger }}>
            −{multa.pointsPenalty} pts
          </Text>
        ) : null}
        {multa.chipsAmount ? <Muted>{multa.chipsAmount} fichas</Muted> : null}
        {multa.moneyAmount ? <Muted>${multa.moneyAmount}</Muted> : null}
      </View>
    </View>
  );
}
