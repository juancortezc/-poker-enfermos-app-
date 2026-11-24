/**
 * Premios del torneo: las 8 categorías de /api/stats/awards/[tournamentId]
 * con selector de torneo desde T28. En la web viven en admin > Premiación
 * (subpestañas Premios y Stats); aquí van juntas y en el mismo orden.
 *
 * El botón Compartir captura las tarjetas con react-native-view-shot.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState, type ComponentRef } from 'react';
import { Alert, View } from 'react-native';
import useSWR from 'swr';

import { OptionPicker } from '@/components/torneo/OptionPicker';
import { shareView } from '@/components/torneo/share/share';
import { EmptyState, ErrorState, LoadingState, Muted, NoirButton, Title } from '@/components/ui';
import { noir } from '@/theme/colors';

import { AwardCard, type AwardPlayer } from './AwardCard';
import { useTournamentOptions } from './useTournamentOptions';

type AwardsResponse = {
  tournament: { id: number; number: number; name: string };
  awards: {
    varon: { player: AwardPlayer; eliminations: number }[];
    gay: { player: AwardPlayer; eliminations: number }[];
    podios: { player: AwardPlayer; count: number }[];
    sieteYDos: { player: AwardPlayer; count: number }[];
    sinPodio: AwardPlayer[];
    faltas: { player: AwardPlayer; count: number }[];
    mesasFinales: { player: AwardPlayer; count: number }[];
    victorias: { player: AwardPlayer; count: number }[];
  };
};

export function PremiosTab() {
  const t = useTournamentOptions(28);
  const { data, error, isLoading, mutate } = useSWR<AwardsResponse>(
    t.selectedId ? `/api/stats/awards/${t.selectedId}` : null,
    { refreshInterval: 30000 }
  );
  const captureRef = useRef<ComponentRef<typeof View>>(null);
  const [sharing, setSharing] = useState(false);

  const share = async () => {
    setSharing(true);
    try {
      await shareView(captureRef, `Premios Torneo ${data?.tournament.number ?? ''}`);
    } catch (e) {
      Alert.alert('No se pudo compartir', e instanceof Error ? e.message : 'Probá de nuevo.');
    } finally {
      setSharing(false);
    }
  };

  const a = data?.awards;

  return (
    <View className="gap-4">
      <View className="flex-row items-center gap-2">
        <OptionPicker label="Torneo" value={t.selectedId} options={t.options} onChange={t.setSelectedId} placeholder="Torneo" />
        <NoirButton
          title="Compartir"
          variant="outline"
          onPress={share}
          loading={sharing}
          disabled={!a}
          icon={<Ionicons name="share-outline" size={16} color={noir.gold} />}
        />
      </View>

      {t.isLoading || isLoading ? <LoadingState message="Cargando premiación…" /> : null}
      {t.error || error ? <ErrorState error={t.error ?? error} onRetry={() => mutate()} /> : null}
      {!isLoading && !error && !a && !t.isLoading ? (
        <EmptyState message="Los premios se mostrarán cuando haya datos del torneo." icon="ribbon-outline" />
      ) : null}

      {a ? (
        // collapsable={false}: en Android una View sin estilos propios puede
        // aplanarse y view-shot no tendría qué capturar.
        <View ref={captureRef} collapsable={false} className="gap-4 bg-noir-bg pb-2">
          <View className="items-center pt-2">
            <Title>Premios · Torneo {data.tournament.number}</Title>
            <Muted>Poker Enfermos</Muted>
          </View>
          <AwardCard
            title="Varón del torneo"
            description="Mayor cantidad de eliminaciones"
            icon="trophy-outline"
            accent="#E5735A"
            players={a.varon.map((v) => ({ player: v.player, value: v.eliminations }))}
            valueLabel="Elims"
          />
          <AwardCard
            title="Gay del torneo"
            description="Menor cantidad de eliminaciones"
            icon="person-remove-outline"
            accent="#D9783A"
            players={a.gay.map((g) => ({ player: g.player, value: g.eliminations }))}
            valueLabel="Elims"
          />
          <AwardCard
            title="Victorias"
            description="Mayor cantidad de 1er lugar"
            icon="medal-outline"
            accent={noir.gold}
            players={a.victorias.map((v) => ({ player: v.player, value: v.count }))}
            valueLabel="Wins"
          />
          <AwardCard
            title="Podios"
            description="Mayor cantidad de Top 3"
            icon="podium-outline"
            accent="#C9C6C2"
            players={a.podios.map((p) => ({ player: p.player, value: p.count }))}
            valueLabel="Podios"
          />
          <AwardCard
            title="7/2"
            description="Más veces último de la fecha"
            icon="skull-outline"
            accent="#EC4899"
            players={a.sieteYDos.map((s) => ({ player: s.player, value: s.count }))}
            valueLabel="Veces"
          />
          <AwardCard
            title="Mesas finales"
            description="Mayor cantidad en Top 9"
            icon="people-outline"
            accent={noir.copper}
            players={a.mesasFinales.map((m) => ({ player: m.player, value: m.count }))}
            valueLabel="Veces"
          />
          <AwardCard
            title="Sin podio"
            description="Nunca en el Top 3"
            icon="close-circle-outline"
            accent="#5BC8C0"
            players={a.sinPodio.map((p) => ({ player: p }))}
          />
          <AwardCard
            title="Faltas"
            description="Mayor cantidad de ausencias"
            icon="calendar-clear-outline"
            accent="#D9783A"
            players={a.faltas.map((f) => ({ player: f.player, value: f.count }))}
            valueLabel="Faltas"
          />
        </View>
      ) : null}
    </View>
  );
}
