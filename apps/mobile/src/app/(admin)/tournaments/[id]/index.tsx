/**
 * Ficha del torneo. En la web /tournaments/[id] redirige al formulario y las
 * acciones viven en modales (TournamentCompletionModal, cancelar). Aquí se
 * juntan: resumen, fechas (las configuradas o en curso abren su confirmación),
 * editar, mover la fecha final, terminar ("CONFIRMO") y cancelar
 * ("CANCELAR TORNEO", borra todo).
 *
 * Terminar con una fecha configurada o en curso se bloquea aquí: la API lo
 * acepta y deja esa fecha colgada en un torneo finalizado.
 */
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  errorMessage,
  shortDate,
  statusLabel,
  useAdminRefresh,
  useTournament,
  type TournamentDetail,
} from '@/components/admin/api';
import { DateStepper } from '@/components/admin/DateStepper';
import { FormError, Notice, Pill } from '@/components/admin/Form';
import { TypedConfirm } from '@/components/admin/TypedConfirm';
import { Header } from '@/components/ui/Header';
import { CPButton } from '@/components/ui/CPButton';
import { CPCard } from '@/components/ui/CPCard';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { Muted, Overline } from '@/components/ui/Typography';
import { useRefresh } from '@/hooks/useRefresh';
import { apiFetch } from '@/lib/api';

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tournamentId = parseInt(id ?? '', 10) || null;
  const { data, error, isLoading, mutate } = useTournament(tournamentId);
  const { refreshing, onRefresh } = useRefresh(() => mutate());

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Stack.Screen options={{ title: data ? `Torneo ${data.number}` : 'Torneo' }} />
      {isLoading && !data ? (
        <LoadingState />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={() => mutate()} />
      ) : data ? (
        <Detail t={data} onChanged={() => mutate()} />
      ) : null}
    </Screen>
  );
}

