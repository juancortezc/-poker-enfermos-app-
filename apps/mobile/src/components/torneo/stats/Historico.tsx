/**
 * Las tres tablas históricas de /stats: Campeonatos, Podios y 7/2. Mismo
 * armazón que CPHistoricoTab de la web: podio de tres (2º · 1º · 3º) y la
 * lista detrás; quien ya no juega sigue en la tabla pero al final.
 */
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import useSWR from 'swr';

import { avatarProps, PlayerAvatar } from '@/components/common/PlayerAvatar';
import { EmptyState, ErrorState, LoadingState, Muted, NoirCard, Overline } from '@/components/ui';
import { fonts, noir } from '@/theme/colors';
import { playerLabel } from '@poker/shared';

export type Jugador = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  isActive: boolean;
  aliases: string[];
};

type Fila = {
  jugador: Jugador;
  total: number;
  /** Bajo la pastilla del podio. */
  pie?: string;
  /** Bajo el nombre en la lista. */
  detalle?: string;
};

type Paleta = { metales: [string, string, string] };

export const PALETA_METAL: Paleta = { metales: [noir.gold, '#C9C6C2', '#C08A54'] };
export const PALETA_ROSA: Paleta = { metales: ['#D81B60', '#EC4899', '#F472B6'] };

type Envelope<T> = { success: boolean; error?: string; data?: T };

function useHistorico<T>(key: string) {
  const res = useSWR<Envelope<T>>(key);
  const failed = !!res.error || (res.data && !res.data.success);
  return { ...res, failed };
}

function TarjetaPodio({ fila, color, grande }: { fila: Fila; color: string; grande: boolean }) {
  const w = grande ? 108 : 92;
  return (
    <View className="items-center" style={{ width: w + 8 }}>
      <PlayerAvatar {...avatarProps(fila.jugador)} size={w} height={grande ? 140 : 120} shape="card" ringColor={color} />
      <Text numberOfLines={1} className="mt-2 font-inter-semibold text-sm text-noir-text">
        {playerLabel(fila.jugador)}
      </Text>
      <View className="mt-1 rounded-full px-3 py-0.5" style={{ backgroundColor: `${color}30` }}>
        <Text style={{ color }} className="font-inter-bold text-lg">
          {fila.total}
        </Text>
      </View>
      {fila.pie ? (
        <Text style={{ color }} className="mt-1 font-inter-semibold text-xs">
          {fila.pie}
        </Text>
      ) : null}
    </View>
  );
}

function HistoricoList({ filas, paleta, vacio }: { filas: Fila[]; paleta: Paleta; vacio: string }) {
  const ordenadas = useMemo(
    () => [...filas.filter((f) => f.jugador.isActive), ...filas.filter((f) => !f.jugador.isActive)],
    [filas]
  );
  if (ordenadas.length === 0) return <EmptyState message={vacio} icon="trophy-outline" />;

  const [primero, segundo, tercero] = ordenadas;
  const resto = ordenadas.slice(3);

  return (
    <View className="gap-4">
      <View className="flex-row items-end justify-center gap-2 py-2">
        {segundo ? <TarjetaPodio fila={segundo} color={paleta.metales[1]} grande={false} /> : null}
        {primero ? <TarjetaPodio fila={primero} color={paleta.metales[0]} grande /> : null}
        {tercero ? <TarjetaPodio fila={tercero} color={paleta.metales[2]} grande={false} /> : null}
      </View>

      {resto.length > 0 ? (
        <NoirCard className="p-0">
          {resto.map((fila, i) => (
            <View
              key={fila.jugador.id}
              className={`flex-row items-center gap-3 px-4 py-3 ${i < resto.length - 1 ? 'border-b border-noir-border' : ''} ${
                fila.jugador.isActive ? '' : 'opacity-60'
              }`}>
              <Text className="w-6 text-center font-inter text-sm text-noir-muted">{i + 4}</Text>
              <PlayerAvatar {...avatarProps(fila.jugador)} size={40} />
              <View className="flex-1">
                <Text numberOfLines={1} className="font-inter-semibold text-base text-noir-text">
                  {fila.jugador.firstName} {fila.jugador.lastName}
                </Text>
                {fila.jugador.aliases?.[0] ? <Muted className="text-xs">({fila.jugador.aliases[0]})</Muted> : null}
                {fila.detalle ? <Muted className="text-xs">{fila.detalle}</Muted> : null}
              </View>
              <View className="rounded-lg px-3 py-1" style={{ backgroundColor: `${paleta.metales[0]}22` }}>
                <Text style={{ color: paleta.metales[0] }} className="font-inter-bold text-base">
                  {fila.total}
                </Text>
              </View>
            </View>
          ))}
        </NoirCard>
      ) : null}
    </View>
  );
}

