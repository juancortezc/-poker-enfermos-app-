/**
 * Pestaña Activar del panel (CPActivarTab de la web): configurar la próxima
 * fecha del torneo activo con sus jugadores e invitados y dejarla lista para
 * iniciar. Si ya hay una fecha configurada o en curso, enlaza a ella.
 *
 * Diferencias con la web, por defectos suyos:
 * - Cambiar el día de una fecha pendiente va por PUT /api/tournaments/[id]:
 *   la web usa PUT /api/game-dates/[id], que solo acepta fechas CREATED y
 *   rechaza siempre las pendientes.
 * - Borrar solo se ofrece para la fecha configurada; la API no borra
 *   pendientes y el tacho de la web fallaba.
 */
import { formatDateForInput, fullName, getNextTuesday } from '@poker/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import useSWR from 'swr';

import type { ActiveGameDate } from '@/hooks/useActiveGameDate';
import { Segmented } from '@/components/jugador/Segmented';
import { OptionPicker } from '@/components/torneo/OptionPicker';
import { NoirButton } from '@/components/ui/NoirButton';
import { NoirCard } from '@/components/ui/NoirCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { Muted, Overline, Title } from '@/components/ui/Typography';
import { apiFetch, ApiError } from '@/lib/api';
import { swrKeys } from '@/lib/swr';

import {
  adminKeys,
  confirmAction,
  errorMessage,
  shortDate,
  statusLabel,
  useAdminRefresh,
  useAvailableDates,
  type AdminPlayer,
  type AvailableDatesResponse,
  type AvailableGuestsResponse,
} from '../api';
import { DateStepper } from '../DateStepper';
import { FormError, Notice } from '../Form';
import { PlayerPicker } from '../PlayerPicker';

export function ActivarTab() {
  const active = useSWR<ActiveGameDate | null>(swrKeys.activeGameDate());
  const available = useAvailableDates();

  if ((active.isLoading && active.data === undefined) || (available.isLoading && !available.data && !available.error)) {
    return <LoadingState />;
  }
  if (active.data) return <ActiveDateCard gameDate={active.data} />;
  if (available.error instanceof ApiError && available.error.status === 404) {
    return (
      <EmptyState
        icon="trophy-outline"
        message="No hay torneo activo para activar fechas."
        actionTitle="Crear torneo"
        onAction={() => router.push('/tournaments/new')}
      />
    );
  }
  if (available.error) {
    return <ErrorState error={available.error} onRetry={() => available.mutate()} />;
  }
  if (!available.data) return null;
  if (available.data.blocked) return <BlockedCard data={available.data} onChanged={() => (available.mutate(), active.mutate())} />;
  return <ActivateForm data={available.data} />;
}

function ActiveDateCard({ gameDate }: { gameDate: ActiveGameDate }) {
  const live = gameDate.status === 'in_progress';
  return (
    <NoirCard accent className="gap-3">
      <Overline>{live ? 'Fecha en curso' : 'Fecha configurada'}</Overline>
      <Title>
        Torneo {gameDate.tournament.number} · Fecha {gameDate.dateNumber}
      </Title>
      <Muted>
        {shortDate(gameDate.scheduledDate)} · {gameDate.playersCount} participantes
      </Muted>
      <NoirButton
        title={live ? 'Ver fecha' : 'Confirmar e iniciar'}
        onPress={() => router.push({ pathname: '/game-dates/[id]/confirm', params: { id: String(gameDate.id) } })}
      />
      {live ? (
        <View className="flex-row gap-3">
          <NoirButton title="Registro" variant="outline" className="flex-1" onPress={() => router.push('/registro')} />
          <NoirButton
            title="Jugadores"
            variant="outline"
            className="flex-1"
            onPress={() => router.push({ pathname: '/game-dates/[id]/manage-players', params: { id: String(gameDate.id) } })}
          />
        </View>
      ) : null}
    </NoirCard>
  );
}

