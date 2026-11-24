/**
 * Home, vista "Última Fecha". Port de HomeUltimaFecha de la web: campeón de la
 * noche, tu noche, tu lugar en el campeonato, podio de la fecha, lo que dejó
 * la noche, podio del torneo y malazos 7/2.
 */
import { playerLabel, scoreOf, shortenFullName, type PlayerRanking } from '@poker/shared';
import { Text, View } from 'react-native';

import { Avatar } from '@/components/jugador/Avatar';
import { LinkCta, MALAZO, MEDAL, NEGATIVE, POSITIVE, Score, SectionHeader } from '@/components/jugador/Bits';
import { NoirButton } from '@/components/ui/NoirButton';
import { NoirCard } from '@/components/ui/NoirCard';
import { LoadingState } from '@/components/ui/States';
import { Muted, Overline, Title } from '@/components/ui/Typography';
import type { EliminationDTO } from '@/hooks/useTournamentDates';
import { useGameDateEliminations } from '@/hooks/useTournamentDates';
import { noir } from '@/theme/colors';

import { MalazosCard, PodiumRow } from './shared';

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
  const { data: eliminations } = useGameDateEliminations(lastCompletedDate.id);

  if (!eliminations || eliminations.length === 0 || rankings.length === 0) {
    return <LoadingState message="Cargando la última fecha…" />;
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
    varon && { key: 'varon', label: 'EL VARÓN DE LA NOCHE', color: noir.gold, name: varon.name, detail: `${varon.count} eliminaciones`, playerId: varon.playerId },
    malazo && {
      key: 'malazo',
      label: 'EL MALAZO',
      color: MALAZO,
      name: `${malazo.eliminatedPlayer.firstName} ${malazo.eliminatedPlayer.lastName}`,
      detail: 'primero eliminado',
      playerId: malazo.eliminatedPlayer.id,
    },
    olvidar && {
      key: 'olvidar',
      label: 'NOCHE PARA OLVIDAR',
      color: NEGATIVE,
      name: olvidar.playerName,
      detail: `bajó ${Math.abs(olvidar.positionsChanged)} puestos en el Torneo`,
      playerId: olvidar.playerId,
    },
    contento && {
      key: 'contento',
      label: 'EL MÁS CONTENTO',
      color: POSITIVE,
      name: contento.playerName,
      detail: `+${contento.positionsChanged} posiciones`,
      playerId: contento.playerId,
    },
  ].filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <View className="gap-4">
      {/* Campeón de la noche */}
      {winner ? (
        <NoirCard accent className="flex-row items-center gap-4">
          <View className="flex-1 gap-2">
            <Overline>Fecha {lastCompletedDate.dateNumber}</Overline>
            <Title className="text-2xl leading-tight">¡{playerLabel(winner.eliminatedPlayer).toUpperCase()} GANÓ LA FECHA!</Title>
            <NoirButton title="Ver resultados" onPress={onSeeAllResults} className="mt-1 self-start" />
          </View>
          <Avatar
            name={`${winner.eliminatedPlayer.firstName} ${winner.eliminatedPlayer.lastName}`}
            photoUrl={photoOf(winner.eliminatedPlayer)}
            size={104}
            ringColor={MEDAL[0]}
            playerId={winner.eliminatedPlayer.id}
            linkToProfile
          />
        </NoirCard>
      ) : null}

      {/* Tu noche + en el campeonato */}
      {myRanking && myNight ? (
        <View className="flex-row gap-3">
          <NoirCard className="flex-1 gap-1 p-4" style={{ backgroundColor: noir.copper, borderColor: noir.copper }}>
            {myNight.position === 1 ? (
              <>
                <Overline className="text-noir-text/80">Tu noche</Overline>
                <Title className="text-2xl">¡Ganaste!</Title>
                <Score value={`${myNight.points} pts`} size={18} />
              </>
            ) : (
              <>
                <Overline className="text-noir-text/80">Te eliminaron en</Overline>
                <Score value={`#${myNight.position}`} size={40} />
                <Score value={`${myNight.points} pts`} size={16} />
                {myNight.eliminatorPlayer ? (
                  <Text className="font-inter text-xs text-noir-text/80">Te eliminó {playerLabel(myNight.eliminatorPlayer)}</Text>
                ) : null}
              </>
            )}
          </NoirCard>
          <NoirCard className="flex-1 gap-1 p-4">
            <Overline>En el campeonato</Overline>
            <Score value={`#${myRanking.position}`} size={40} />
            <Score value={`${scoreOf(myRanking)} pts`} size={16} />
            {gapToLeader !== null ? (
              <Muted className="text-xs">{gapToLeader === 0 ? 'sos el líder' : `a ${gapToLeader} del líder`}</Muted>
            ) : null}
            <LinkCta title="Mi torneo" onPress={onOpenProfile} />
          </NoirCard>
        </View>
      ) : null}

      {/* Podio de la fecha */}
      {podium.length > 0 ? (
        <NoirCard className="gap-3" style={{ borderColor: `${MEDAL[0]}55` }}>
          <SectionHeader title={`Podio fecha ${lastCompletedDate.dateNumber}`} action="Todos" onAction={onSeeResultsTab} />
          {podium.map((e) => (
            <View key={e.id} className="flex-row items-center gap-3">
              <Avatar
                name={`${e.eliminatedPlayer.firstName} ${e.eliminatedPlayer.lastName}`}
                photoUrl={photoOf(e.eliminatedPlayer)}
                size={56}
                ringColor={MEDAL[e.position - 1]}
                playerId={e.eliminatedPlayer.id}
                linkToProfile
              />
              <View className="flex-1">
                <Text className="font-inter-semibold text-base text-noir-text">{playerLabel(e.eliminatedPlayer)}</Text>
                <Text style={{ color: MEDAL[e.position - 1] }} className="font-inter-bold text-xs uppercase tracking-[1px]">
                  {e.position === 1 ? 'campeón' : `${e.position}° puesto`}
                </Text>
              </View>
              <Score value={e.points} size={19} color={MEDAL[e.position - 1]} />
            </View>
          ))}
        </NoirCard>
      ) : null}

      {/* Lo que dejó la noche */}
      {insights.length > 0 ? (
        <NoirCard className="gap-3">
          <Overline>Lo que dejó la noche</Overline>
          <View className="flex-row flex-wrap" style={{ rowGap: 14 }}>
            {insights.map((c) => (
              <View key={c.key} className="w-1/2 flex-row items-center gap-2 pr-2">
                <Avatar name={c.name} photoUrl={rankingPhoto.get(c.playerId)} size={48} playerId={c.playerId} linkToProfile />
                <View className="min-w-0 flex-1">
                  <Text style={{ color: c.color }} className="font-inter-bold text-[10px] tracking-[1px]">
                    {c.label}
                  </Text>
                  <Text numberOfLines={1} className="font-inter-semibold text-sm text-noir-text">
                    {shortenFullName(c.name)}
                  </Text>
                  <Muted className="text-xs leading-tight">{c.detail}</Muted>
                </View>
              </View>
            ))}
          </View>
        </NoirCard>
      ) : null}

      {/* Podio del torneo */}
      {rankings.length >= 3 ? (
        <NoirCard className="gap-3">
          <SectionHeader title={`Podio torneo ${tournamentNumber}`} action="Tabla" onAction={onSeeTabla} />
          <PodiumRow podium={rankings.slice(0, 3)} />
        </NoirCard>
      ) : null}

      <MalazosCard rankings={rankings} />
    </View>
  );
}
