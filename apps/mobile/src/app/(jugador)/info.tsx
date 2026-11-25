/**
 * Reglamento e info (web: /info con pestañas Calendario · Reglamento · Podcast).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Segmented } from '@/components/jugador/Segmented';
import { CPButton } from '@/components/ui/CPButton';
import { CPCard } from '@/components/ui/CPCard';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { Body, Muted, Overline, Title } from '@/components/ui/Typography';
import { useActiveTournament } from '@/hooks/useActiveTournament';
import { useRefresh } from '@/hooks/useRefresh';
import { useTournamentDates } from '@/hooks/useTournamentDates';
import { cpLight as c } from '@/theme/colors';

type Tab = 'calendario' | 'reglamento' | 'podcast';

const REGLAMENTO: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; items: string[] }[] = [
  {
    icon: 'trophy-outline',
    title: 'Sistema de Puntos',
    items: [
      'Los puntos se calculan en base a la cantidad de jugadores de la fecha',
      '1 punto para el primer eliminado, incrementando en 1 hasta la posicion 10',
      'Posicion 9: 2 puntos mas que la 10',
      'Posiciones 8 a 4: incrementan en 1 punto',
      'Posicion 3: 3 puntos mas que posicion 4',
      'Posicion 2: 3 puntos mas que posicion 3',
      'Ganador: 3 puntos mas que posicion 2',
    ],
  },
  {
    icon: 'time-outline',
    title: 'Horarios',
    items: [
      'Hora de inicio: 19h20',
      'La comida se calcula al final del blind 400/800',
      'Registro para participar cierra el domingo anterior a las 20h00',
    ],
  },
  {
    icon: 'cash-outline',
    title: 'Multas',
    items: [
      '1000 fichas por cada blind en el cual el jugador no participe por ausencia',
      'Valor del small blind durante cada mesa que el jugador este ausente',
      '5 puntos al puntaje general por no pagar la fecha hasta las 19h20',
    ],
  },
  {
    icon: 'warning-outline',
    title: 'Conducta',
    items: [
      'Si se enseña las cartas a 1 jugador, todos deben poder verlas al final de la mesa',
      'Cuando un jugador declara all in, la mesa no puede hablar, excepto quien tiene que aceptar o pasar la apuesta',
      'Lo declarado manda sobre la cantidad de fichas movidas',
      'Si no se declara la apuesta, las fichas determinan el valor - no se puede cambiar declarando posteriormente',
      'Las cartas colocadas despues de la linea blanca se consideran fold',
      'Si un jugador solo enseña una carta, solo juega con esa carta y 4 de la mesa - no se acepta abrir las cartas de manera individual',
    ],
  },
];

export default function InfoScreen() {
  const [tab, setTab] = useState<Tab>('calendario');
  const active = useActiveTournament();
  const datesSwr = useTournamentDates(active.tournament?.id);
  const { refreshing, onRefresh } = useRefresh(active.mutate, datesSwr.mutate);

  return (
    <>
      <Stack.Screen options={{ title: 'Info' }} />
      <Screen tone="light" refreshing={refreshing} onRefresh={onRefresh}>
        <Segmented
          options={[
            { id: 'calendario', label: 'Calendario' },
            { id: 'reglamento', label: 'Reglamento' },
            { id: 'podcast', label: 'Podcast' },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'calendario' ? <CalendarioGrid active={active} dates={datesSwr} /> : null}
        {tab === 'reglamento' ? <Reglamento /> : null}
        {tab === 'podcast' ? (
          <CPCard className="items-center gap-3">
            <Ionicons name="mic-outline" size={36} color={c.primaryLight} />
            <Title className="text-xl">Poker de enfermos</Title>
            <Muted className="text-center">El podcast oficial del grupo.</Muted>
            <CPButton title="Ir al podcast" onPress={() => router.navigate('/podcast')} />
          </CPCard>
        ) : null}
      </Screen>
    </>
  );
}

function CalendarioGrid({
  active,
  dates,
}: {
  active: ReturnType<typeof useActiveTournament>;
  dates: ReturnType<typeof useTournamentDates>;
}) {
  if (active.isLoading || (active.tournament && !dates.dates && !dates.error)) return <LoadingState message="Cargando calendario…" />;
  if (!active.tournament) return <EmptyState icon="calendar-outline" message="No hay torneo activo." />;
  if (dates.error) return <ErrorState error={dates.error} onRetry={() => dates.mutate()} />;
  const list = dates.dates ?? [];
  const nextIndex = list.findIndex((d) => d.status !== 'completed');

  return (
    <View className="gap-3">
      <CPCard className="items-center gap-1 py-4">
        <Overline>Torneo</Overline>
        <Title className="text-3xl">#{active.tournament.number}</Title>
      </CPCard>
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {list.map((d, i) => {
          const date = new Date(`${d.scheduledDate.split('T')[0]}T12:00:00`);
          const done = d.status === 'completed';
          const isNext = i === nextIndex;
          return (
            <View
              key={d.id}
              style={{
                width: '31.5%',
                borderWidth: done || isNext ? 2 : 1,
                borderColor: isNext ? c.primary : done ? `${c.onSurfaceMuted}66` : c.surfaceBorder,
                backgroundColor: isNext ? 'rgba(229,57,53,0.08)' : c.surface1,
              }}
              className="items-center rounded-cp py-3">
              <Text style={{ color: isNext ? c.primaryLight : c.onSurfaceMuted }} className="font-inter-semibold text-xs">
                Fecha {d.dateNumber}
              </Text>
              <Text className="font-display text-2xl text-cp-on-surface">{date.getDate()}</Text>
              <Text className="font-inter-semibold text-sm uppercase text-cp-on-surface-muted">
                {date.toLocaleDateString('es-ES', { month: 'short' })}
              </Text>
            </View>
          );
        })}
      </View>
      <CPButton title="Ver calendario completo" variant="outline" onPress={() => router.push('/calendario')} />
    </View>
  );
}

function Reglamento() {
  return (
    <View className="gap-3">
      <CPCard className="items-center gap-1">
        <Ionicons name="book-outline" size={36} color={c.info} />
        <Title className="text-xl">Reglamento Oficial</Title>
        <Muted>Poker Enfermos - Torneo Semanal</Muted>
      </CPCard>
      {REGLAMENTO.map((s) => (
        <CPCard key={s.title} className="gap-3 p-0">
          <View className="flex-row items-center gap-3 border-b border-cp-surface-border px-4 py-3">
            <Ionicons name={s.icon} size={20} color={c.info} />
            <Body className="font-inter-semibold text-base">{s.title}</Body>
          </View>
          <View className="gap-2 px-4 pb-4">
            {s.items.map((item) => (
              <View key={item} className="flex-row items-start gap-2">
                <View className="mt-2 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.primary }} />
                <Muted className="flex-1 text-sm">{item}</Muted>
              </View>
            ))}
          </View>
        </CPCard>
      ))}
    </View>
  );
}
