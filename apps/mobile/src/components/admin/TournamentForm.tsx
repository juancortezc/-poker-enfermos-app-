/**
 * Formulario de torneo (crear y editar). Paridad con TournamentForm y el
 * asistente CPCrearTorneoTab de la web: participantes, calendario de martes
 * cada 15 días (cambiar una fecha recalcula las siguientes) y blinds.
 *
 * Al crear se elige además cuántas fechas (10-15) y cuántas descarta el
 * ELIMINA (2-3), como en el paso Config de la web. Al editar rigen las reglas
 * de @poker/shared/tournament-edit (la API las vuelve a aplicar): las fechas
 * en curso, jugadas o canceladas quedan fijas; las pendientes se mueven,
 * agregan al final o quitan (10 a 15). Se inscribe tarde, pero no se quita a
 * quien ya jugó. Con el torneo finalizado solo se guardan los blinds.
 */
import {
  MAX_TOURNAMENT_DATES,
  MIN_TOURNAMENT_DATES,
  calendarDay,
  defaultBlindLevels,
  fullName,
  generateTournamentDates,
  getEcuadorTodayString,
  isGameDateEditable,
  nextCalendarDay,
  parseToUTCNoon,
  planCalendarEdit,
  planParticipantsEdit,
  playedDatesByPlayer,
  rescheduleFrom,
  validateTournamentForm,
  type BlindLevel,
} from '@poker/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Segmented } from '@/components/jugador/Segmented';
import { CPButton } from '@/components/ui/CPButton';
import { CPCard } from '@/components/ui/CPCard';
import { Muted, Overline } from '@/components/ui/Typography';
import { apiFetch } from '@/lib/api';
import { useCP } from '@/theme/tone';

import { errorMessage, statusLabel, useAdminRefresh, type AdminPlayer, type GameDateStatus, type TournamentDetail } from './api';
import { BlindLevelsEditor } from './BlindLevelsEditor';
import { DateStepper } from './DateStepper';
import { FormError, Notice, Pill } from './Form';
import { PlayerPicker } from './PlayerPicker';

type DateRow = { key: string; id?: number; dateNumber: number; scheduledDate: string; status?: GameDateStatus };
type Tab = 'participantes' | 'fechas' | 'blinds';

type Props =
  | { mode: 'create'; number: number; members: AdminPlayer[] }
  | { mode: 'edit'; tournament: TournamentDetail; members: AdminPlayer[] };

