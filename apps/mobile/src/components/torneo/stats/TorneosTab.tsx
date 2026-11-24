/**
 * Ganadores de cada torneo (campeón, 2º, 3º y el 7/2), del más reciente al
 * más viejo. Igual que CPTorneosTab de la web, con sus tres filtros
 * excluyentes: torneo, campeón o jugador en cualquier puesto.
 */
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import useSWR from 'swr';

import { OptionPicker, type Option } from '@/components/torneo/OptionPicker';
import { PlayerAvatar } from '@/components/torneo/PlayerAvatar';
import { EmptyState, ErrorState, LoadingState, NoirButton, NoirCard, Overline, Title } from '@/components/ui';
import { noir } from '@/theme/colors';
import { playerLabel } from '@poker/shared';

import { PALETA_METAL, PALETA_ROSA } from './Historico';

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

function Puesto({ badge, color, player, malazo }: { badge: string; color: string; player?: Player; malazo?: boolean }) {
  if (!player) return <View className="w-1/2" />;
  return (
    <View className="w-1/2 flex-row items-center gap-2 p-3">
      <View
        className="h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: malazo ? color : `${color}33` }}>
        <Text style={{ color: malazo ? '#fff' : color }} className="font-inter-bold text-sm">
          {badge}
        </Text>
      </View>
      <Text numberOfLines={1} className="flex-1 font-inter text-sm text-noir-text">
        {playerLabel(player)}
      </Text>
    </View>
  );
}

export function TorneosTab() {
  const { data, error, isLoading, mutate } = useSWR<{ success: boolean; data?: TournamentWinner[]; error?: string }>(
    '/api/tournaments/winners'
  );
  const [filtro, setFiltro] = useState<Filtro>(null);

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
      {filtro ? <NoirButton title="Ver todos" variant="ghost" onPress={() => setFiltro(null)} /> : null}

      {filtrados.map((t) => (
        <NoirCard key={t.tournamentNumber} className="p-0">
          <View className="flex-row items-center gap-4 p-4">
            <PlayerAvatar player={t.champion} size={72} shape="card" ring={noir.gold} />
            <View className="flex-1 gap-0.5">
              <Overline>Campeón</Overline>
              <Title className="text-lg">{nombre(t.champion)}</Title>
              {t.champion.aliases?.[0] ? (
                <Text className="font-inter text-sm text-noir-copper">({t.champion.aliases[0]})</Text>
              ) : null}
            </View>
            <View className="items-end">
              <Text className="font-inter text-[10px] uppercase tracking-[2px] text-noir-muted">Torneo</Text>
              <Text className="font-cinzel-bold text-3xl text-noir-text">{t.tournamentNumber}</Text>
            </View>
          </View>
          <View className="flex-row flex-wrap border-t border-noir-border">
            <Puesto badge="2" color={PALETA_METAL.metales[1]} player={t.runnerUp} />
            <Puesto badge="3" color={PALETA_METAL.metales[2]} player={t.thirdPlace} />
            <Puesto badge="7" color={PALETA_ROSA.metales[0]} player={t.siete} malazo />
            <Puesto badge="2" color={PALETA_ROSA.metales[0]} player={t.dos} malazo />
          </View>
        </NoirCard>
      ))}
    </View>
  );
}
