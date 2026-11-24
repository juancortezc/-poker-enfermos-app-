/**
 * Formulario de torneo (crear y editar). Paridad con TournamentForm y el
 * asistente CPCrearTorneoTab de la web: participantes, calendario de martes
 * cada 15 días (cambiar una fecha recalcula las siguientes) y blinds.
 *
 * Al crear se elige además cuántas fechas (10-15) y cuántas descarta el
 * ELIMINA (2-3), como en el paso Config de la web. Al editar, las fechas ya
 * jugadas o en curso quedan fijas: la API las reescribiría sin preguntar.
 */
import {
  defaultBlindLevels,
  generateTournamentDates,
  getEcuadorTodayString,
  parseToUTCNoon,
  rescheduleFrom,
  validateTournamentForm,
  type BlindLevel,
} from '@poker/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Segmented } from '@/components/jugador/Segmented';
import { NoirButton } from '@/components/ui/NoirButton';
import { NoirCard } from '@/components/ui/NoirCard';
import { Muted, Overline } from '@/components/ui/Typography';
import { apiFetch } from '@/lib/api';
import { noir } from '@/theme/colors';

import { errorMessage, statusLabel, useAdminRefresh, type AdminPlayer, type GameDateStatus, type TournamentDetail } from './api';
import { BlindLevelsEditor } from './BlindLevelsEditor';
import { DateStepper } from './DateStepper';
import { FormError, Notice, Pill } from './Form';
import { PlayerPicker } from './PlayerPicker';

type DateRow = { id?: number; dateNumber: number; scheduledDate: string; status?: GameDateStatus };
type Tab = 'participantes' | 'fechas' | 'blinds';

type Props =
  | { mode: 'create'; number: number; members: AdminPlayer[] }
  | { mode: 'edit'; tournament: TournamentDetail; members: AdminPlayer[] };

const LOCKED: GameDateStatus[] = ['completed', 'in_progress', 'CREATED'];

