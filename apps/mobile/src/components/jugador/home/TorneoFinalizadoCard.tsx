/**
 * Inicio > Torneo cuando el torneo ya termino y todavia no hay otro: el bloque
 * oro con el podio final (campeon, 2º y 3º) y "Proximo torneo: por anunciar",
 * en lugar de la cuenta regresiva. El podio sale de /api/tournaments/winners,
 * el registro oficial; si la Comision aun no lo cargo, el top 3 de la tabla.
 */
import { playerLabel, shortenFullName, type PlayerRanking } from '@poker/shared';
import { Text, View } from 'react-native';

import { useTournamentWinner } from '@/hooks/useHomeExtras';
import { fonts } from '@/theme/colors';
import { useCP } from '@/theme/tone';

import { GOLD_RULE, METAL, Tile, TileOverline } from './bento';
import { PodiumRow, type PodiumEntry } from './shared';

export function TorneoFinalizadoCard({
  tournamentNumber,
  rankings,
  index = 0,
}: {
  tournamentNumber: number;
  rankings: PlayerRanking[];
  index?: number;
}) {
  const c = useCP();
  const { winner } = useTournamentWinner(tournamentNumber);

  const podio: PodiumEntry[] = winner
    ? [winner.champion, winner.runnerUp, winner.thirdPlace].map((p) => ({ id: p.id, name: playerLabel(p), photoUrl: p.photoUrl }))
    : [...rankings]
        .sort((a, b) => a.position - b.position)
        .slice(0, 3)
        .map((r) => ({ id: r.playerId, name: shortenFullName(r.playerName), photoUrl: r.playerPhoto ?? null }));

  return (
    <Tile tone="oro" index={index}>
      <TileOverline color={METAL[0]}>Temporada cerrada</TileOverline>
      <Text style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 27, color: c.onSurface, marginTop: 3, letterSpacing: -0.5 }}>
        T{tournamentNumber} finalizado
      </Text>

      {podio.length === 3 ? (
        <View className="mt-4">
          <PodiumRow podium={podio.map((p, i) => ({ ...p, label: i === 0 ? 'campeón' : `${i + 1}º` }))} />
        </View>
      ) : null}

      <View
        className="mt-3 flex-row items-baseline justify-between pt-3"
        style={{ borderTopWidth: 1, borderTopColor: GOLD_RULE }}>
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: c.onSurfaceMuted }}>Próximo torneo</Text>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: METAL[0] }}>Por anunciar</Text>
      </View>
    </Tile>
  );
}
