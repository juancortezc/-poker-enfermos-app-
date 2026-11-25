/**
 * Días sin ganar. Equivale a SinGanarTab de la web: resumen por tramos, el
 * más cerca del hito de los 1000 días y la lista agrupada por tramo. Los
 * tramos, umbrales y colores son los mismos (la pestaña va siempre en claro,
 * así que los tramos usan las variantes legibles sobre papel).
 * Si el hito de 1000 días cae justo en una fecha del calendario, se marca.
 */
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import useSWR from 'swr';

import { avatarProps, PlayerAvatar } from '@/components/common/PlayerAvatar';
import { EmptyState, ErrorState, LoadingState, Muted, CPCard, Overline } from '@/components/ui';
import { swrKeys } from '@/lib/swr';
import { bento, cp, fonts } from '@/theme/colors';
import { ToneView, useCP } from '@/theme/tone';
import { LinearGradient } from 'expo-linear-gradient';

type PlayerWithVictoryData = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  lastVictoryDate?: string | null;
  daysWithoutVictory: number;
  hasNeverWon: boolean;
};

type Response = { players: PlayerWithVictoryData[] };
type GameDate = { dateNumber: number; scheduledDate: string | null };
type Match = { dateNumber: number };

const TIERS = [
  { key: 'club', min: 1000, label: 'Club 1000', color: cp.malazoDeep },
  { key: 'danger', min: 900, label: 'Zona crítica', color: cp.magenta },
  // #9A3412: el naranja oscuro del tramo en la web; no tiene token propio.
  { key: '2years', min: 730, label: '+ 2 años', color: '#9A3412' },
  { key: '1year', min: 365, label: '+ 1 año', color: cp.negativeOnLight },
  { key: '6months', min: 180, label: '+ 6 meses', color: cp.goldOnLight },
  { key: 'recent', min: 0, label: 'Recientes', color: cp.positiveOnLight },
] as const;
type Tier = (typeof TIERS)[number];

const tierOf = (days: number): Tier => TIERS.find((t) => days >= t.min) ?? TIERS[TIERS.length - 1];
const upperOf = (i: number) => (i > 0 ? TIERS[i - 1].min : Infinity);

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function parseDateStr(value: string): Date | null {
  if (value.includes('-') && value.length === 10) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  if (value.includes('/')) {
    const [d, m, y] = value.split('/').map(Number);
    return new Date(y, m - 1, d);
  }
  return null;
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const formatEs = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

function milestoneOf(last?: string | null): Date | null {
  if (!last) return null;
  const base = parseDateStr(last);
  if (!base) return null;
  const m = new Date(base);
  m.setDate(m.getDate() + 1000);
  return m;
}

function Meter({ value, color }: { value: number; color: string }) {
  return (
    <View className="h-1.5 overflow-hidden rounded-full bg-cp-on-surface/15">
      <View style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, backgroundColor: color, height: '100%' }} />
    </View>
  );
}

function TierChart({ players }: { players: PlayerWithVictoryData[] }) {
  const c = useCP();
  const data = TIERS.map((tier, i) => ({
    value: players.filter((p) => p.daysWithoutVictory >= tier.min && p.daysWithoutVictory < upperOf(i)).length,
    label: tier.label.replace('Zona crítica', 'Crítica').replace('Club 1000', '1000'),
    frontColor: tier.color,
  })).reverse();
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <CPCard className="gap-3">
      <Overline>Jugadores por tramo</Overline>
      <BarChart
        data={data}
        barWidth={30}
        spacing={16}
        initialSpacing={10}
        height={140}
        maxValue={max + 1}
        noOfSections={Math.min(max + 1, 4)}
        barBorderTopLeftRadius={4}
        barBorderTopRightRadius={4}
        showValuesAsTopLabel
        topLabelTextStyle={{ color: c.onSurface, fontFamily: fonts.display, fontSize: 12 }}
        yAxisColor={c.surfaceBorder}
        xAxisColor={c.surfaceBorder}
        rulesColor={c.surfaceBorder}
        yAxisTextStyle={{ color: c.onSurfaceVariant, fontFamily: fonts.body, fontSize: 11 }}
        xAxisLabelTextStyle={{ color: c.onSurfaceVariant, fontFamily: fonts.body, fontSize: 9 }}
        disableScroll
        isAnimated
        animationDuration={220}
      />
    </CPCard>
  );
}

