/**
 * Eliminaciones de la fecha. Paridad con CPEliminationHistory de la web
 * (editar quién salió y quién lo eliminó) más "Deshacer" de la última, que la
 * API permite (DELETE /api/eliminations/[id], solo la más reciente y con la
 * fecha en curso) y en la mesa es lo que se necesita tras un toque errado.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CPButton } from '@/components/ui/CPButton';
import { CPCard } from '@/components/ui/CPCard';
import { Muted, Overline, Title } from '@/components/ui/Typography';
import { apiFetch } from '@/lib/api';
import { useCP } from '@/theme/tone';

import { eliminationErrorMessage } from './live-data';
import { PlayerChips, playerName } from './PlayerChips';
import type { DatePlayer, Elimination } from './types';

function clock(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function EliminationList({
  eliminations,
  players,
  canWrite,
  canUndo,
  onChanged,
}: {
  eliminations: Elimination[];
  players: DatePlayer[];
  canWrite: boolean;
  /** Solo con la fecha en curso. */
  canUndo: boolean;
  onChanged: () => void;
}) {
  const c = useCP();
  const [editing, setEditing] = useState<Elimination | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (eliminations.length === 0) return null;

  // Más reciente primero: la de menor posición.
  const sorted = [...eliminations].sort((a, b) => a.position - b.position);
  const latest = sorted[0];

  const undo = () => {
    Alert.alert(
      'Deshacer eliminación',
      `Se borra la posición ${latest.position}: ${playerName(latest.eliminatedPlayer)}. Vuelve a la mesa.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deshacer',
          style: 'destructive',
          onPress: async () => {
            setUndoing(true);
            setError(null);
            try {
              await apiFetch(`/api/eliminations/${latest.id}`, {
                method: 'DELETE',
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              onChanged();
            } catch (e) {
              setError(eliminationErrorMessage(e));
            } finally {
              setUndoing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <CPCard className="gap-3">
      <View className="flex-row items-center justify-between">
        <Overline>Eliminaciones</Overline>
        {canWrite && canUndo && latest.position !== 1 ? (
          <Pressable
            accessibilityRole="button"
            onPress={undo}
            disabled={undoing}
            hitSlop={8}
            className="min-h-[44px] flex-row items-center gap-1 px-2 active:opacity-70">
            <Ionicons name="arrow-undo" size={16} color={c.primaryLight} />
            <Text className="font-inter-medium text-sm text-cp-primary-light">
              {undoing ? 'Deshaciendo…' : 'Deshacer última'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {error ? <Text className="font-inter text-sm text-cp-primary-light">{error}</Text> : null}

      {sorted.map((e) => {
        const time = clock(e.eliminationTime);
        return (
          <View key={e.id} className="min-h-[52px] flex-row items-center gap-3 border-b border-cp-surface-border/60 py-2">
            <Text className="w-8 text-center font-display text-lg text-cp-on-surface">{e.position}</Text>
            <View className="flex-1">
              <Text className="font-inter-medium text-base text-cp-on-surface" numberOfLines={1}>
                {playerName(e.eliminatedPlayer)}
                {e.position === 1 ? (
                  <Text className="text-cp-gold"> · Ganador</Text>
                ) : (
                  <Text className="text-cp-on-surface-muted">
                    {' '}
                    vs {e.eliminatorPlayer ? playerName(e.eliminatorPlayer) : 'N/A'}
                  </Text>
                )}
              </Text>
              {time ? <Muted className="text-xs">{time}</Muted> : null}
            </View>
            <Text className="w-10 text-right font-display text-base text-cp-on-surface">{e.points}</Text>
            {canWrite ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Editar posición ${e.position}`}
                onPress={() => setEditing(e)}
                hitSlop={8}
                className="h-11 w-11 items-center justify-center active:opacity-70">
                <Ionicons name="create-outline" size={20} color={c.onSurfaceVariant} />
              </Pressable>
            ) : null}
          </View>
        );
      })}

      {editing ? (
        <EditEliminationModal
          elimination={editing}
          players={players}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
        />
      ) : null}
    </CPCard>
  );
}

function EditEliminationModal({
  elimination,
  players,
  onClose,
  onSaved,
}: {
  elimination: Elimination;
  players: DatePlayer[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const c = useCP();
  const [eliminatedId, setEliminatedId] = useState<string | null>(elimination.eliminatedPlayer.id);
  const [eliminatorId, setEliminatorId] = useState<string | null>(elimination.eliminatorPlayer?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isWinner = elimination.position === 1;

  const save = async () => {
    if (!eliminatedId) return;
    if (eliminatorId && eliminatorId === eliminatedId && !isWinner) {
      setError('El eliminador no puede ser el mismo jugador eliminado');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/eliminations/${elimination.id}`, {
        method: 'PUT',
        json: {
          eliminatedPlayerId: eliminatedId,
          eliminatorPlayerId: isWinner ? eliminatedId : eliminatorId,
        },
      });
      onSaved();
    } catch (e) {
      setError(eliminationErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: c.surface0 }}>
        <ScrollView contentContainerClassName="gap-5 p-4" keyboardShouldPersistTaps="handled">
          <View className="gap-1">
            <Overline>Editar eliminación</Overline>
            <Title>
              Posición {elimination.position} · {elimination.points} pts
            </Title>
            <Muted>La posición y los puntos no cambian; solo quién salió y quién lo eliminó.</Muted>
          </View>

          {error ? <Text className="font-inter text-sm text-cp-primary-light">{error}</Text> : null}

          <View className="gap-2">
            <Overline>{isWinner ? 'Ganador' : 'Sale'}</Overline>
            <PlayerChips
              players={players}
              selectedId={eliminatedId}
              onSelect={setEliminatedId}
              accent="negative"
              disabled={saving}
            />
          </View>

          {!isWinner ? (
            <View className="gap-2">
              <Overline>Lo eliminó</Overline>
              <PlayerChips
                players={players.filter((p) => p.id !== eliminatedId)}
                selectedId={eliminatorId}
                onSelect={setEliminatorId}
                disabled={saving}
              />
            </View>
          ) : null}

          <View className="flex-row gap-3">
            <CPButton title="Cancelar" variant="ghost" onPress={onClose} disabled={saving} className="flex-1" />
            <CPButton title="Guardar" onPress={save} loading={saving} disabled={!eliminatedId} className="flex-[2]" />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
