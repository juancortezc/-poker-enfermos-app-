/**
 * Resultados por fecha (web: /fecha). Selector de fecha, y para las jugadas
 * las pestañas Posiciones (podio en metal, malazos en rosa) y Eliminaciones
 * (quién eliminó a quién). Acepta `?tab=eliminaciones` como la web y además
 * `?id=` para abrir una fecha concreta desde el calendario.
 */
import { fullName, playerLabel } from '@poker/shared';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { Score } from '@/components/jugador/Bits';
import { Segmented } from '@/components/jugador/Segmented';
import { CPButton } from '@/components/ui/CPButton';
import { CPCard } from '@/components/ui/CPCard';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { Body, Muted } from '@/components/ui/Typography';
import { useActiveTournament } from '@/hooks/useActiveTournament';
import { useRefresh } from '@/hooks/useRefresh';
import { useTournamentDates, type EliminationDTO } from '@/hooks/useTournamentDates';
import { cpLight as c } from '@/theme/colors';

type Tab = 'posiciones' | 'eliminaciones';

const pointsLabel = (e: EliminationDTO) => (e.eliminatedPlayer.role === 'Invitado' ? '—' : `${e.points} pts`);

export default function FechaScreen() {
  const params = useLocalSearchParams<{ tab?: string; id?: string }>();
  const active = useActiveTournament();
  const datesSwr = useTournamentDates(active.tournament?.id);
  const { refreshing, onRefresh } = useRefresh(active.mutate, datesSwr.mutate);

  const [selectedId, setSelectedId] = useState<number | null>(params.id ? Number(params.id) : null);
  const [tab, setTab] = useState<Tab>(params.tab === 'eliminaciones' ? 'eliminaciones' : 'posiciones');

  const dates = datesSwr.dates ?? [];
  const lastCompleted = [...dates].reverse().find((d) => d.status === 'completed');
  const selected = dates.find((d) => d.id === selectedId) ?? lastCompleted ?? dates[0] ?? null;

  const body = (() => {
    if (active.isLoading || (active.tournament && !datesSwr.data && !datesSwr.error)) return <LoadingState message="Cargando fechas…" />;
    if (!active.tournament) return <EmptyState icon="trophy-outline" message="No hay torneo activo." />;
    if (datesSwr.error) return <ErrorState error={datesSwr.error} onRetry={() => datesSwr.mutate()} />;
    if (!selected) return <EmptyState icon="calendar-outline" message="Todavía no hay fechas registradas." />;

    const isCompleted = selected.status === 'completed';
    const results = [...selected.eliminations].sort((a, b) => a.position - b.position);
    const events = selected.eliminations.filter((e) => e.position !== 1).sort((a, b) => b.position - a.position);

    return (
      <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {dates.map((d) => {
            const isSel = selected.id === d.id;
            const done = d.status === 'completed';
            return (
              <Pressable
                key={d.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSel }}
                accessibilityLabel={`Fecha ${d.dateNumber}`}
                onPress={() => setSelectedId(d.id)}
                style={{
                  backgroundColor: isSel ? c.primary : done ? c.surface1 : 'transparent',
                  borderColor: isSel ? c.primary : c.surfaceBorder,
                }}
                className="min-h-[52px] w-12 items-center justify-center rounded-cp border active:opacity-70">
                <Text className={`font-inter-semibold text-[11px] ${isSel ? 'text-white' : 'text-cp-on-surface-muted'}`}>F</Text>
                <Text className={`font-display text-base ${isSel ? 'text-white' : done ? 'text-cp-on-surface' : 'text-cp-on-surface-muted'}`}>
                  {d.dateNumber}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {!isCompleted ? (
          <CPCard className="items-center gap-2">
            <Body className="font-inter-semibold text-base">
              Fecha {selected.dateNumber} {selected.status === 'in_progress' ? 'se está jugando' : 'todavía no se ha jugado'}
            </Body>
            <Muted>
              {new Date(selected.scheduledDate).toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Muted>
          </CPCard>
        ) : (
          <>
            <Segmented
              options={[
                { id: 'posiciones', label: 'Posiciones' },
                { id: 'eliminaciones', label: 'Eliminaciones' },
              ]}
              value={tab}
              onChange={setTab}
            />
            {tab === 'posiciones' ? (
              <View className="gap-2">
                {results.map((e) => {
                  const podium = e.position <= 3;
                  const malazo = e.position > results.length - 2;
                  const accent = podium ? [c.gold, c.silver, c.bronze][e.position - 1] : malazo ? c.malazoText : null;
                  return (
                    <Pressable
                      key={e.id}
                      accessibilityRole="button"
                      onPress={() => router.push({ pathname: '/players/[id]', params: { id: e.eliminatedPlayer.id } })}
                      style={{ borderColor: accent ?? c.surfaceBorder }}
                      className="min-h-[64px] flex-row items-center gap-3 rounded-cp border bg-cp-surface-1 px-3 py-2 active:opacity-80">
                      {accent ? <View style={{ backgroundColor: accent }} className="absolute bottom-2 left-0 top-2 w-[3px] rounded" /> : null}
                      <Score value={`#${e.position}`} size={14} color={accent ?? c.onSurfaceMuted} />
                      <PlayerAvatar name={fullName(e.eliminatedPlayer)} photoUrl={e.eliminatedPlayer.photoUrl} role={e.eliminatedPlayer.role} size={48} />
                      <Text numberOfLines={1} className="flex-1 font-inter-semibold text-sm text-cp-on-surface">
                        {fullName(e.eliminatedPlayer)}
                      </Text>
                      <Score value={pointsLabel(e)} size={15} color={accent ?? c.onSurface} />
                    </Pressable>
                  );
                })}
                {results.length === 0 ? <EmptyState icon="list-outline" message="No hay resultados registrados." /> : null}
              </View>
            ) : (
              <View className="gap-2">
                {events.length === 0 ? <EmptyState icon="list-outline" message="No hay eliminaciones registradas." /> : null}
                {events.map((e) => (
                  <View key={e.id} className="min-h-[64px] flex-row items-center gap-3 rounded-cp border border-cp-surface-border bg-cp-surface-1 px-3 py-2">
                    <Score value={`#${e.position}`} size={13} color={c.onSurfaceMuted} />
                    <PlayerAvatar name={fullName(e.eliminatedPlayer)} photoUrl={e.eliminatedPlayer.photoUrl} role={e.eliminatedPlayer.role} size={44} />
                    <View className="flex-1">
                      <Text className="font-inter-semibold text-sm text-cp-on-surface">{fullName(e.eliminatedPlayer)}</Text>
                      {e.eliminatorPlayer ? <Muted className="text-xs">eliminado por {playerLabel(e.eliminatorPlayer)}</Muted> : null}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <CPButton title="Ver calendario completo" variant="outline" onPress={() => router.push('/calendario')} />
      </>
    );
  })();

  return (
    <>
      <Stack.Screen options={{ title: selected ? `Fecha ${selected.dateNumber}` : 'Fecha' }} />
      <Screen tone="light" refreshing={refreshing} onRefresh={onRefresh}>
        {body}
      </Screen>
    </>
  );
}
