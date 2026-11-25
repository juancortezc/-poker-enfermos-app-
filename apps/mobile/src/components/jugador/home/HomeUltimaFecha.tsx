/**
 * Home, vista "Última Fecha". Port de HomeUltimaFecha de la web, en bloques:
 * el campeón de la noche (negro, con su foto), tu noche (rojo) y tu lugar en
 * el campeonato (papel), el podio de la fecha (oro), lo que dejó la noche, el
 * podio del torneo y los malazos 7/2 (rosa).
 */
import { playerLabel, scoreOf, shortenFullName, type PlayerRanking } from '@poker/shared';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { photoUri, PlayerAvatar } from '@/components/common/PlayerAvatar';
import type { EliminationDTO } from '@/hooks/useTournamentDates';
import { useGameDateEliminations } from '@/hooks/useTournamentDates';
import { fonts } from '@/theme/colors';
import { useCP } from '@/theme/tone';

import { Bento, BigScore, HashScore, METAL, ON_COLOR, Tile, TileLink, TileOverline, TileRow } from './bento';
import { MalazosTile, PodiumRow, rankingPodium } from './shared';

type Props = {
  userId: string;
  tournamentNumber: number;
  rankings: PlayerRanking[];
  lastCompletedDate: { id: number; dateNumber: number };
  onOpenProfile: () => void;
  onSeeAllResults: () => void;
  onSeeResultsTab: () => void;
  onSeeTabla: () => void;
};

