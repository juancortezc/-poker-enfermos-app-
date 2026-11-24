/**
 * Votos 👍/👎 de una propuesta. Tocar el voto propio lo quita; tocar el otro
 * lo cambia (el servidor hace upsert). Deshabilitado con la votación cerrada.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import useSWR from 'swr';

import { Muted } from '@/components/ui/Typography';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api';
import { noir } from '@/theme/colors';
import type { VoteType } from '@poker/shared';

import { castVote, proposalKeys, removeVote, type VotesResponse } from './api';

export function VotingButtons({ proposalId, closed }: { proposalId: number; closed: boolean }) {
  const { user } = useAuth();
  const { data, error, mutate } = useSWR<VotesResponse>(proposalKeys.votes(proposalId));
  const [busy, setBusy] = useState<VoteType | null>(null);

  if (error instanceof ApiError && error.status === 404) {
    return <Muted>La votación todavía no está disponible en la app.</Muted>;
  }

  const myVote = data?.votes.find((v) => v.player.id === user?.id)?.voteType ?? null;
  const stats = data?.stats ?? { thumbsUp: 0, thumbsDown: 0, total: 0 };

  const vote = async (type: VoteType) => {
    if (closed || busy) return;
    setBusy(type);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      if (myVote === type) await removeVote(proposalId);
      else await castVote(proposalId, type);
      await mutate();
    } catch (e) {
      Alert.alert('No se pudo votar', e instanceof Error ? e.message : 'Probá de nuevo.');
    } finally {
      setBusy(null);
    }
  };

  const button = (type: VoteType, icon: 'thumbs-up' | 'thumbs-down', count: number) => {
    const mine = myVote === type;
    const color = type === 'thumbsUp' ? noir.gold : noir.danger;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${type === 'thumbsUp' ? 'A favor' : 'En contra'}: ${count}`}
        accessibilityState={{ disabled: closed, selected: mine }}
        disabled={closed || !data}
        onPress={() => vote(type)}
        className={`min-h-[44px] flex-1 flex-row items-center justify-center gap-2 rounded-full border ${
          mine ? '' : 'border-noir-border'
        } ${closed ? 'opacity-50' : 'active:opacity-80'}`}
        style={mine ? { borderColor: color, backgroundColor: `${color}22` } : undefined}>
        {busy === type ? (
          <ActivityIndicator color={color} />
        ) : (
          <Ionicons name={mine ? icon : `${icon}-outline`} size={20} color={color} />
        )}
        <Text className="font-inter-bold text-base text-noir-text">{count}</Text>
      </Pressable>
    );
  };

  return (
    <View className="gap-2">
      <View className="flex-row gap-3">
        {button('thumbsUp', 'thumbs-up', stats.thumbsUp)}
        {button('thumbsDown', 'thumbs-down', stats.thumbsDown)}
      </View>
      {closed ? <Muted className="text-center">Votación cerrada por la Comisión.</Muted> : null}
      {error && !(error instanceof ApiError && error.status === 404) ? (
        <Muted className="text-center">No se pudieron cargar los votos.</Muted>
      ) : null}
    </View>
  );
}
