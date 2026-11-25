/**
 * Pestaña Multas del panel (CPMultasTab + CPMultaForm de la web): lista de
 * multas del torneo activo, alta, edición, marcar pagada y borrar con
 * confirmación. Los jugadores salen de la tabla del torneo, como en la web.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OptionPicker } from '@/components/torneo/OptionPicker';
import { CPButton } from '@/components/ui/CPButton';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { Muted, Overline, Title } from '@/components/ui/Typography';
import { useMultas, type Multa } from '@/hooks/useMultas';
import { useTournamentRanking } from '@/hooks/useTournamentRanking';
import { apiFetch } from '@/lib/api';
import { useCP } from '@/theme/tone';

import { confirmAction, errorMessage } from '../api';
import { Field, FormError, Pill } from '../Form';

export function MultasTab({ tournamentId }: { tournamentId: number | undefined }) {
  const { multas, error, isLoading, mutate } = useMultas(tournamentId);
  const { ranking } = useTournamentRanking(tournamentId);
  const [editing, setEditing] = useState<Multa | 'new' | null>(null);

  if (!tournamentId) return <EmptyState icon="hammer-outline" message="No hay torneo activo." />;
  if (isLoading && !multas) return <LoadingState />;
  if (error && !multas) return <ErrorState error={error} onRetry={() => mutate()} />;

  const players = (ranking?.rankings ?? []).map((r) => ({ value: r.playerId, label: r.playerName }));

  return (
    <View className="gap-3">
      <CPButton title="Nueva multa" onPress={() => setEditing('new')} />
      {(multas ?? []).length === 0 ? (
        <EmptyState icon="hammer-outline" message="Sin multas en este torneo." />
      ) : (
        (multas ?? []).map((m) => (
          <Pressable
            key={m.id}
            accessibilityRole="button"
            accessibilityLabel={`Editar multa de ${m.player.firstName}`}
            onPress={() => setEditing(m)}
            className="gap-1 rounded-card border border-cp-surface-border bg-cp-surface-1 p-4 active:bg-cp-surface-2">
            <View className="flex-row items-center justify-between gap-2">
              <Text className="flex-1 font-inter-semibold text-base text-cp-on-surface">
                {m.player.firstName} {m.player.lastName}
              </Text>
              <Pill label={m.paid ? 'Pagada' : 'Pendiente'} tone={m.paid ? 'ok' : 'negative'} />
            </View>
            <Muted>{m.reason}</Muted>
            <Text className="font-inter text-xs text-cp-negative">
              {[
                m.pointsPenalty ? `−${m.pointsPenalty} pts` : null,
                m.chipsAmount ? `${m.chipsAmount} fichas` : null,
                m.moneyAmount ? `$${m.moneyAmount}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </Pressable>
        ))
      )}
      {editing ? (
        <MultaForm
          tournamentId={tournamentId}
          multa={editing === 'new' ? null : editing}
          players={players}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            mutate();
          }}
        />
      ) : null}
    </View>
  );
}

function MultaForm({
  tournamentId,
  multa,
  players,
  onClose,
  onSaved,
}: {
  tournamentId: number;
  multa: Multa | null;
  players: { value: string; label: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const c = useCP();
  const [playerId, setPlayerId] = useState<string | null>(multa?.player.id ?? null);
  const [reason, setReason] = useState(multa?.reason ?? '');
  const [points, setPoints] = useState(multa?.pointsPenalty ? String(multa.pointsPenalty) : '');
  const [chips, setChips] = useState(multa?.chipsAmount != null ? String(multa.chipsAmount) : '');
  const [money, setMoney] = useState(multa?.moneyAmount != null ? String(multa.moneyAmount) : '');
  const [paid, setPaid] = useState(multa?.paid ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    if (!playerId) return setError('Elegí un jugador.');
    if (!reason.trim()) return setError('La razón es obligatoria.');
    if (!points && !chips && !money) return setError('Ingresá puntos, fichas o dinero.');
    setBusy(true);
    try {
      await apiFetch(multa ? `/api/multas/${multa.id}` : '/api/multas', {
        method: multa ? 'PATCH' : 'POST',
        json: {
          tournamentId,
          playerId,
          reason: reason.trim(),
          pointsPenalty: points || 0,
          chipsAmount: chips || null,
          moneyAmount: money || null,
          paid,
        },
      });
      onSaved();
    } catch (e) {
      setError(errorMessage(e, 'Error al guardar la multa'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!multa) return;
    if (!(await confirmAction('Eliminar multa', `¿Eliminar la multa de ${multa.player.firstName}?`, 'Eliminar'))) return;
    setBusy(true);
    try {
      await apiFetch(`/api/multas/${multa.id}`, { method: 'DELETE' });
      onSaved();
    } catch (e) {
      setError(errorMessage(e, 'Error al eliminar la multa'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/60">
        <View className="max-h-[90%] rounded-t-3xl border-t border-cp-surface-border bg-cp-surface-0">
          <SafeAreaView edges={['bottom']}>
            <View className="flex-row items-center justify-between px-5 pb-1 pt-4">
              <Title className="text-xl">{multa ? 'Editar multa' : 'Nueva multa'}</Title>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} className="h-11 w-11 items-center justify-center">
                <Ionicons name="close" size={22} color={c.onSurfaceVariant} />
              </Pressable>
            </View>
            <ScrollView contentContainerClassName="gap-4 px-5 pb-6" keyboardShouldPersistTaps="handled">
              <View className="gap-1.5">
                <Overline className="text-[11px]">Jugador *</Overline>
                <OptionPicker label="Jugador" value={playerId} options={players} placeholder="Elegir jugador" onChange={setPlayerId} />
              </View>
              <Field label="Razón *" value={reason} onChangeText={setReason} placeholder="Llegó tarde, faltó…" />
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Field label="Puntos" value={points} onChangeText={(t) => setPoints(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
                </View>
                <View className="flex-1">
                  <Field label="Fichas" value={chips} onChangeText={(t) => setChips(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
                </View>
                <View className="flex-1">
                  <Field label="Dinero" value={money} onChangeText={(t) => setMoney(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
                </View>
              </View>
              <View className="min-h-[44px] flex-row items-center justify-between">
                <Text className="font-inter text-base text-cp-on-surface">Pagada</Text>
                <Switch value={paid} onValueChange={setPaid} trackColor={{ true: c.primary, false: c.surface3 }} thumbColor={c.onPrimary} />
              </View>
              <FormError message={error} />
              <CPButton title="Guardar" size="lg" loading={busy} onPress={save} />
              {multa ? <CPButton title="Eliminar multa" variant="ghost" disabled={busy} onPress={remove} /> : null}
            </ScrollView>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
