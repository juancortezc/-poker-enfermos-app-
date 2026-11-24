/**
 * Padres e Hijos (P&H): relaciones activas (≥3 eliminaciones del mismo
 * jugador) del torneo elegido. Tocar una tarjeta abre el detalle con cada
 * eliminación (ParentChildDetailModal de la web).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useSWR from 'swr';

import { OptionPicker } from '@/components/torneo/OptionPicker';
import { PlayerAvatar, type AvatarPlayer } from '@/components/torneo/PlayerAvatar';
import { EmptyState, ErrorState, LoadingState, Muted, NoirCard, Overline, Title } from '@/components/ui';
import { noir } from '@/theme/colors';
import { playerLabel } from '@poker/shared';

import { useTournamentOptions } from './useTournamentOptions';

type PHPlayer = AvatarPlayer & { id: string };

type Relation = {
  id: number;
  eliminationCount: number;
  firstElimination: string;
  lastElimination: string;
  parentPlayer: PHPlayer;
  childPlayer: PHPlayer;
};

type ListResponse = { parentChildRelations: Relation[]; totalRelations: number };

type DetailResponse = {
  relation: Relation;
  eliminations: { id: number; position: number; dateNumber: number; scheduledDate: string }[];
};

const fmt = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

function RelationCard({ relation, onPress }: { relation: Relation; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${playerLabel(relation.parentPlayer)} eliminó ${relation.eliminationCount} veces a ${playerLabel(relation.childPlayer)}`}
      onPress={onPress}
      className="active:opacity-80">
      <NoirCard className="flex-row items-center gap-3 p-4">
        <View className="items-center gap-1" style={{ width: 72 }}>
          <PlayerAvatar player={relation.parentPlayer} size={52} ring={noir.gold} />
          <Text numberOfLines={1} className="font-inter-semibold text-xs text-noir-text">
            {playerLabel(relation.parentPlayer)}
          </Text>
          <Text className="font-inter text-[10px] uppercase tracking-[1px] text-noir-gold">Padre</Text>
        </View>
        <View className="flex-1 items-center gap-1">
          <Text className="font-cinzel-bold text-3xl text-noir-text">{relation.eliminationCount}</Text>
          <Ionicons name="arrow-forward" size={18} color={noir.copper} />
          <Muted className="text-[11px]">eliminaciones</Muted>
        </View>
        <View className="items-center gap-1" style={{ width: 72 }}>
          <PlayerAvatar player={relation.childPlayer} size={52} ring={noir.copper} />
          <Text numberOfLines={1} className="font-inter-semibold text-xs text-noir-text">
            {playerLabel(relation.childPlayer)}
          </Text>
          <Text className="font-inter text-[10px] uppercase tracking-[1px] text-noir-copper">Hijo</Text>
        </View>
      </NoirCard>
    </Pressable>
  );
}

function DetailModal({ tournamentId, relationId, onClose }: { tournamentId: number; relationId: number | null; onClose: () => void }) {
  const { data, error, isLoading, mutate } = useSWR<DetailResponse>(
    relationId ? `/api/stats/parent-child/${tournamentId}/${relationId}` : null
  );
  const rel = data?.relation;

  return (
    <Modal visible={relationId !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: noir.bg }}>
        <View className="flex-row items-center justify-between px-4 py-2">
          <Overline>Padre e hijo</Overline>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} className="h-11 w-11 items-center justify-center">
            <Ionicons name="close" size={24} color={noir.muted} />
          </Pressable>
        </View>
        {isLoading ? (
          <View className="px-4">
            <LoadingState />
          </View>
        ) : error ? (
          <View className="px-4">
            <ErrorState error={error} onRetry={() => mutate()} />
          </View>
        ) : rel ? (
          <FlatList
            contentContainerClassName="gap-3 px-4 pb-10"
            data={data.eliminations}
            keyExtractor={(e) => String(e.id)}
            ListHeaderComponent={
              <View className="items-center gap-2 pb-2">
                <Title className="text-center text-xl">
                  {playerLabel(rel.parentPlayer)} → {playerLabel(rel.childPlayer)}
                </Title>
                <Muted>
                  {rel.eliminationCount} eliminaciones · {fmt(rel.firstElimination)} a {fmt(rel.lastElimination)}
                </Muted>
              </View>
            }
            renderItem={({ item, index }) => (
              <View className="flex-row items-center gap-3 rounded-xl border border-noir-border bg-noir-surface p-3">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-noir-copper/30">
                  <Text className="font-inter-bold text-sm text-noir-text">{index + 1}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-inter-semibold text-base text-noir-text">Fecha {item.dateNumber}</Text>
                  <Muted className="text-xs">{fmt(item.scheduledDate)}</Muted>
                </View>
                <Text className="font-inter text-sm text-noir-muted">Salió {item.position}º</Text>
              </View>
            )}
            ListEmptyComponent={<EmptyState message="Sin eliminaciones registradas." />}
          />
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

export function ParentChildTab() {
  const t = useTournamentOptions(28);
  const { data, error, isLoading, mutate } = useSWR<ListResponse>(
    t.selectedId ? `/api/stats/parent-child/${t.selectedId}` : null,
    { refreshInterval: 30000 }
  );
  const [openId, setOpenId] = useState<number | null>(null);
  const relations = data?.parentChildRelations ?? [];

  return (
    <View className="gap-4">
      <View className="flex-row">
        <OptionPicker label="Torneo" value={t.selectedId} options={t.options} onChange={t.setSelectedId} placeholder="Torneo" />
      </View>

      {t.isLoading || isLoading ? <LoadingState message="Cargando P&H…" /> : null}
      {error ? <ErrorState error={error} onRetry={() => mutate()} /> : null}
      {data && relations.length === 0 ? (
        <EmptyState icon="git-network-outline" message="Sin relaciones padre-hijo: nadie eliminó 3 o más veces al mismo jugador." />
      ) : null}

      {relations.map((r) => (
        <RelationCard key={r.id} relation={r} onPress={() => setOpenId(r.id)} />
      ))}
      {relations.length > 0 ? (
        <Muted className="text-center">
          {relations.length} relación{relations.length === 1 ? '' : 'es'} activa{relations.length === 1 ? '' : 's'}
        </Muted>
      ) : null}

      {t.selectedId ? <DetailModal tournamentId={t.selectedId} relationId={openId} onClose={() => setOpenId(null)} /> : null}
    </View>
  );
}