function BlockedCard({ data, onChanged }: { data: AvailableDatesResponse; onChanged: () => void }) {
  const refresh = useAdminRefresh();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blocked = data.blockedDate;

  const remove = async () => {
    if (!blocked) return;
    const ok = await confirmAction(`Eliminar la fecha ${blocked.dateNumber}`, 'Esta acción no se puede deshacer.', 'Eliminar');
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/game-dates/${blocked.id}`, { method: 'DELETE' });
      refresh.tournaments();
      onChanged();
    } catch (e) {
      setError(errorMessage(e, 'Error al eliminar la fecha'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <NoirCard className="gap-3">
      <Overline className="text-noir-danger">Bloqueado</Overline>
      <Muted>{data.blockedReason ?? 'No se pueden crear fechas en este momento.'}</Muted>
      <FormError message={error} />
      {blocked ? (
        <NoirButton
          title={`Abrir fecha ${blocked.dateNumber}`}
          variant="outline"
          onPress={() => router.push({ pathname: '/game-dates/[id]/confirm', params: { id: String(blocked.id) } })}
        />
      ) : null}
      {blocked?.status === 'CREATED' ? (
        <NoirButton title={`Eliminar fecha ${blocked.dateNumber}`} variant="ghost" loading={busy} onPress={remove} />
      ) : null}
    </NoirCard>
  );
}

function ActivateForm({ data }: { data: AvailableDatesResponse }) {
  const refresh = useAdminRefresh();
  const tournament = data.tournament!;
  const guestsSwr = useSWR<AvailableGuestsResponse>(adminKeys.availableGuests());
  const guests = guestsSwr.data?.externalGuests ?? [];

  const missing = data.missingDate ?? null;
  const [dateId, setDateId] = useState<number | null>(missing ? null : (data.availableDates[0]?.id ?? null));
  const selectedDate = data.availableDates.find((d) => d.id === dateId) ?? null;
  const [scheduled, setScheduled] = useState<string>(
    () => selectedDate?.scheduledDate ?? formatDateForInput(getNextTuesday())
  );
  const [tab, setTab] = useState<'enfermos' | 'invitados'>('enfermos');
  const [players, setPlayers] = useState<string[]>(data.registeredPlayers.map((p) => p.id));
  const [guestIds, setGuestIds] = useState<string[]>([]);
  const [busy, setBusy] = useState<'activate' | 'date' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dateNumber = missing ?? selectedDate?.dateNumber ?? null;
  const dateChanged = !!selectedDate && scheduled !== selectedDate.scheduledDate;

  if (!missing && data.availableDates.length === 0) {
    return (
      <NoirCard className="gap-2">
        <Overline>Torneo {tournament.number}</Overline>
        <Muted>No quedan fechas pendientes. Si el torneo terminó, finalizalo desde Torneos.</Muted>
        <NoirButton
          title={`Ir al Torneo ${tournament.number}`}
          variant="outline"
          onPress={() => router.push({ pathname: '/tournaments/[id]', params: { id: String(tournament.id) } })}
        />
      </NoirCard>
    );
  }

  const saveDate = async () => {
    if (!selectedDate) return;
    setBusy('date');
    setError(null);
    try {
      await apiFetch(`/api/tournaments/${tournament.id}`, {
        method: 'PUT',
        json: { gameDates: [{ id: selectedDate.id, dateNumber: selectedDate.dateNumber, scheduledDate: scheduled }] },
      });
      refresh.tournaments(tournament.id);
    } catch (e) {
      setError(errorMessage(e, 'Error al cambiar el día'));
    } finally {
      setBusy(null);
    }
  };

  const activate = async () => {
    if (!dateNumber) return;
    if (players.length === 0) return setError('Elegí al menos un Enfermo.');
    if (dateChanged) return setError('Guardá primero el nuevo día de la fecha.');
    const all = [...new Set([...players, ...guestIds])];
    const ok = await confirmAction(
      `Activar la fecha ${dateNumber}`,
      `${players.length} Enfermos y ${guestIds.length} invitados (${all.length} en total) el ${shortDate(scheduled)}. Después se confirma e inicia.`,
      'Activar',
      false
    );
    if (!ok) return;
    setBusy('activate');
    setError(null);
    try {
      const r = await apiFetch<{ gameDate: { id: number } }>('/api/game-dates', {
        method: 'POST',
        json: { tournamentId: tournament.id, dateNumber, scheduledDate: scheduled, playerIds: all },
      });
      refresh.gameDate(tournament.id, r.gameDate.id);
      router.push({ pathname: '/game-dates/[id]/confirm', params: { id: String(r.gameDate.id) } });
    } catch (e) {
      setError(errorMessage(e, 'Error al activar la fecha'));
    } finally {
      setBusy(null);
    }
  };

  const members: AdminPlayer[] = [...data.registeredPlayers, ...data.additionalPlayers];
  const registeredIds = new Set(data.registeredPlayers.map((p) => p.id));

  return (
    <View className="gap-4">
      <NoirCard accent className="gap-3 p-4">
        <Overline>Torneo {tournament.number}</Overline>
        {missing ? (
          <Notice>La fecha {missing} fue eliminada y hay que volver a crearla.</Notice>
        ) : (
          <OptionPicker
            label="Fecha"
            value={dateId}
            options={data.availableDates.map((d) => ({
              value: d.id,
              label: `Fecha ${d.dateNumber} · ${shortDate(d.scheduledDate)}`,
              hint: d.status !== 'pending' ? statusLabel[d.status as keyof typeof statusLabel] : undefined,
            }))}
            onChange={(id) => {
              setDateId(id);
              const d = data.availableDates.find((x) => x.id === id);
              if (d) setScheduled(d.scheduledDate);
              setPlayers(data.registeredPlayers.map((p) => p.id));
              setGuestIds([]);
            }}
          />
        )}
        <DateStepper value={scheduled} onChange={setScheduled} label={`Fecha ${dateNumber ?? ''}`} />
        {dateChanged ? (
          <View className="flex-row gap-3">
            <NoirButton title="Deshacer" variant="ghost" className="flex-1" onPress={() => setScheduled(selectedDate!.scheduledDate)} />
            <NoirButton title="Guardar día" variant="outline" className="flex-1" loading={busy === 'date'} onPress={saveDate} />
          </View>
        ) : null}
        {missing ? (
          <Muted className="text-xs">Se propone el próximo martes; ajustalo de a una semana.</Muted>
        ) : null}
      </NoirCard>

      <Segmented
        options={[
          { id: 'enfermos', label: `Enfermos ${players.length}/${members.length}` },
          { id: 'invitados', label: `Invitados ${guestIds.length}` },
        ]}
        value={tab}
        onChange={setTab}
      />

      <NoirCard className="gap-3 p-4">
        {tab === 'enfermos' ? (
          <PlayerPicker
            players={members}
            selected={players}
            onChange={setPlayers}
            detail={(p) => (registeredIds.has(p.id) ? undefined : 'fuera del torneo')}
          />
        ) : (
          <>
            <PlayerPicker
              players={guests}
              selected={guestIds}
              onChange={setGuestIds}
              accent="#EC4899"
              detail={(p) => (p.inviter ? `de ${fullName(p.inviter)}` : undefined)}
              emptyMessage={guestsSwr.isLoading ? 'Cargando invitados…' : 'No hay invitados cargados.'}
              showBulk={false}
            />
            <NoirButton
              title="Crear invitado"
              variant="ghost"
              onPress={() => router.push({ pathname: '/players/new', params: { type: 'invitado' } })}
            />
          </>
        )}
      </NoirCard>

      <FormError message={error} />
      <NoirButton
        title={missing ? `Crear fecha ${missing}` : `Activar fecha ${dateNumber ?? ''}`}
        size="lg"
        loading={busy === 'activate'}
        disabled={!!busy || players.length === 0 || !dateNumber}
        onPress={activate}
      />
      <Text className="text-center font-inter text-xs text-noir-muted">
        Activar deja la fecha configurada. El timer arranca recién al iniciarla.
      </Text>
    </View>
  );
}
