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
import { EmptyState, ErrorState, LoadingState, Muted, CPCard, Overline } from '@/components/ui';
import { cp, fonts } from '@/theme/colors';
import { useCP } from '@/theme/tone';
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

/**
 * `metales` rellenan y enmarcan (siempre el metal vivo); `tintas` son el mismo
 * color COMO TEXTO en el tono de la pantalla: sobre papel el oro vivo no se
 * lee, va su variante -on-light. Igual que PALETA_METAL / PALETA_ROSA de
 * CPHistoricoTab en la web.
 */
export type Paleta = { metales: [string, string, string]; tintas: [string, string, string] };

export function usePaletas(): { metal: Paleta; rosa: Paleta } {
  const c = useCP();
  return {
    metal: { metales: [cp.gold, cp.silver, cp.bronze], tintas: [c.gold, c.silver, c.bronze] },
    rosa: { metales: [cp.malazoDeep, cp.malazoBlock, cp.malazo], tintas: [c.malazoText, c.malazoText, c.malazoText] },
  };
}

/** `data` llega desenvuelto por apiFetch: con la API vieja (que ya traía el sobre) y con la nueva. */
function useHistorico<T>(key: string) {
  const res = useSWR<T>(key);
  const failed = !!res.error;
  const errorMessage = res.error instanceof Error && res.error.message ? res.error.message : undefined;
  return { ...res, failed, errorMessage };
}

function TarjetaPodio({ fila, color, tinta, grande }: { fila: Fila; color: string; tinta: string; grande: boolean }) {
  const w = grande ? 108 : 92;
  return (
    <View className="items-center" style={{ width: w + 8 }}>
      <PlayerAvatar {...avatarProps(fila.jugador)} size={w} height={grande ? 140 : 120} shape="card" ringColor={color} />
      <Text numberOfLines={1} className="mt-2 font-inter-semibold text-sm text-cp-on-surface">
        {playerLabel(fila.jugador)}
      </Text>
      <View className="mt-1 rounded-full px-3 py-0.5" style={{ backgroundColor: `${color}30` }}>
        <Text style={{ color: tinta, fontVariant: ['tabular-nums'] }} className="font-display text-lg">
          {fila.total}
        </Text>
      </View>
      {fila.pie ? (
        <Text style={{ color: tinta }} className="mt-1 font-inter-semibold text-xs">
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
        {segundo ? <TarjetaPodio fila={segundo} color={paleta.metales[1]} tinta={paleta.tintas[1]} grande={false} /> : null}
        {primero ? <TarjetaPodio fila={primero} color={paleta.metales[0]} tinta={paleta.tintas[0]} grande /> : null}
        {tercero ? <TarjetaPodio fila={tercero} color={paleta.metales[2]} tinta={paleta.tintas[2]} grande={false} /> : null}
      </View>

      {resto.length > 0 ? (
        <CPCard className="p-0">
          {resto.map((fila, i) => (
            <View
              key={fila.jugador.id}
              className={`flex-row items-center gap-3 px-4 py-3 ${i < resto.length - 1 ? 'border-b border-cp-surface-border' : ''} ${
                fila.jugador.isActive ? '' : 'opacity-60'
              }`}>
              <Text className="w-6 text-center font-inter text-sm text-cp-on-surface-muted">{i + 4}</Text>
              <PlayerAvatar {...avatarProps(fila.jugador)} size={40} />
              <View className="flex-1">
                <Text numberOfLines={1} className="font-inter-semibold text-base text-cp-on-surface">
                  {fila.jugador.firstName} {fila.jugador.lastName}
                </Text>
                {fila.jugador.aliases?.[0] ? <Muted className="text-xs">({fila.jugador.aliases[0]})</Muted> : null}
                {fila.detalle ? <Muted className="text-xs">{fila.detalle}</Muted> : null}
              </View>
              <View className="rounded-cp px-3 py-1" style={{ backgroundColor: `${paleta.metales[0]}22` }}>
                <Text style={{ color: paleta.tintas[0], fontVariant: ['tabular-nums'] }} className="font-display text-base">
                  {fila.total}
                </Text>
              </View>
            </View>
          ))}
        </CPCard>
      ) : null}
    </View>
  );
}

// ── Campeonatos ──

type ChampionData = { player: Jugador; championshipsCount: number; tournamentNumbers: number[] };

export function CampeonesTab() {
  const paletas = usePaletas();
  const { data, failed, errorMessage, isLoading, mutate } = useHistorico<{ all: ChampionData[] }>('/api/tournaments/champions-stats');
  if (isLoading) return <LoadingState message="Cargando campeones…" />;
  if (failed) return <ErrorState message={errorMessage ?? 'Error al cargar campeones'} onRetry={() => mutate()} />;
  const filas: Fila[] = (data?.all ?? []).map((c) => ({
    jugador: c.player,
    total: c.championshipsCount,
    detalle: [...c.tournamentNumbers].sort((a, b) => b - a).map((t) => `T${t}`).join(' · '),
  }));
  return <HistoricoList filas={filas} paleta={paletas.metal} vacio="No hay datos de campeones" />;
}

// ── Podios ──

type PodiumStat = {
  player: Jugador;
  firstPlaces: number;
  secondPlaces: number;
  thirdPlaces: number;
  totalPodiums: number;
};

function PodiosChart({ stats, paleta }: { stats: PodiumStat[]; paleta: Paleta }) {
  const c = useCP();
  const top = stats.filter((s) => s.player.isActive).slice(0, 8);
  if (top.length === 0) return null;
  const [oro, plata, bronce] = paleta.metales;
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
    <CPCard className="gap-3">
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
        yAxisColor={c.surfaceBorder}
        xAxisColor={c.surfaceBorder}
        rulesColor={c.surfaceBorder}
        yAxisTextStyle={{ color: c.onSurfaceVariant, fontFamily: fonts.body, fontSize: 11 }}
        xAxisLabelTextStyle={{ color: c.onSurfaceVariant, fontFamily: fonts.body, fontSize: 10 }}
        disableScroll
        isAnimated
        animationDuration={220}
      />
      <View className="flex-row justify-center gap-4">
        {(['1º', '2º', '3º'] as const).map((l, i) => (
          <View key={l} className="flex-row items-center gap-1.5">
            <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: paleta.metales[i] }} />
            <Muted className="text-xs">{l}</Muted>
          </View>
        ))}
      </View>
    </CPCard>
  );
}