// ── Campeonatos ──

type ChampionData = { player: Jugador; championshipsCount: number; tournamentNumbers: number[] };

export function CampeonesTab() {
  const { data, failed, isLoading, mutate } = useHistorico<{ all: ChampionData[] }>('/api/tournaments/champions-stats');
  if (isLoading) return <LoadingState message="Cargando campeones…" />;
  if (failed) return <ErrorState message={data?.error ?? 'Error al cargar campeones'} onRetry={() => mutate()} />;
  const filas: Fila[] = (data?.data?.all ?? []).map((c) => ({
    jugador: c.player,
    total: c.championshipsCount,
    detalle: [...c.tournamentNumbers].sort((a, b) => b - a).map((t) => `T${t}`).join(' · '),
  }));
  return <HistoricoList filas={filas} paleta={PALETA_METAL} vacio="No hay datos de campeones" />;
}

// ── Podios ──

type PodiumStat = {
  player: Jugador;
  firstPlaces: number;
  secondPlaces: number;
  thirdPlaces: number;
  totalPodiums: number;
};

function PodiosChart({ stats }: { stats: PodiumStat[] }) {
  const top = stats.filter((s) => s.player.isActive).slice(0, 8);
  if (top.length === 0) return null;
  const [oro, plata, bronce] = PALETA_METAL.metales;
  const stackData = top.map((s) => ({
    label: s.player.firstName.slice(0, 6),
    stacks: [
      { value: s.firstPlaces, color: oro },
      { value: s.secondPlaces, color: plata, marginBottom: 1 },
      { value: s.thirdPlaces, color: bronce, marginBottom: 1 },
    ],
  }));
  const max = Math.max(...top.map((s) => s.totalPodiums), 1);

  return (
    <NoirCard className="gap-3">
      <Overline>Top 8 en podios (activos)</Overline>
      <BarChart
        stackData={stackData}
        barWidth={22}
        spacing={14}
        initialSpacing={8}
        height={160}
        maxValue={max + 1}
        noOfSections={Math.min(max + 1, 5)}
        stepValue={Math.ceil((max + 1) / Math.min(max + 1, 5))}
        barBorderTopLeftRadius={4}
        barBorderTopRightRadius={4}
        yAxisColor={noir.border}
        xAxisColor={noir.border}
        rulesColor={`${noir.border}`}
        yAxisTextStyle={{ color: noir.muted, fontFamily: fonts.body, fontSize: 11 }}
        xAxisLabelTextStyle={{ color: noir.muted, fontFamily: fonts.body, fontSize: 10 }}
        disableScroll
        isAnimated
        animationDuration={220}
      />
      <View className="flex-row justify-center gap-4">
        {(['1º', '2º', '3º'] as const).map((l, i) => (
          <View key={l} className="flex-row items-center gap-1.5">
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: PALETA_METAL.metales[i] }} />
            <Muted className="text-xs">{l}</Muted>
          </View>
        ))}
      </View>
    </NoirCard>
  );
}

