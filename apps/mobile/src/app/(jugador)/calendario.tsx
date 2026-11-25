/**
 * Calendario del torneo (web: /calendario): próxima fecha, avance de la
 * temporada, línea de tiempo con ganadores, tu puesto y cumpleaños, y
 * "Agregar a tu calendario". La web descarga un .ics; aquí el mismo .ics
 * (armado en @poker/shared) se abre con la hoja de compartir, desde donde se
 * importa en Calendario de iOS, Google Calendar, etc.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { buildSeasonIcs, isBirthdayNearDate } from '@poker/shared';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Score, StatRow } from '@/components/jugador/Bits';
import { FechaTimelineItem } from '@/components/jugador/FechaTimelineItem';
import { CPButton } from '@/components/ui/CPButton';
import { CPCard } from '@/components/ui/CPCard';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { Body, Muted, Overline, Title } from '@/components/ui/Typography';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveTournament } from '@/hooks/useActiveTournament';
import { usePlayers } from '@/hooks/usePlayers';
import { useRefresh } from '@/hooks/useRefresh';
import { useTournamentDates } from '@/hooks/useTournamentDates';
import { daysUntil } from '@/lib/dates';
import { shareTextFile } from '@/lib/share-file';
import { cpLight as c } from '@/theme/colors';

export default function CalendarioScreen() {
  const { user } = useAuth();
  const active = useActiveTournament();
  const tournament = active.tournament;
  const datesSwr = useTournamentDates(tournament?.id);
  const playersSwr = usePlayers();
  const { refreshing, onRefresh } = useRefresh(active.mutate, datesSwr.mutate, playersSwr.mutate);
  const [sharing, setSharing] = useState(false);

  const number = tournament?.number ?? 0;
  const dates = datesSwr.dates ?? [];
  const nextDate = active.nextDate;
  const completed = dates.filter((d) => d.status === 'completed').length;
  const total = tournament?.totalDates ?? dates.length;
  const remaining = Math.max(0, total - completed);
  const progress = total > 0 ? completed / total : 0;
  const nextDays = daysUntil(nextDate?.scheduledDate);
  const future = dates.filter((d) => d.status === 'pending' || d.status === 'CREATED');

  const birthdayFor = (scheduledDate: string): string | null => {
    const match = playersSwr.players?.find((p) => isBirthdayNearDate(p.birthDate, new Date(scheduledDate)));
    return match ? `${match.firstName} ${match.lastName}` : null;
  };

  const shareIcs = async () => {
    if (future.length === 0) return;
    setSharing(true);
    try {
      const ics = buildSeasonIcs(
        future.map((d) => ({ uid: `gamedate-${d.id}`, title: `Poker Enfermos - Fecha ${d.dateNumber}`, start: d.scheduledDate }))
      );
      await shareTextFile(`poker-enfermos-torneo-${number}.ics`, ics, {
        mimeType: 'text/calendar',
        UTI: 'public.calendar-event',
        dialogTitle: `Fechas del Torneo ${number}`,
      });
    } catch (e) {
      Alert.alert('No se pudo compartir', e instanceof Error ? e.message : 'Probá de nuevo.');
    } finally {
      setSharing(false);
    }
  };

  const body = (() => {
    if (active.isLoading || (tournament && !datesSwr.data && !datesSwr.error)) return <LoadingState message="Cargando calendario…" />;
    if (!tournament) return <EmptyState icon="calendar-outline" message="No hay torneo activo." />;
    if (datesSwr.error) return <ErrorState error={datesSwr.error} onRetry={() => datesSwr.mutate()} />;

    return (
      <>
        {nextDate?.scheduledDate ? (
          <CPCard className="gap-1">
            <Overline>Próxima fecha · Fecha {nextDate.dateNumber}</Overline>
            <Title className="text-4xl">
              {new Date(nextDate.scheduledDate).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' }).toUpperCase()}
            </Title>
            <View className="flex-row items-center gap-2">
              <Ionicons name="time-outline" size={15} color={c.primaryLight} />
              <Score value={`FALTAN ${nextDays} ${nextDays === 1 ? 'DÍA' : 'DÍAS'}`} size={13} color={c.primaryLight} />
            </View>
          </CPCard>
        ) : null}

        <CPCard className="gap-3">
          <View className="flex-row items-center gap-2">
            <Ionicons name="trophy-outline" size={15} color={c.gold} />
            <Overline>Temporada</Overline>
          </View>
          <StatRow
            items={[
              { value: completed, label: 'JUGADAS' },
              { value: remaining, label: 'POR JUGAR' },
            ]}
          />
          <View className="h-1.5 overflow-hidden rounded-full bg-cp-surface-3">
            <View style={{ width: `${Math.round(progress * 100)}%`, backgroundColor: c.primary }} className="h-full rounded-full" />
          </View>
          {active.seasonEndDate ? (
            <Muted className="text-xs">
              Final: {new Date(active.seasonEndDate).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Muted>
          ) : null}
        </CPCard>

        {dates.length > 0 ? (
          <View>
            <Overline className="mb-3">Línea de tiempo del torneo</Overline>
            {dates.map((d, i) => (
              <FechaTimelineItem
                key={d.id}
                date={d}
                isNext={nextDate?.id === d.id}
                isLast={i === dates.length - 1}
                currentUserId={user?.id ?? ''}
                birthdayPlayerName={d.status !== 'completed' ? birthdayFor(d.scheduledDate) : null}
              />
            ))}
          </View>
        ) : (
          <EmptyState icon="calendar-outline" message="Todavía no hay fechas programadas." />
        )}

        <CPCard className="gap-3">
          <View className="flex-row items-center gap-3">
            <Ionicons name="calendar-number-outline" size={24} color={c.info} />
            <View className="flex-1">
              <Body className="font-inter-semibold text-base">Agregá las fechas a tu calendario</Body>
              <Muted>No te pierdas ninguna fecha del torneo.</Muted>
            </View>
          </View>
          <CPButton
            title={future.length > 0 ? 'Agregar' : 'No quedan fechas'}
            disabled={future.length === 0}
            loading={sharing}
            onPress={shareIcs}
          />
        </CPCard>
      </>
    );
  })();

  return (
    <>
      <Stack.Screen options={{ title: number ? `Calendario · T${number}` : 'Calendario' }} />
      <Screen tone="light" refreshing={refreshing} onRefresh={onRefresh}>
        {body}
      </Screen>
    </>
  );
}