export function PodiosTab() {
  const paletas = usePaletas();
  const { data, failed, errorMessage, isLoading, mutate } = useHistorico<{ players: PodiumStat[] }>('/api/tournaments/podium-stats');
  if (isLoading) return <LoadingState message="Cargando podios…" />;
  if (failed) return <ErrorState message={errorMessage ?? 'Error al cargar podios'} onRetry={() => mutate()} />;
  const stats = data?.players ?? [];
  const filas: Fila[] = stats.map((s) => ({
    jugador: s.player,
    total: s.totalPodiums,
    pie: `${s.firstPlaces}·${s.secondPlaces}·${s.thirdPlaces}`,
    detalle: `1ro ${s.firstPlaces} · 2do ${s.secondPlaces} · 3ro ${s.thirdPlaces}`,
  }));
  return (
    <View className="gap-4">
      <HistoricoList filas={filas} paleta={paletas.metal} vacio="No hay datos de podios" />
      <PodiosChart stats={stats} paleta={paletas.metal} />
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

function Premio({ etiqueta, jugador, paleta }: { etiqueta: string; jugador: Jugador | null; paleta: Paleta }) {
  if (!jugador) return <View className="flex-1" />;
  return (
    <View className="flex-1 flex-row items-center gap-2">
      <Text style={{ color: paleta.tintas[1] }} className="font-display text-sm">
        {etiqueta}
      </Text>
      <PlayerAvatar {...avatarProps(jugador)} size={28} ringColor={paleta.metales[2]} />
      <Text numberOfLines={1} className="flex-1 font-inter text-sm text-cp-on-surface">
        {playerLabel(jugador)}
      </Text>
    </View>
  );
}

export function SieteTab() {
  const paletas = usePaletas();
  const rosa = paletas.rosa;
  const { data, failed, errorMessage, isLoading, mutate } = useHistorico<{ all: SieteFila[]; porTorneo: PorTorneo[] }>(
    '/api/tournaments/siete-stats'
  );
  if (isLoading) return <LoadingState message="Cargando el 7/2…" />;
  if (failed) return <ErrorState message={errorMessage ?? 'Error al cargar el 7/2'} onRetry={() => mutate()} />;
  const datos = data;
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
      <HistoricoList filas={filas} paleta={rosa} vacio="Todavía no hay 7/2 registrados" />
      {datos?.porTorneo?.length ? (
        <CPCard className="p-0">
          <View className="border-b border-cp-surface-border px-4 py-3">
            <Overline style={{ color: rosa.tintas[0] }}>El 7/2 de cada torneo</Overline>
          </View>
          {datos.porTorneo.map((t, i) => (
            <View
              key={t.tournamentNumber}
              className={`flex-row items-center gap-2 px-4 py-3 ${i < datos.porTorneo.length - 1 ? 'border-b border-cp-surface-border' : ''}`}>
              <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${rosa.metales[2]}24` }}>
                <Text style={{ color: rosa.tintas[0] }} className="font-display text-xs">
                  T{t.tournamentNumber}
                </Text>
              </View>
              <Premio etiqueta="2" jugador={t.dos} paleta={rosa} />
              <Premio etiqueta="7" jugador={t.siete} paleta={rosa} />
            </View>
          ))}
        </CPCard>
      ) : null}
    </View>
  );
}