const isLocked = (d: DateRow) => !isGameDateEditable(d.status ?? 'pending');
const withKeys = (dates: { dateNumber: number; scheduledDate: string }[]): DateRow[] =>
  dates.map((d) => ({ ...d, key: `n-${d.dateNumber}` }));

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
      ? editing.gameDates.map((d) => ({
          key: `id-${d.id}`,
          id: d.id,
          dateNumber: d.dateNumber,
          scheduledDate: calendarDay(d.scheduledDate),
          status: d.status,
        }))
      : withKeys(generateTournamentDates(undefined, 12))
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
  const finished = editing?.status === 'FINALIZADO';
  const currentIds = editing ? editing.tournamentParticipants.map((tp) => tp.player.id) : [];
  const played = editing ? playedDatesByPlayer(editing.gameDates) : {};
  // Quien ya jugó y sigue inscrito no se puede destildar.
  const fixedIds = new Set(currentIds.filter((id) => (played[id]?.length ?? 0) > 0 && participantIds.includes(id)));
  const participantsPlan = editing
    ? planParticipantsEdit({
        current: currentIds,
        next: participantIds,
        played,
        players: pickable.map((p) => ({ id: p.id, name: fullName(p), role: p.role, isActive: p.isActive !== false })),
      })
    : null;
  const calendarPlan = editing
    ? planCalendarEdit(editing.gameDates, dates.map((d) => ({ id: d.id, scheduledDate: d.scheduledDate })))
    : null;
  const editProblem = finished
    ? null
    : (participantsPlan && !participantsPlan.ok && participantsPlan.error.message) ||
      (calendarPlan && !calendarPlan.ok && calendarPlan.error.message) ||
      null;

  const validation = validateTournamentForm({ tournamentNumber: number, gameDates: dates, participantIds, blindLevels: blinds });
  const today = getEcuadorTodayString();
  const pastDates = dates.filter((d) => !isLocked(d) && d.scheduledDate < today);

  const changeTotal = (n: number) => {
    if (n < 10 || n > 15) return;
    setTotalDates(n);
    setDates(withKeys(generateTournamentDates(parseToUTCNoon(dates[0]?.scheduledDate ?? today), n)));
  };

  const save = async () => {
    setError(null);
    if (participantIds.length === 0) return setError('Elegí al menos un participante.');
    if (!validation.isValid) return setError(validation.errors[0]?.message ?? 'Revisá los blinds.');
    if (editProblem) return setError(editProblem);
    if (!editing && dates.length !== totalDates) return setError(`Debe programar las ${totalDates} fechas.`);

    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/tournaments/${editing.id}`, {
          method: 'PUT',
          // Finalizado: solo blinds (jugadores y calendario quedan como están).
          json: finished
            ? { blindLevels: blinds }
            : {
                calendar: dates.map((d) => ({ id: d.id ?? null, scheduledDate: d.scheduledDate })),
                ...(participantsPlan?.ok && participantsPlan.value.changed ? { participantIds } : {}),
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
        <CPCard className="gap-3 p-4">
          <Overline>Participantes del torneo</Overline>
          {editing && !finished ? <Muted className="text-xs">Se puede inscribir tarde. Quien ya jugó una fecha no se quita.</Muted> : null}
          <PlayerPicker
            players={pickable}
            selected={participantIds}
            onChange={setParticipantIds}
            disabledIds={finished ? new Set(pickable.map((p) => p.id)) : fixedIds}
            detail={(p) => {
              const n = played[p.id];
              if (n?.length && currentIds.includes(p.id)) return n.length === 1 ? `Jugó la fecha ${n[0]}` : `Jugó ${n.length} fechas`;
              if (editing && participantIds.includes(p.id) && !currentIds.includes(p.id)) return 'Se inscribe al guardar';
              if (editing && !participantIds.includes(p.id) && currentIds.includes(p.id)) return 'Sale al guardar';
              return undefined;
            }}
          />
          {participantIds.length > 24 ? <Notice tone="danger">Máximo 24 participantes por torneo.</Notice> : null}
        </CPCard>
      ) : null}

      {tab === 'fechas' ? (
        <View className="gap-3">
          {!editing ? (
            <CPCard className="gap-3 p-4">
              <Overline>Formato</Overline>
              <Counter label="Fechas del torneo" value={totalDates} min={10} max={15} onChange={changeTotal} />
              <Counter label="Peores fechas que descarta" value={datesToEliminate} min={2} max={3} onChange={setDatesToEliminate} />
            </CPCard>
          ) : null}
          <Muted className="text-xs">Martes cada 15 días. Cambiar una fecha recalcula las siguientes.</Muted>
          {pastDates.length > 0 ? (
            <Notice>
              {pastDates.length === 1 ? `La fecha ${pastDates[0].dateNumber} quedó` : `${pastDates.length} fechas quedaron`} en el pasado.
            </Notice>
          ) : null}
          {finished ? <Notice>El torneo terminó: el calendario queda como está.</Notice> : null}
          {dates.map((d, i) => {
            const locked = finished || isLocked(d);
            const canRemove = !!editing && !locked && dates.length > MIN_TOURNAMENT_DATES;
            return (
              <CPCard key={d.key} className="gap-2 p-3">
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="font-display text-sm text-cp-primary-light">Fecha {i + 1}</Text>
                  <View className="flex-row items-center gap-2">
                    {editing && !d.id ? <Pill label="Nueva" tone="ok" /> : null}
                    {d.status && d.status !== 'pending' ? <Pill label={statusLabel[d.status]} tone={locked ? 'ok' : 'muted'} /> : null}
                    {canRemove ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Quitar la fecha ${i + 1}`}
                        hitSlop={8}
                        onPress={() => setDates(dates.filter((_, j) => j !== i).map((row, j) => ({ ...row, dateNumber: j + 1 })))}
                        className="min-h-[44px] justify-center px-2 active:opacity-70">
                        <Text className="font-inter-semibold text-xs uppercase tracking-[1px] text-cp-negative">Quitar</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
                <DateStepper
                  value={d.scheduledDate}
                  label={`Fecha ${i + 1}`}
                  compact
                  disabled={locked}
                  onChange={(v) => setDates(rescheduleFrom(dates, i, v).map((row, j) => (j > i && isLocked(row) ? dates[j] : row)))}
                />
              </CPCard>
            );
          })}
          {editing && !finished ? (
            <CPButton
              title="Agregar fecha al final"
              variant="outline"
              disabled={dates.length >= MAX_TOURNAMENT_DATES}
              onPress={() =>
                setDates([
                  ...dates,
                  {
                    key: `new-${Date.now()}`,
                    dateNumber: dates.length + 1,
                    scheduledDate: nextCalendarDay(dates.map((d) => d.scheduledDate)),
                    status: 'pending',
                  },
                ])
              }
            />
          ) : null}
          {editing ? (
            <Muted className="text-xs">
              {dates.length} fechas · entre {MIN_TOURNAMENT_DATES} y {MAX_TOURNAMENT_DATES}
            </Muted>
          ) : null}
          {!editing ? (
            <CPButton
              title="Reiniciar calendario"
              variant="ghost"
              onPress={() => setDates(withKeys(generateTournamentDates(undefined, totalDates)))}
            />
          ) : null}
        </View>
      ) : null}

      {tab === 'blinds' ? (
        <CPCard className="p-4">
          <BlindLevelsEditor levels={blinds} onChange={setBlinds} />
        </CPCard>
      ) : null}

      <FormError message={error ?? editProblem} />
      <CPButton
        title={editing ? 'Guardar cambios' : `Crear torneo ${number}`}
        size="lg"
        loading={saving}
        disabled={!validation.isValid || participantIds.length === 0 || !!editProblem}
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
      <Text className="flex-1 font-inter text-base text-cp-on-surface">{label}</Text>
      <View className="flex-row items-center gap-1">
        <CounterButton label={`${label}: menos`} text="−" disabled={value <= min} onPress={() => onChange(value - 1)} />
        <Text className="w-10 text-center font-display text-xl text-cp-on-surface">{value}</Text>
        <CounterButton label={`${label}: más`} text="+" disabled={value >= max} onPress={() => onChange(value + 1)} />
      </View>
    </View>
  );
}

function CounterButton({ label, text, disabled, onPress }: { label: string; text: string; disabled: boolean; onPress: () => void }) {
  const c = useCP();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{ borderColor: c.surfaceBorder }}
      className={`h-11 w-11 items-center justify-center rounded-full border bg-cp-surface-2 ${disabled ? 'opacity-40' : 'active:opacity-70'}`}>
      <Text className="font-inter-bold text-xl text-cp-on-surface">{text}</Text>
    </Pressable>
  );
}
