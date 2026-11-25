/**
 * Registro de una eliminación. Paridad con CPEliminationForm de la web:
 * la posición es la siguiente libre, los puntos salen de @poker/shared y en
 * la posición 2 el ganador se deduce solo. Antes de enviar se confirma.
 */
import { calculatePointsForPosition } from '@poker/shared';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { CPButton } from '@/components/ui/CPButton';
import { CPCard } from '@/components/ui/CPCard';
import { Muted, Overline } from '@/components/ui/Typography';
import { apiFetch } from '@/lib/api';

import { eliminationErrorMessage } from './live-data';
import { PlayerChips, playerName } from './PlayerChips';
import type { DatePlayer, Elimination } from './types';

type CreateResponse = Elimination & {
  autoCompleteError?: string;
  triggeredAutoComplete?: boolean;
};

export function EliminationForm({
  gameDateId,
  players,
  activePlayers,
  nextPosition,
  onRegistered,
}: {
  gameDateId: number;
  players: DatePlayer[];
  /** Los que siguen en mesa. */
  activePlayers: DatePlayer[];
  nextPosition: number;
  onRegistered: () => void;
}) {
  const [eliminatedId, setEliminatedId] = useState<string | null>(null);
  const [eliminatorId, setEliminatorId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const points = calculatePointsForPosition(nextPosition, players.length);
  const isFinal = nextPosition === 2;
  const eliminated = activePlayers.find((p) => p.id === eliminatedId) ?? null;
  const autoWinner = isFinal && eliminatedId ? (activePlayers.find((p) => p.id !== eliminatedId) ?? null) : null;
  const eliminator = isFinal ? autoWinner : (activePlayers.find((p) => p.id === eliminatorId) ?? null);
  const valid = Boolean(eliminated && eliminator && eliminator.id !== eliminated.id);

  const reset = () => {
    setEliminatedId(null);
    setEliminatorId(null);
    setError(null);
  };

  const submit = async () => {
    if (!eliminated || !eliminator) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiFetch<CreateResponse>('/api/eliminations', {
        method: 'POST',
        json: {
          gameDateId,
          position: nextPosition,
          eliminatedPlayerId: eliminated.id,
          eliminatorPlayerId: eliminator.id,
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      reset();
      onRegistered();
      if (result.autoCompleteError) Alert.alert('Atención', result.autoCompleteError);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError(eliminationErrorMessage(e));
      // Puede que otro teléfono haya cargado esta posición: refrescar.
      onRegistered();
    } finally {
      setSubmitting(false);
    }
  };

  const confirm = () => {
    if (!eliminated || !eliminator) return;
    const message = isFinal
      ? `${playerName(eliminated)} sale 2.º (${points} pts).\n${playerName(eliminator)} gana la fecha.`
      : `${playerName(eliminated)} sale en la posición ${nextPosition} (${points} pts), eliminado por ${playerName(eliminator)}.`;
    Alert.alert(isFinal ? 'Cerrar la mesa' : 'Registrar eliminación', message, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Registrar', onPress: submit },
    ]);
  };

  return (
    <CPCard className="gap-4">
      <View className="flex-row items-baseline justify-between">
        <Text className="font-display text-2xl text-cp-on-surface">Pos {nextPosition}</Text>
        <Text className="font-display text-2xl text-cp-primary-light">{points} pts</Text>
      </View>

      {error ? (
        <View className="rounded-cp border border-cp-primary/50 bg-cp-primary/10 p-3">
          <Text className="font-inter text-sm text-cp-primary-light">{error}</Text>
        </View>
      ) : null}

      <View className="gap-2">
        <Overline>Sale</Overline>
        <PlayerChips
          players={activePlayers}
          selectedId={eliminatedId}
          disabled={submitting}
          accent="negative"
          onSelect={(id) => {
            setEliminatedId(id);
            if (id && id === eliminatorId) setEliminatorId(null);
          }}
        />
      </View>

      <View className="gap-2">
        <Overline>{isFinal ? 'Ganador' : 'Lo eliminó'}</Overline>
        {isFinal ? (
          <Muted className="text-base">{autoWinner ? playerName(autoWinner) : 'Elegí primero al que sale.'}</Muted>
        ) : eliminatedId ? (
          <PlayerChips
            players={activePlayers.filter((p) => p.id !== eliminatedId)}
            selectedId={eliminatorId}
            disabled={submitting}
            onSelect={setEliminatorId}
          />
        ) : (
          <Muted>Elegí primero al que sale.</Muted>
        )}
      </View>

      {isFinal ? (
        <View className="rounded-cp border border-cp-info/40 bg-cp-info/10 p-3">
          <Muted className="text-cp-info">Al registrar la posición 2 se declara automáticamente el ganador.</Muted>
        </View>
      ) : null}

      <View className="flex-row gap-3">
        <CPButton title="Limpiar" variant="ghost" onPress={reset} disabled={submitting} className="flex-1" />
        <CPButton title="Registrar" onPress={confirm} disabled={!valid} loading={submitting} className="flex-[2]" />
      </View>
    </CPCard>
  );
}
