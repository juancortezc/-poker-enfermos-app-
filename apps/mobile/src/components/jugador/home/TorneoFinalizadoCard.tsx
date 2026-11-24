/**
 * Inicio > Torneo cuando el torneo ya terminó y todavía no hay otro: el podio
 * final (campeón, 2º y 3º) y "Próximo torneo: por anunciar", en lugar de la
 * cuenta regresiva. El podio sale de /api/tournaments/winners, el registro
 * oficial; si la Comisión aún no lo cargó, se usa el top 3 de la tabla.
 */
import { playerLabel, shortenFullName, type PlayerRanking } from '@poker/shared';
import { Text, View } from 'react-native';

import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { MEDAL } from '@/components/jugador/Bits';
import { NoirCard } from '@/components/ui/NoirCard';
import { Muted, Overline, Title } from '@/components/ui/Typography';
import { useTournamentWinner } from '@/hooks/useHomeExtras';

type Puesto = { id: string; name: string; photoUrl: string | null };

export function TorneoFinalizadoCard({ tournamentNumber, rankings }: { tournamentNumber: number; rankings: PlayerRanking[] }) {
  const { winner } = useTournamentWinner(tournamentNumber);

  const podio: Puesto[] = winner
    ? [winner.champion, winner.runnerUp, winner.thirdPlace].map((p) => ({
        id: p.id,
        name: playerLabel(p),
        photoUrl: p.photoUrl,
      }))
    : [...rankings]
        .sort((a, b) => a.position - b.position)
        .slice(0, 3)
        .map((r) => ({ id: r.playerId, name: shortenFullName(r.playerName), photoUrl: r.playerPhoto ?? null }));

  return (
    <NoirCard accent className="gap-4">
      <View className="gap-1">
        <Overline>Temporada cerrada</Overline>
        <Title className="text-2xl">T{tournamentNumber} finalizado</Title>
      </View>

      {podio.length === 3 ? (
        <View className="flex-row items-end justify-center gap-4">
          {[1, 0, 2].map((idx) => {
            const p = podio[idx];
            const first = idx === 0;
            return (
              <View key={p.id} className="min-w-0 flex-1 items-center" style={{ marginBottom: first ? 12 : 0 }}>
                <View>
                  <PlayerAvatar
                    name={p.name}
                    photoUrl={p.photoUrl}
                    size={first ? 96 : 72}
                    ringColor={MEDAL[idx]}
                    playerId={p.id}
                    linkToProfile
                  />
                  <View
                    style={{ backgroundColor: MEDAL[idx], position: 'absolute', bottom: -6, alignSelf: 'center' }}
                    className="h-5 min-w-5 items-center justify-center rounded-full px-1.5">
                    <Text className="font-inter-bold text-[11px] text-noir-bg">{idx + 1}</Text>
                  </View>
                </View>
                <Text numberOfLines={1} className="mt-3 font-inter-semibold text-xs text-noir-text">
                  {p.name}
                </Text>
                <Text style={{ color: MEDAL[idx] }} className="font-inter-bold text-[10px] uppercase tracking-[1.5px]">
                  {first ? 'Campeón' : `${idx + 1}º`}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <View className="flex-row items-center justify-between border-t border-noir-border pt-3">
        <Muted>Próximo torneo</Muted>
        <Text className="font-inter-bold text-sm text-noir-gold">Por anunciar</Text>
      </View>
    </NoirCard>
  );
}