export function HomeUltimaFecha({
  userId,
  tournamentNumber,
  rankings,
  lastCompletedDate,
  onOpenProfile,
  onSeeAllResults,
  onSeeResultsTab,
  onSeeTabla,
}: Props) {
  const c = useCP();
  const { data: eliminations } = useGameDateEliminations(lastCompletedDate.id);

  if (!eliminations || eliminations.length === 0 || rankings.length === 0) {
    return (
      <Tile tone="papel" padding={24}>
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: c.onSurfaceVariant, textAlign: 'center' }}>
          Cargando la última fecha…
        </Text>
      </Tile>
    );
  }

  const rankingPhoto = new Map(rankings.map((r) => [r.playerId, r.playerPhoto]));
  const photoOf = (p: { id: string; photoUrl?: string | null }) => p.photoUrl ?? rankingPhoto.get(p.id) ?? undefined;

  const sorted = [...eliminations].sort((a, b) => a.position - b.position);
  const winner = sorted.find((e) => e.position === 1);
  const podium = sorted.filter((e) => e.position <= 3);

  // El Varón de la Noche: más eliminaciones (el ganador figura como su propio
  // eliminador en la posición 1; no cuenta).
  const kills = new Map<string, { name: string; count: number }>();
  sorted.forEach((e) => {
    if (!e.eliminatorPlayer || e.position === 1) return;
    const k = e.eliminatorPlayer.id;
    const entry = kills.get(k) ?? { name: `${e.eliminatorPlayer.firstName} ${e.eliminatorPlayer.lastName}`, count: 0 };
    entry.count += 1;
    kills.set(k, entry);
  });
  const varon = [...kills.entries()].map(([playerId, v]) => ({ playerId, ...v })).sort((a, b) => b.count - a.count)[0];
  const malazo: EliminationDTO | undefined = sorted[sorted.length - 1];

  const fallers = rankings.filter((r) => r.positionsChanged < 0);
  const risers = rankings.filter((r) => r.positionsChanged > 0);
  const olvidar = fallers.length ? fallers.reduce((m, r) => (r.positionsChanged < m.positionsChanged ? r : m)) : null;
  const contento = risers.length ? risers.reduce((m, r) => (r.positionsChanged > m.positionsChanged ? r : m)) : null;

  const myNight = sorted.find((e) => e.eliminatedPlayer.id === userId);
  const myRanking = rankings.find((r) => r.playerId === userId);
  const leaderScore = rankings.length ? scoreOf(rankings[0]) : 0;
  const gapToLeader = myRanking ? leaderScore - scoreOf(myRanking) : null;

  const insights = [
    varon && { key: 'varon', label: 'EL VARÓN DE LA NOCHE', color: c.primaryLight, name: varon.name, detail: `${varon.count} eliminaciones`, playerId: varon.playerId },
    malazo && {
      key: 'malazo',
      label: 'EL MALAZO',
      color: c.malazoText,
      name: `${malazo.eliminatedPlayer.firstName} ${malazo.eliminatedPlayer.lastName}`,
      detail: 'primero eliminado',
      playerId: malazo.eliminatedPlayer.id,
    },
    olvidar && {
      key: 'olvidar',
      label: 'NOCHE PARA OLVIDAR',
      color: c.negative,
      name: olvidar.playerName,
      detail: `bajó ${Math.abs(olvidar.positionsChanged)} puestos en el Torneo`,
      playerId: olvidar.playerId,
    },
    contento && {
      key: 'contento',
      label: 'EL MÁS CONTENTO',
      color: c.positive,
      name: contento.playerName,
      detail: `+${contento.positionsChanged} posiciones`,
      playerId: contento.playerId,
    },
  ].filter((x): x is NonNullable<typeof x> => Boolean(x));

  const winnerName = winner ? `${winner.eliminatedPlayer.firstName} ${winner.eliminatedPlayer.lastName}` : '';
  const winnerPhoto = winner ? photoUri(photoOf(winner.eliminatedPlayer), null, 240) : null;
  let n = 0;

  return (
    <Bento>
      {/* El campeón de la noche — el ancla negra */}
      {winner ? (
        <Tile tone="negro" index={n++} padding={0} style={{ minHeight: 178 }}>
          {winnerPhoto ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Ver el perfil de ${winnerName}`}
              onPress={() => router.push({ pathname: '/players/[id]', params: { id: winner.eliminatedPlayer.id } })}
              style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '48%' }}>
              <Image source={{ uri: winnerPhoto }} style={{ width: '100%', height: '100%' }} contentFit="cover" contentPosition="top" transition={200} />
              <LinearGradient
                pointerEvents="none"
                colors={['#17120F', 'rgba(23,18,15,0.55)', 'rgba(23,18,15,0)']}
                locations={[0, 0.3, 0.72]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
              />
            </Pressable>
          ) : (
            <View style={{ position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' }}>
              <PlayerAvatar name={winnerName} size={118} playerId={winner.eliminatedPlayer.id} linkToProfile />
            </View>
          )}
          <View style={{ padding: 16, maxWidth: '58%' }} pointerEvents="box-none">
            <TileOverline color={ON_COLOR.faint}>Fecha {lastCompletedDate.dateNumber}</TileOverline>
            <Text style={{ fontFamily: fonts.displayBlack, fontSize: 28, lineHeight: 29, color: '#FFFFFF', marginTop: 6, letterSpacing: -0.3 }}>
              ¡{playerLabel(winner.eliminatedPlayer).toUpperCase()}
              {'\n'}GANÓ LA FECHA!
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={onSeeAllResults}
              className="mt-4 self-start rounded-full active:opacity-80"
              style={{ backgroundColor: c.primary, paddingHorizontal: 18, paddingVertical: 11 }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.4, color: '#FFFFFF' }}>VER RESULTADOS</Text>
            </Pressable>
          </View>
        </Tile>
      ) : null}

      {/* Tu noche (rojo) + en el campeonato (papel) */}
      {myRanking && myNight ? (
        <TileRow>
          <Tile tone="rojo" span={1} index={n++}>
            {myNight.position === 1 ? (
              <>
                <TileOverline color={ON_COLOR.soft}>Tu noche</TileOverline>
                <Text style={{ fontFamily: fonts.displayBlack, fontSize: 26, color: '#FFFFFF', marginTop: 2 }}>¡Ganaste!</Text>
                <View className="mt-1 flex-row items-baseline" style={{ gap: 4 }}>
                  <BigScore value={myNight.points} size={20} color="#FFFFFF" />
                  <TileOverline color={ON_COLOR.soft}>pts</TileOverline>
                </View>
              </>
            ) : (
              <>
                <TileOverline color={ON_COLOR.soft}>Te eliminaron en</TileOverline>
                <View style={{ marginTop: 4 }}>
                  <HashScore value={myNight.position} size={50} color="#FFFFFF" hashColor="rgba(255,255,255,0.7)" />
                </View>
                <View className="flex-row items-baseline" style={{ gap: 5 }}>
                  <BigScore value={myNight.points} size={20} color="#FFFFFF" />
                  <TileOverline color={ON_COLOR.soft}>pts</TileOverline>
                </View>
                {myNight.eliminatorPlayer ? (
                  <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 17, color: ON_COLOR.soft, marginTop: 6 }}>
                    Te eliminó {playerLabel(myNight.eliminatorPlayer)}
                  </Text>
                ) : null}
              </>
            )}
          </Tile>
          <Tile tone="papel" span={1} index={n++}>
            <TileOverline>En el campeonato</TileOverline>
            <View style={{ marginTop: 4 }}>
              <HashScore value={myRanking.position} size={50} color={c.onSurface} hashColor={c.primary} />
            </View>
            <View className="flex-row items-baseline" style={{ gap: 5 }}>
              <BigScore value={scoreOf(myRanking)} size={20} color={c.onSurface} />
              <TileOverline>pts</TileOverline>
            </View>
            {gapToLeader !== null ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: c.onSurfaceMuted, marginTop: 6 }}>
                {gapToLeader === 0 ? 'sos el líder' : `a ${gapToLeader} del líder`}
              </Text>
            ) : null}
            <TileLink title="MI TORNEO" onPress={onOpenProfile} style={{ marginTop: 'auto', paddingTop: 12 }} />
          </Tile>
        </TileRow>
      ) : null}

      {/* Podio de la fecha — bloque oro */}
      {podium.length > 0 ? (
        <Tile tone="oro" index={n++}>
          <View className="flex-row items-baseline justify-between">
            <TileOverline color={METAL[0]}>Podio fecha {lastCompletedDate.dateNumber}</TileOverline>
            <TileLink title="TODOS" onPress={onSeeResultsTab} color={c.primaryLight} />
          </View>
          <View style={{ gap: 10, marginTop: 12 }}>
            {podium.map((e) => {
              const metal = METAL[e.position - 1] ?? c.onSurfaceVariant;
              return (
                <View key={e.id} className="flex-row items-center" style={{ gap: 12 }}>
                  <PlayerAvatar
                    name={`${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName}`}
                    photoUrl={photoOf(e.eliminatedPlayer)}
                    size={64}
                    playerId={e.eliminatedPlayer.id}
                    linkToProfile
                  />
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: c.onSurface }}>
                      {playerLabel(e.eliminatedPlayer)}
                    </Text>
                    <Text style={{ fontFamily: fonts.display, fontSize: 12, letterSpacing: 0.8, color: metal, textTransform: 'uppercase', marginTop: 1 }}>
                      {e.position === 1 ? 'campeón' : `${e.position}° puesto`}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: fonts.display, fontSize: 22, color: metal, letterSpacing: -0.6 }}>{e.points}</Text>
                </View>
              );
            })}
          </View>
        </Tile>
      ) : null}

      {/* Lo que dejó la noche */}
      {insights.length > 0 ? (
        <Tile tone="papel" index={n++}>
          <TileOverline>Lo que dejó la noche</TileOverline>
          <View className="mt-3 flex-row flex-wrap" style={{ rowGap: 14 }}>
            {insights.map((card) => (
              <View key={card.key} className="w-1/2 flex-row items-center pr-2" style={{ gap: 9 }}>
                <PlayerAvatar name={card.name} photoUrl={rankingPhoto.get(card.playerId)} size={54} playerId={card.playerId} linkToProfile />
                <View className="min-w-0 flex-1">
                  <Text style={{ fontFamily: fonts.display, fontSize: 10, lineHeight: 12.5, letterSpacing: 0.9, color: card.color }}>
                    {card.label}
                  </Text>
                  <Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: c.onSurface, marginTop: 2 }}>
                    {shortenFullName(card.name)}
                  </Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 12, lineHeight: 15, color: c.onSurfaceVariant }}>{card.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        </Tile>
      ) : null}

      {/* El podio del torneo */}
      {rankings.length >= 3 ? (
        <Tile tone="papel" index={n++}>
          <View className="flex-row items-baseline justify-between">
            <TileOverline>Podio torneo {tournamentNumber}</TileOverline>
            <TileLink title="TABLA" onPress={onSeeTabla} />
          </View>
          <View className="mt-3">
            <PodiumRow podium={rankingPodium(rankings)} big={92} small={70} />
          </View>
        </Tile>
      ) : null}

      <MalazosTile rankings={rankings} index={n++} />
    </Bento>
  );
}
