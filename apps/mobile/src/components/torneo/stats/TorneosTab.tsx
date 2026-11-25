/**
 * Ganadores de cada torneo (campeón, 2º, 3º y el 7/2), del más reciente al
 * más viejo. Igual que CPTorneosTab de la web, con sus tres filtros
 * excluyentes: torneo, campeón o jugador en cualquier puesto.
 */
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import useSWR from 'swr';

import { OptionPicker, type Option } from '@/components/torneo/OptionPicker';
import { avatarProps } from '@/components/common/PlayerAvatar';
import { PlayerCard } from '@/components/common/PlayerCard';
import { EmptyState, ErrorState, LoadingState, CPButton, CPCard, Overline, Title } from '@/components/ui';
import { swrKeys } from '@/lib/swr';
import { playerLabel } from '@poker/shared';

import { usePaletas } from './Historico';

type Player = {
  firstName: string;
  lastName: string;
  isActive: boolean;
  photoUrl?: string | null;
  aliases: string[];
};

type TournamentWinner = {
  tournamentNumber: number;
  champion: Player;
  runnerUp: Player;
  thirdPlace: Player;
  siete: Player;
  dos: Player;
};

type Filtro = { tipo: 'torneo'; valor: number } | { tipo: 'campeon' | 'jugador'; valor: string } | null;

const nombre = (p: Player) => `${p.firstName} ${p.lastName}`;

function uniquePlayers(list: Player[]): Option<string>[] {
  const seen = new Map<string, Player>();
  list.forEach((p) => {
    if (p && !seen.has(nombre(p))) seen.set(nombre(p), p);
  });
  return [...seen.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, p]) => ({ value: key, label: playerLabel(p) }));
}

function Puesto({
  badge,
  color,
  tinta,
  player,
  malazo,
}: {
  badge: string;
  color: string;
  tinta: string;
  player?: Player;
  malazo?: boolean;
}) {
  if (!player) return <View className="w-1/2" />;
  return (
    <View className="w-1/2 flex-row items-center gap-2 p-3">
      <View
        className="h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: malazo ? color : `${color}33` }}>
        <Text style={{ color: malazo ? '#fff' : tinta }} className="font-display text-sm">
          {badge}
        </Text>
      </View>
      <Text numberOfLines={1} className="flex-1 font-inter text-sm text-cp-on-surface">
        {playerLabel(player)}
      </Text>
    </View>
  );
}

export function TorneosTab() {
  const { data, error, isLoading, mutate } = useSWR<{ success: boolean; data?: TournamentWinner[]; error?: string }>(
    swrKeys.tournamentWinners()
  );
  const [filtro, setFiltro] = useState<Filtro>(null);
  const { metal, rosa } = usePaletas();

  const torneos = useMemo(
    () => [...(data?.data ?? [])].sort((a, b) => b.tournamentNumber - a.tournamentNumber),
    [data]
  );

  const opciones = useMemo(
    () => ({
      torneos: torneos.map((t) => ({ value: t.tournamentNumber, label: `Torneo ${t.tournamentNumber}` })),
      campeones: uniquePlayers(torneos.map((t) => t.champion)),
      jugadores: uniquePlayers(torneos.flatMap((t) => [t.champion, t.runnerUp, t.thirdPlace, t.siete, t.dos])),
    }),
    [torneos]
  );

  if (isLoading) return <LoadingState message="Cargando torneos…" />;
  if (error || (data && !data.success)) {
    return <ErrorState message={data?.error ?? 'Error al cargar torneos'} onRetry={() => mutate()} />;
  }
  if (torneos.length === 0) return <EmptyState message="No hay datos de torneos históricos" icon="trophy-outline" />;

  const filtrados = torneos.filter((t) => {
    if (!filtro) return true;
    if (filtro.tipo === 'torneo') return t.tournamentNumber === filtro.valor;
    if (filtro.tipo === 'campeon') return nombre(t.champion) === filtro.valor;
    return [t.champion, t.runnerUp, t.thirdPlace, t.siete, t.dos].some((p) => p && nombre(p) === filtro.valor);
  });

  return (
    <View className="gap-4">
      <View className="flex-row gap-2">
        <OptionPicker
          label="Torneo"
          placeholder="Torneo"
          value={filtro?.tipo === 'torneo' ? filtro.valor : null}
          options={opciones.torneos}
          onChange={(v) => setFiltro({ tipo: 'torneo', valor: v })}
        />
        <OptionPicker
          label="Campeón"
          placeholder="Campeón"
          value={filtro?.tipo === 'campeon' ? filtro.valor : null}
          options={opciones.campeones}
          onChange={(v) => setFiltro({ tipo: 'campeon', valor: v })}
        />
        <OptionPicker
          label="Jugador"
          placeholder="Jugador"
          value={filtro?.tipo === 'jugador' ? filtro.valor : null}
          options={opciones.jugadores}
          onChange={(v) => setFiltro({ tipo: 'jugador', valor: v })}
        />
      </View>
      {filtro ? <CPButton title="Ver todos" variant="ghost" onPress={() => setFiltro(null)} /> : null}

      {filtrados.map((t) => (
        <CPCard key={t.tournamentNumber} className="p-0">
          <View className="flex-row items-center gap-4 p-4">
            <PlayerCard {...avatarProps(t.champion)} width={104} ringColor={metal.metales[0]} elevate={1} zoomable />
            <View className="flex-1 gap-0.5">
              <Overline style={{ color: metal.tintas[0] }}>Campeón</Overline>
              <Title className="text-lg">{nombre(t.champion)}</Title>
              {t.champion.aliases?.[0] ? (
                <Text className="font-inter text-sm text-cp-on-surface-muted">({t.champion.aliases[0]})</Text>
              ) : null}
            </View>
            <View className="items-end">
              <Overline>Torneo</Overline>
              <Text className="font-display text-3xl text-cp-on-surface">{t.tournamentNumber}</Text>
            </View>
          </View>
          <View className="flex-row flex-wrap border-t border-cp-surface-border">
            <Puesto badge="2" color={metal.metales[1]} tinta={metal.tintas[1]} player={t.runnerUp} />
            <Puesto badge="3" color={metal.metales[2]} tinta={metal.tintas[2]} player={t.thirdPlace} />
            <Puesto badge="7" color={rosa.metales[0]} tinta={rosa.tintas[0]} player={t.siete} malazo />
            <Puesto badge="2" color={rosa.metales[0]} tinta={rosa.tintas[0]} player={t.dos} malazo />
          </View>
        </CPCard>
      ))}
    </View>
  );
}
