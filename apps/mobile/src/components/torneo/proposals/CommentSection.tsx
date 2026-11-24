/**
 * Comentarios de una propuesta: lista y caja para escribir. Con la votación
 * cerrada se pueden leer pero no escribir (el servidor también lo rechaza).
 */
import { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import useSWR from 'swr';

import { NoirButton } from '@/components/ui/NoirButton';
import { Body, Muted, Overline } from '@/components/ui/Typography';
import { ApiError } from '@/lib/api';
import { noir } from '@/theme/colors';

import { formatProposalDate, postComment, PROPOSAL_LIMITS, proposalKeys, type CommentsResponse } from './api';

export function CommentSection({ proposalId, closed }: { proposalId: number; closed: boolean }) {
  const { data, error, mutate } = useSWR<CommentsResponse>(proposalKeys.comments(proposalId));
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  if (error instanceof ApiError && error.status === 404) {
    return <Muted>Los comentarios todavía no están disponibles en la app.</Muted>;
  }

  const trimmed = text.trim();
  const send = async () => {
    if (!trimmed || closed) return;
    setSending(true);
    try {
      await postComment(proposalId, trimmed);
      setText('');
      await mutate();
    } catch (e) {
      Alert.alert('No se pudo comentar', e instanceof Error ? e.message : 'Probá de nuevo.');
    } finally {
      setSending(false);
    }
  };

  const comments = data?.comments ?? [];

  return (
    <View className="gap-3">
      <Overline>Comentarios ({comments.length})</Overline>

      {comments.map((c) => (
        <View key={c.id} className="gap-1 rounded-xl border border-noir-border bg-noir-bg/60 p-3">
          <Muted>
            {c.player.firstName} {c.player.lastName} · {formatProposalDate(c.createdAt)}
          </Muted>
          <Body className="text-base">{c.content}</Body>
        </View>
      ))}
      {data && comments.length === 0 ? <Muted>Nadie comentó todavía.</Muted> : null}
      {error && !(error instanceof ApiError && error.status === 404) ? (
        <Muted>No se pudieron cargar los comentarios.</Muted>
      ) : null}

      {closed ? null : (
        <View className="gap-2">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Escribí un comentario…"
            placeholderTextColor={`${noir.muted}99`}
            maxLength={PROPOSAL_LIMITS.comment}
            multiline
            className="min-h-[72px] rounded-xl border border-noir-border bg-noir-bg px-3 py-2 font-inter text-base text-noir-text"
            style={{ textAlignVertical: 'top' }}
          />
          <View className="flex-row items-center justify-between gap-3">
            <Muted>
              {text.length}/{PROPOSAL_LIMITS.comment}
            </Muted>
            <NoirButton title="Comentar" variant="outline" onPress={send} loading={sending} disabled={!trimmed} />
          </View>
        </View>
      )}
    </View>
  );
}