export function PodiosTab() {
  const { data, failed, isLoading, mutate } = useHistorico<{ players: PodiumStat[] }>('/api/tournaments/podium-stats');
  if (isLoading) return <LoadingState message="Cargando podios…" />;
  if (failed) return <ErrorState message={data?.error ?? 'Error al cargar podios'} onRetry={() => mutate()} />;
  const stats = data?.data?.players ?? [];
  const filas: Fila[] = stats.map((s) => ({
    jugador: s.player,
    total: s.totalPodiums,
    pie: `${s.firstPlaces}·${s.secondPlaces}·${s.thirdPlaces}`,
    detalle: `1ro ${s.firstPlaces} · 2do ${s.secondPlaces} · 3ro ${s.thirdPlaces}`,
  }));
  return (
    <View className="gap-4">
      <HistoricoList filas={filas} paleta={PALETA_METAL} vacio="No hay datos de podios" />
      <PodiosChart stats={stats} />
    </View>
  );
}

// ── 7/2 ──
// El 2 es el ÚLTIMO del torneo y el 7 el penúltimo. Primero quien fue último
// más veces: ese orden lo decide la API.

type SieteFila = {
  player: Jugador | null;
  sieteCount: number;
  dosCount: number;
  sieteTournaments: number[];
  dosTournaments: number[];
  total: number;
};
type PorTorneo = { tournamentNumber: number; siete: Jugador | null; dos: Jugador | null };

const listaTorneos = (dos: number[], sietes: number[]) => {
  const parte = (etiqueta: string, ts: number[]) =>
    ts.length ? `${etiqueta}: ${[...ts].sort((a, b) => b - a).map((t) => `T${t}`).join(' · ')}` : '';
  return [parte('2', dos), parte('7', sietes)].filter(Boolean).join('   ');
};

function Premio({ etiqueta, jugador }: { etiqueta: string; jugador: Jugador | null }) {
  if (!jugador) return <View className="flex-1" />;
  return (
    <View className="flex-1 flex-row items-center gap-2">
      <Text style={{ color: PALETA_ROSA.metales[1] }} className="font-inter-bold text-sm">
        {etiqueta}
      </Text>
      <PlayerAvatar {...avatarProps(jugador)} size={28} ringColor={PALETA_ROSA.metales[2]} />
      <Text numberOfLines={1} className="flex-1 font-inter text-sm text-noir-text">
        {playerLabel(jugador)}
      </Text>
    </View>
  );
}

export function SieteTab() {
  const { data, failed, isLoading, mutate } = useHistorico<{ all: SieteFila[]; porTorneo: PorTorneo[] }>(
    '/api/tournaments/siete-stats'
  );
  if (isLoading) return <LoadingState message="Cargando el 7/2…" />;
  if (failed) return <ErrorState message={data?.error ?? 'Error al cargar el 7/2'} onRetry={() => mutate()} />;
  const datos = data?.data;
  const filas: Fila[] = (datos?.all ?? [])
    .filter((f): f is SieteFila & { player: Jugador } => !!f.player)
    .map((f) => ({
      jugador: f.player,
      total: f.total,
      pie: `2:${f.dosCount} · 7:${f.sieteCount}`,
      detalle: listaTorneos(f.dosTournaments, f.sieteTournaments),
    }));

  return (
    <View className="gap-4">
      <HistoricoList filas={filas} paleta={PALETA_ROSA} vacio="Todavía no hay 7/2 registrados" />
      {datos?.porTorneo?.length ? (
        <NoirCard className="p-0">
          <View className="border-b border-noir-border px-4 py-3">
            <Overline style={{ color: PALETA_ROSA.metales[1] }}>El 7/2 de cada torneo</Overline>
          </View>
          {datos.porTorneo.map((t, i) => (
            <View
              key={t.tournamentNumber}
              className={`flex-row items-center gap-2 px-4 py-3 ${i < datos.porTorneo.length - 1 ? 'border-b border-noir-border' : ''}`}>
              <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${PALETA_ROSA.metales[0]}33` }}>
                <Text style={{ color: PALETA_ROSA.metales[2] }} className="font-inter-bold text-xs">
                  T{t.tournamentNumber}
                </Text>
              </View>
              <Premio etiqueta="2" jugador={t.dos} />
              <Premio etiqueta="7" jugador={t.siete} />
            </View>
          ))}
        </NoirCard>
      ) : null}
    </View>
  );
}
