/**
 * Editar los participantes de una fecha configurada (CREATED). Paridad con
 * /game-dates/[id]/edit-players y edit-guests de la web, con dos arreglos:
 *
 * - La web saca la lista de jugadores de /available-dates, que con una fecha
 *   CREATED responde "bloqueado" y la deja vacía. Aquí sale del torneo y del
 *   directorio.
 * - edit-guests de la web arranca sin invitados elegidos y los suma a la lista
 *   completa: guardar podía duplicarlos. Aquí cada pantalla edita solo su
 *   mitad y conserva la otra; la lista final va sin repetidos.
 *
 * La API solo acepta cambios con la fecha CREATED; en curso se usa
 * "Gestionar jugadores".
 */
import { fullName } from '@poker/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import useSWR from 'swr';

import { NoirButton } from '@/components/ui/NoirButton';
import { NoirCard } from '@/components/ui/NoirCard';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { Muted, Overline } from '@/components/ui/Typography';
import { apiFetch } from '@/lib/api';

import {
  adminKeys,
  confirmAction,
  errorMessage,
  shortDate,
  statusLabel,
  useAdminRefresh,
  useGameDate,
  useMembers,
  useTournament,
  type AdminPlayer,
  type AvailableGuestsResponse,
} from './api';
import { FormError, Notice } from './Form';
import { PlayerPicker } from './PlayerPicker';

type Props = { gameDateId: number; mode: 'players' | 'guests' };

export function DateParticipantsEditor({ gameDateId, mode }: Props) {
  const gd = useGameDate(gameDateId);
  const gameDate = gd.data?.gameDate ?? null;
  const t = useTournament(gameDate?.tournament.id ?? null);
  const m = useMembers();
  const g = useSWR<AvailableGuestsResponse>(adminKeys.availableGuests());

  const loading = (gd.isLoading && !gd.data) || (m.isLoading && !m.members) || (g.isLoading && !g.data) || (!!gameDate && t.isLoading && !t.data);
  const error = gd.error ?? m.error ?? g.error ?? t.error;

  if (loading) return <LoadingState />;
  if (error || !gameDate) {
    return <ErrorState error={error} onRetry={() => (gd.mutate(), m.mutate(), g.mutate(), t.mutate())} />;
  }

  return (
    <Editor
      key={`${gameDate.id}-${gameDate.playerIds.join(',')}`}
      mode={mode}
      gameDate={gameDate}
      tournamentPlayerIds={new Set((t.data?.tournamentParticipants ?? []).map((tp) => tp.player.id))}
      members={m.members ?? []}
      guests={g.data?.externalGuests ?? []}
      onSaved={() => gd.mutate()}
    />
  );
}

function Editor({
  mode,
  gameDate,
  tournamentPlayerIds,
  members,
  guests,
  onSaved,
}: {
  mode: Props['mode'];
  gameDate: NonNullable<ReturnType<typeof useGameDate>['data']>['gameDate'];
  tournamentPlayerIds: Set<string>;
  members: AdminPlayer[];
  guests: AdminPlayer[];
  onSaved: () => void;
}) {
  const refresh = useAdminRefresh();
  const guestIds = new Set(guests.map((p) => p.id));
  const current = [...new Set(gameDate.playerIds)];
  const currentGuests = current.filter((id) => guestIds.has(id));
  const currentOthers = current.filter((id) => !guestIds.has(id));

  const [selected, setSelected] = useState<string[]>(mode === 'guests' ? currentGuests : currentOthers);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editable = gameDate.status === 'CREATED';
  const registered = members.filter((p) => tournamentPlayerIds.has(p.id));
  const additional = members.filter((p) => !tournamentPlayerIds.has(p.id));
  // Jugadores que están en la fecha pero ya no figuran como activos: se
  // muestran para poder quitarlos.
  const known = new Set([...members, ...guests].map((p) => p.id));
  const orphanIds = current.filter((id) => !known.has(id));

  const finalIds =
    mode === 'guests'
      ? [...new Set([...currentOthers, ...selected])]
      : [...new Set([...selected, ...currentGuests])];
  const enfermosCount = mode === 'guests' ? currentOthers.length : selected.length;
  const changed = finalIds.length !== current.length || finalIds.some((id) => !current.includes(id));

  const save = async () => {
    setError(null);
    if (enfermosCount === 0) return setError('La fecha necesita al menos un jugador del grupo.');
    const ok = await confirmAction(
      'Guardar participantes',
      `La fecha ${gameDate.dateNumber} queda con ${finalIds.length} participantes.`,
      'Guardar',
      false
    );
    if (!ok) return;
    setSaving(true);
    try {
      await apiFetch(`/api/game-dates/${gameDate.id}`, {
        method: 'PUT',
        json: {
          action: 'update',
          playerIds: finalIds,
          guestIds: finalIds.filter((id) => guestIds.has(id)),
        },
      });
      refresh.gameDate(gameDate.tournament.id, gameDate.id);
      onSaved();
      router.back();
    } catch (e) {
      setError(errorMessage(e, 'Error al actualizar participantes'));
    } finally {
      setSaving(false);
    }
  };

  const guestDetail = (p: AdminPlayer) => (p.inviter ? `de ${fullName(p.inviter)}` : undefined);

  return (
    <View className="gap-4">
      <Muted>
        Fecha {gameDate.dateNumber} · {shortDate(gameDate.scheduledDate)} · {statusLabel[gameDate.status]}
      </Muted>
      {!editable ? (
        <Notice tone="danger">
          {gameDate.status === 'in_progress'
            ? 'La fecha ya está en curso: agregá o quitá jugadores desde "Gestionar jugadores".'
            : 'Solo se pueden editar fechas configuradas que todavía no empezaron.'}
        </Notice>
      ) : null}

      {mode === 'players' ? (
        <>
          <NoirCard className="gap-3 p-4">
            <Overline>Jugadores del torneo ({registered.length})</Overline>
            <PlayerPicker players={registered} selected={selected} onChange={setSelected} />
          </NoirCard>
          {additional.length > 0 ? (
            <NoirCard className="gap-3 p-4">
              <Overline>Del grupo, fuera del torneo</Overline>
              <PlayerPicker players={additional} selected={selected} onChange={setSelected} showBulk={false} />
            </NoirCard>
          ) : null}
        </>
      ) : (
        <NoirCard className="gap-3 p-4">
          <Overline>Invitados ({guests.length})</Overline>
          <PlayerPicker
            players={guests}
            selected={selected}
            onChange={setSelected}
            detail={guestDetail}
            accent="#EC4899"
            emptyMessage="No hay invitados cargados. Crealos desde Jugadores."
          />
          <NoirButton
            title="Crear invitado"
            variant="ghost"
            onPress={() => router.push({ pathname: '/players/new', params: { type: 'invitado' } })}
          />
        </NoirCard>
      )}

      {orphanIds.length > 0 ? (
        <Muted className="text-xs">
          {orphanIds.length} participante(s) inactivo(s) siguen en la fecha y se conservan.
        </Muted>
      ) : null}

      <FormError message={error} />
      <NoirButton
        title={`Guardar · ${finalIds.length} participantes`}
        size="lg"
        loading={saving}
        disabled={!editable || !changed}
        onPress={save}
      />
    </View>
  );
}