export function TournamentForm(props: Props) {
  const refresh = useAdminRefresh();
  const editing = props.mode === 'edit' ? props.tournament : null;
  const number = editing ? editing.number : props.mode === 'create' ? props.number : 0;

  const [tab, setTab] = useState<Tab>('participantes');
  const [participantIds, setParticipantIds] = useState<string[]>(() =>
    editing ? editing.tournamentParticipants.map((tp) => tp.player.id) : props.members.map((p) => p.id)
  );
  const [totalDates, setTotalDates] = useState(editing?.totalDates ?? 12);
  const [datesToEliminate, setDatesToEliminate] = useState(editing?.datesToEliminate ?? 2);
  const [dates, setDates] = useState<DateRow[]>(() =>
    editing
      ? editing.gameDates.map((d) => ({ id: d.id, dateNumber: d.dateNumber, scheduledDate: d.scheduledDate.split('T')[0], status: d.status }))
      : generateTournamentDates(undefined, 12)
  );
  const [blinds, setBlinds] = useState<BlindLevel[]>(() =>
    editing && editing.blindLevels.length > 0
      ? editing.blindLevels.map(({ level, smallBlind, bigBlind, duration }) => ({ level, smallBlind, bigBlind, duration }))
      : defaultBlindLevels()
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Torneos con participantes que ya no están activos: se muestran igual para
  // no perderlos al guardar.
  const extra: AdminPlayer[] = editing
    ? editing.tournamentParticipants.map((tp) => tp.player).filter((p) => !props.members.some((m) => m.id === p.id))
    : [];
  const pickable = [...props.members, ...extra];

  const validation = validateTournamentForm({ tournamentNumber: number, gameDates: dates, participantIds, blindLevels: blinds });
  const today = getEcuadorTodayString();
  const pastDates = dates.filter((d) => !LOCKED.includes(d.status ?? 'pending') && d.scheduledDate < today);

  const changeTotal = (n: number) => {
    if (n < 10 || n > 15) return;
    setTotalDates(n);
    setDates(generateTournamentDates(parseToUTCNoon(dates[0]?.scheduledDate ?? today), n));
  };

  const save = async () => {
    setError(null);
    if (participantIds.length === 0) return setError('Elegí al menos un participante.');
    if (!validation.isValid) return setError(validation.errors[0]?.message ?? 'Revisá los blinds.');
    if (!editing && dates.length !== totalDates) return setError(`Debe programar las ${totalDates} fechas.`);

    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/tournaments/${editing.id}`, {
          method: 'PUT',
          json: {
            gameDates: dates
              .filter((d) => !LOCKED.includes(d.status ?? 'pending'))
              .map((d) => ({ id: d.id, dateNumber: d.dateNumber, scheduledDate: d.scheduledDate })),
            participantIds,
            blindLevels: blinds,
          },
        });
        refresh.tournaments(editing.id);
        router.back();
      } else {
        const created = await apiFetch<{ id: number }>('/api/tournaments', {
          method: 'POST',
          json: {
            number,
            gameDates: dates.map((d) => ({ dateNumber: d.dateNumber, scheduledDate: d.scheduledDate })),
            participantIds,
            blindLevels: blinds,
            totalDates,
            datesToEliminate,
          },
        });
        refresh.tournaments(created.id);
        router.dismissTo('/tournaments');
      }
    } catch (e) {
      setError(errorMessage(e, 'Error al guardar el torneo'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="gap-4">
      <Segmented
        options={[
          { id: 'participantes', label: `Jugadores ${participantIds.length}` },
          { id: 'fechas', label: `Fechas ${dates.length}` },
          { id: 'blinds', label: `Blinds ${blinds.length}` },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'participantes' ? (
        <NoirCard className="gap-3 p-4">
          <Overline>Participantes del torneo</Overline>
          <PlayerPicker players={pickable} selected={participantIds} onChange={setParticipantIds} />
          {participantIds.length > 24 ? <Notice tone="danger">Máximo 24 participantes por torneo.</Notice> : null}
        </NoirCard>
      ) : null}

      {tab === 'fechas' ? (
        <View className="gap-3">
          {!editing ? (
            <NoirCard className="gap-3 p-4">
              <Overline>Formato</Overline>
              <Counter label="Fechas del torneo" value={totalDates} min={10} max={15} onChange={changeTotal} />
              <Counter label="Peores fechas que descarta" value={datesToEliminate} min={2} max={3} onChange={setDatesToEliminate} />
            </NoirCard>
          ) : null}
          <Muted className="text-xs">Martes cada 15 días. Cambiar una fecha recalcula las siguientes.</Muted>
          {pastDates.length > 0 ? (
            <Notice>
              {pastDates.length === 1 ? `La fecha ${pastDates[0].dateNumber} quedó` : `${pastDates.length} fechas quedaron`} en el pasado.
            </Notice>
          ) : null}
          {dates.map((d, i) => {
            const locked = LOCKED.includes(d.status ?? 'pending');
            return (
              <NoirCard key={d.dateNumber} className="gap-2 p-3">
                <View className="flex-row items-center justify-between">
                  <Text className="font-cinzel-bold text-sm text-noir-gold">Fecha {d.dateNumber}</Text>
                  {d.status && d.status !== 'pending' ? <Pill label={statusLabel[d.status]} tone={locked ? 'ok' : 'muted'} /> : null}
                </View>
                <DateStepper
                  value={d.scheduledDate}
                  label={`Fecha ${d.dateNumber}`}
                  compact
                  disabled={locked}
                  onChange={(v) => setDates(rescheduleFrom(dates, i, v).map((row, j) => (j > i && LOCKED.includes(row.status ?? 'pending') ? dates[j] : row)))}
                />
              </NoirCard>
            );
          })}
          {!editing ? (
            <NoirButton
              title="Reiniciar calendario"
              variant="ghost"
              onPress={() => setDates(generateTournamentDates(undefined, totalDates))}
            />
          ) : null}
        </View>
      ) : null}

      {tab === 'blinds' ? (
        <NoirCard className="p-4">
          <BlindLevelsEditor levels={blinds} onChange={setBlinds} />
        </NoirCard>
      ) : null}

      <FormError message={error} />
      <NoirButton
        title={editing ? 'Guardar cambios' : `Crear torneo ${number}`}
        size="lg"
        loading={saving}
        disabled={!validation.isValid || participantIds.length === 0}
        onPress={save}
      />
    </View>
  );
}

function Counter({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="flex-1 font-inter text-base text-noir-text">{label}</Text>
      <View className="flex-row items-center gap-1">
        <CounterButton label={`${label}: menos`} text="−" disabled={value <= min} onPress={() => onChange(value - 1)} />
        <Text className="w-10 text-center font-cinzel-bold text-xl text-noir-gold">{value}</Text>
        <CounterButton label={`${label}: más`} text="+" disabled={value >= max} onPress={() => onChange(value + 1)} />
      </View>
    </View>
  );
}

function CounterButton({ label, text, disabled, onPress }: { label: string; text: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{ borderColor: noir.border }}
      className={`h-11 w-11 items-center justify-center rounded-full border bg-noir-raised ${disabled ? 'opacity-40' : 'active:opacity-70'}`}>
      <Text className="font-inter-bold text-xl text-noir-gold">{text}</Text>
    </Pressable>
  );
}