function Detail({ t, onChanged }: { t: TournamentDetail; onChanged: () => void }) {
  const refresh = useAdminRefresh();
  const [modal, setModal] = useState<'complete' | 'cancel' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const last = t.gameDates[t.gameDates.length - 1];
  const [endDate, setEndDate] = useState(last ? last.scheduledDate.split('T')[0] : '');
  const [endMsg, setEndMsg] = useState<string | null>(null);

  const completed = t.gameDates.filter((d) => d.status === 'completed').length;
  const open = t.gameDates.filter((d) => d.status === 'CREATED' || d.status === 'in_progress');
  const isActive = t.status === 'ACTIVO';
  const cancelWord = isActive ? 'CANCELAR TORNEO ACTIVO' : 'CANCELAR TORNEO';

  const complete = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/tournaments/${t.id}/complete`, { method: 'POST', json: { action: 'complete_tournament' } });
      setModal(null);
      refresh.tournaments(t.id);
      onChanged();
    } catch (e) {
      setError(errorMessage(e, 'Error al terminar el torneo'));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/tournaments/${t.id}`, { method: 'DELETE' });
      setModal(null);
      refresh.tournaments();
      router.back();
    } catch (e) {
      setError(errorMessage(e, 'Error al cancelar el torneo'));
    } finally {
      setBusy(false);
    }
  };

  const moveEnd = async () => {
    setBusy(true);
    setEndMsg(null);
    try {
      // Mediodía UTC: con "YYYY-MM-DD" a secas la API guarda medianoche UTC,
      // que en Ecuador es el día anterior.
      await apiFetch(`/api/tournaments/${t.id}/complete`, {
        method: 'POST',
        json: { action: 'modify_date', endDate: `${endDate}T12:00:00.000Z` },
      });
      setEndMsg('Fecha final actualizada.');
      refresh.tournaments(t.id);
      onChanged();
    } catch (e) {
      setEndMsg(errorMessage(e, 'Error al mover la fecha final'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Header
        overline={isActive ? 'Torneo activo' : 'Torneo finalizado'}
        title={`Torneo ${t.number}`}
        subtitle={`${t.tournamentParticipants.length} jugadores · ${completed}/${t.gameDates.length} fechas · ${t.blindLevels.length} niveles`}
      />

      <CPButton
        title="Editar torneo"
        variant="outline"
        onPress={() => router.push({ pathname: '/tournaments/[id]/edit', params: { id: String(t.id) } })}
      />

      <CPCard className="gap-1 p-4">
        <Overline className="pb-2">Fechas</Overline>
        {t.gameDates.map((d) => {
          const actionable = d.status === 'CREATED' || d.status === 'in_progress';
          const row = (
            <View className="min-h-[44px] flex-row items-center gap-3 border-b border-cp-surface-border py-2">
              <Text className="w-16 font-display text-sm text-cp-on-surface">Fecha {d.dateNumber}</Text>
              <Text className="flex-1 font-inter text-sm text-cp-on-surface">{shortDate(d.scheduledDate)}</Text>
              {d.status !== 'pending' ? (
                <Pill label={statusLabel[d.status]} tone={d.status === 'completed' ? 'muted' : actionable ? 'info' : 'negative'} />
              ) : null}
            </View>
          );
          return actionable ? (
            <Pressable
              key={d.id}
              accessibilityRole="button"
              accessibilityLabel={`Abrir la fecha ${d.dateNumber}`}
              onPress={() => router.push({ pathname: '/game-dates/[id]/confirm', params: { id: String(d.id) } })}
              className="active:opacity-70">
              {row}
            </Pressable>
          ) : (
            <View key={d.id}>{row}</View>
          );
        })}
      </CPCard>

      {isActive ? (
        <>
          {last ? (
            <CPCard className="gap-3 p-4">
              <Overline>Fecha final</Overline>
              <Muted className="text-xs">Mueve solo la fecha {last.dateNumber}.</Muted>
              <DateStepper value={endDate} onChange={setEndDate} label="Fecha final" disabled={busy} />
              {endMsg ? <Muted>{endMsg}</Muted> : null}
              <CPButton
                title="Guardar fecha final"
                variant="outline"
                disabled={busy || endDate === last.scheduledDate.split('T')[0]}
                onPress={moveEnd}
              />
            </CPCard>
          ) : null}

          <CPCard className="gap-3 p-4">
            <Overline>Terminar</Overline>
            {open.length > 0 ? (
              <Notice tone="danger">
                La fecha {open[0].dateNumber} está {statusLabel[open[0].status].toLowerCase()}. Cerrala o eliminala antes de
                terminar el torneo.
              </Notice>
            ) : completed < t.gameDates.length ? (
              <Notice>Quedan {t.gameDates.length - completed} fechas sin jugar: se terminaría anticipadamente.</Notice>
            ) : null}
            <CPButton
              title={completed === t.gameDates.length ? 'Terminar torneo' : 'Terminar anticipadamente'}
              variant="primary"
              disabled={open.length > 0}
              onPress={() => {
                setError(null);
                setModal('complete');
              }}
            />
          </CPCard>
        </>
      ) : null}

      <CPButton
        title="Cancelar torneo"
        variant="ghost"
        onPress={() => {
          setError(null);
          setModal('cancel');
        }}
      />

      <TypedConfirm
        visible={modal === 'complete'}
        title={`Terminar el Torneo ${t.number}`}
        message="Termina el torneo definitivamente, aunque falten fechas, y genera el podio. No se puede deshacer."
        word="CONFIRMO"
        confirmTitle="Terminar"
        loading={busy}
        error={error}
        onConfirm={complete}
        onClose={() => setModal(null)}
      />
      <TypedConfirm
        visible={modal === 'cancel'}
        title={`Cancelar el Torneo ${t.number}`}
        message="Borra para siempre el torneo con sus fechas, eliminaciones, participantes, ranking y blinds."
        word={cancelWord}
        confirmTitle="Borrar"
        loading={busy}
        error={error}
        onConfirm={cancel}
        onClose={() => setModal(null)}>
        <FormError message={completed > 0 ? `Tiene ${completed} fechas jugadas que también se borran.` : null} />
      </TypedConfirm>
    </>
  );
}