function Hero({ player, milestone, match }: { player: PlayerWithVictoryData; milestone: Date | null; match: Match | null }) {
  const days = player.daysWithoutVictory;
  const past = days >= 1000;
  // Rosa = malazos (el club de los 1000); naranja = lo que resta.
  const accent = past ? cp.malazoText : cp.negative;
  const negro = bento.tile.negro;
  // El bloque "negro" del bento de la web: el ancla oscura sobre el papel.
  return (
    <ToneView
      tone="dark"
      className="gap-3 overflow-hidden rounded-tile p-4"
      style={{
        shadowColor: '#17120F',
        shadowOpacity: 0.28,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 14 },
        elevation: 6,
      }}>
      <LinearGradient
        colors={[negro.from, negro.to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <Text
        aria-hidden
        style={{
          position: 'absolute',
          right: -16,
          top: -34,
          fontFamily: fonts.display,
          fontSize: 150,
          lineHeight: 160,
          color: 'rgba(255,255,255,0.05)',
        }}>
        {days}
      </Text>
      <View className="flex-row items-start gap-4">
        <View className="flex-1 gap-1">
          <Overline style={{ color: accent }}>{past ? 'Miembro del Club 1000' : 'Más cerca del hito'}</Overline>
          <View className="flex-row items-baseline gap-2">
            <Text className="font-display text-5xl text-white" style={{ fontVariant: ['tabular-nums'], letterSpacing: -1.4 }}>
              {days}
            </Text>
            <Muted>días</Muted>
          </View>
          {!past ? <Text style={{ color: accent }} className="font-inter-bold text-sm">Faltan {1000 - days} días</Text> : null}
          {milestone ? (
            <Muted>
              {past ? 'Cumplió el ' : 'Se cumple el '}
              <Text className="font-inter-bold text-white">{formatEs(milestone)}</Text>
            </Muted>
          ) : null}
          {match ? <Text className="font-inter-bold text-xs uppercase tracking-[1px] text-cp-primary-light">Cae en la fecha {match.dateNumber}</Text> : null}
          {player.hasNeverWon ? (
            <Text style={{ color: accent }} className="font-inter-bold text-xs uppercase tracking-[1px]">Nunca ha ganado</Text>
          ) : player.lastVictoryDate ? (
            <Muted className="text-xs">Última victoria: {player.lastVictoryDate}</Muted>
          ) : null}
        </View>
        <View className="items-center">
          <PlayerAvatar {...avatarProps(player)} size={84} ringColor={accent} />
          <Text className="mt-1 font-inter-bold text-sm text-white">{player.firstName}</Text>
          <Muted className="text-xs">{player.lastName}</Muted>
        </View>
      </View>
      <Meter value={days / 1000} color={accent} />
      <Text style={{ color: accent }} className="text-right font-display text-sm">
        {Math.min(100, Math.round((days / 1000) * 100))}% de 1000
      </Text>
    </ToneView>
  );
}

function Row({ player, rank, milestone, match }: { player: PlayerWithVictoryData; rank: number; milestone: Date | null; match: Match | null }) {
  const days = player.daysWithoutVictory;
  const tier = tierOf(days);
  return (
    <View className="flex-row items-center gap-3 rounded-card border border-cp-surface-border bg-cp-surface-1 p-3" style={{ borderLeftColor: tier.color, borderLeftWidth: 3 }}>
      <Text className="w-5 text-center font-inter text-xs text-cp-on-surface-muted">{rank}</Text>
      <PlayerAvatar {...avatarProps(player)} size={52} ringColor={tier.color} />
      <View className="flex-1 gap-1.5">
        <View className="flex-row items-baseline justify-between gap-2">
          <Text numberOfLines={1} className="flex-1 font-inter-bold text-sm text-cp-on-surface">
            {player.firstName} <Text className="font-inter text-cp-on-surface-muted">{player.lastName}</Text>
          </Text>
          <Text style={{ color: tier.color }} className="font-display text-lg">
            {days}
            <Text className="font-inter text-xs text-cp-on-surface-muted"> d</Text>
          </Text>
        </View>
        <Meter value={days / 1000} color={tier.color} />
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          {player.hasNeverWon ? (
            <Text style={{ color: tier.color }} className="font-inter-bold text-[10px] uppercase tracking-[1px]">Nunca ha ganado</Text>
          ) : player.lastVictoryDate ? (
            <Muted className="text-xs">Últ. victoria: {player.lastVictoryDate}</Muted>
          ) : (
            <View />
          )}
          {milestone ? (
            <Muted className="text-xs">
              {match ? <Text className="font-inter-bold text-cp-primary-light">F{match.dateNumber} · </Text> : null}
              {formatEs(milestone)}
            </Muted>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function SinGanarTab({ tournamentId }: { tournamentId?: number }) {
  // El endpoint solo usa el id para validar que exista (la web pide /1). Con
  // el id del torneo actual se comparte la cache con Inicio.
  const { data, error, isLoading, mutate } = useSWR<Response>(swrKeys.daysWithoutVictory(tournamentId ?? 1), {
    refreshInterval: 60000,
  });
  const { data: gameDates } = useSWR<GameDate[]>(tournamentId ? swrKeys.gameDates(tournamentId) : null);

  const dateMap = useMemo(() => {
    const map = new Map<string, Match>();
    gameDates?.forEach((gd) => {
      if (gd.scheduledDate) map.set(ymd(new Date(gd.scheduledDate)), { dateNumber: gd.dateNumber });
    });
    return map;
  }, [gameDates]);

  if (isLoading) return <LoadingState message="Cargando sequías…" />;
  if (error) return <ErrorState message="No se pudieron cargar las sequías" onRetry={() => mutate()} />;

  const players = data?.players ?? [];
  if (players.length === 0) return <EmptyState message="Sin datos disponibles" />;

  const meta = players.map((p) => {
    const milestone = milestoneOf(p.lastVictoryDate);
    return { milestone, match: milestone ? dateMap.get(ymd(milestone)) ?? null : null };
  });

  // El puesto sigue el orden de la API (más días primero) a través de los tramos.
  const groups = TIERS.map((tier, i) => ({
    tier,
    entries: players
      .map((player, idx) => ({ player, meta: meta[idx], rank: idx + 1 }))
      .filter(({ player }) => player.daysWithoutVictory >= tier.min && player.daysWithoutVictory < upperOf(i)),
  })).filter((g) => g.entries.length > 0);

  return (
    <View className="gap-3">
      <Hero player={players[0]} milestone={meta[0].milestone} match={meta[0].match} />
      <TierChart players={players} />
      {groups.map(({ tier, entries }) => (
        <View key={tier.key} className="gap-2">
          <View className="mt-2 flex-row items-center gap-2">
            <View style={{ width: 3, height: 15, borderRadius: 2, backgroundColor: tier.color }} />
            <Overline style={{ color: tier.color }}>{tier.label}</Overline>
            <Muted className="text-xs">×{entries.length}</Muted>
            <View className="h-px flex-1 bg-cp-surface-border" />
          </View>
          {entries.map(({ player, meta: m, rank }) => (
            <Row key={player.id} player={player} rank={rank} milestone={m.milestone} match={m.match} />
          ))}
        </View>
      ))}
    </View>
  );
}
