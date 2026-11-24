/**
 * Perfil de un jugador en el torneo activo (web: /players/[id]): posición y
 * puntaje, rival directo, logros, evolución, resumen, últimas fechas, fechas
 * que descarta el ELIMINA y multas. En el perfil propio, botón a "Editar".
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { averageNightlyPosition, averagePointsPerDate, fullName, playerLabel, SCORE_LABELS, scoreOf } from '@poker/shared';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { Delta, KeyValue, NEGATIVE, POSITIVE, Score, StatRow } from '@/components/jugador/Bits';
import { EvolutionChart } from '@/components/jugador/EvolutionChart';
import { NoirButton } from '@/components/ui/NoirButton';
import { NoirCard } from '@/components/ui/NoirCard';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { Muted, Overline, Title } from '@/components/ui/Typography';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveTournament } from '@/hooks/useActiveTournament';
import { useChampionships } from '@/hooks/useHomeExtras';
import { useMultas } from '@/hooks/useMultas';
import { usePlayerTournamentDetails } from '@/hooks/usePlayerTournamentDetails';
import { useRefresh } from '@/hooks/useRefresh';
import { noir } from '@/theme/colors';

const MESA_FINAL_MAX = 9;

export default function PlayerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const playerId = Array.isArray(id) ? id[0] : id;
  const { user } = useAuth();
  const active = useActiveTournament();
  const tournamentId = active.tournament?.id;
  const d = usePlayerTournamentDetails(playerId, tournamentId);
  const champs = useChampionships(playerId);
  const multasSwr = useMultas(tournamentId, playerId);
  const { refreshing, onRefresh } = useRefresh(active.mutate, d.refresh, champs.mutate, multasSwr.mutate);

  const details = d.details;
  const rankings = d.ranking?.rankings;
  const isOwn = user?.id === playerId;

  const achievements = useMemo(() => {
    if (!details) return null;
    const played = details.datePerformance.filter((x) => x.status === 'completed' && !x.isAbsent);
    const isWinner = (x: (typeof played)[0]) => x.eliminationPosition === undefined || x.eliminationPosition === 1;
    return {
      victories: played.filter(isWinner).length,
      podiums: played.filter((x) => isWinner(x) || (x.eliminationPosition !== undefined && x.eliminationPosition <= 3)).length,
      mesaFinal: played.filter((x) => isWinner(x) || (x.eliminationPosition !== undefined && x.eliminationPosition <= MESA_FINAL_MAX)).length,
      last: played.filter((x) => x.points === 1).length,
    };
  }, [details]);

  const eliminatedDates = useMemo(() => {
    if (!details || !details.currentStats.eliminasActive || details.datesToEliminate <= 0) return [];
    const played = details.datePerformance.filter((x) => x.status === 'completed').sort((a, b) => a.dateNumber - b.dateNumber);
    return [...played].sort((a, b) => a.points - b.points).slice(0, details.datesToEliminate);
  }, [details]);

  const title = details ? details.player.firstName : 'Jugador';

  const body = (() => {
    if (active.isLoading || d.isLoading) return <LoadingState message="Cargando el perfil…" />;
    if (!active.tournament) return <EmptyState icon="trophy-outline" message="No hay torneo activo." />;
    if (d.error) return <ErrorState error={d.error} onRetry={() => d.refresh()} />;
    if (d.notInRanking || !details) {
      const p = d.player;
      return (
        <>
          {p ? (
            <NoirCard className="flex-row items-center gap-4">
              <PlayerAvatar name={fullName(p)} photoUrl={p.photoUrl} size={72} />
              <Title className="flex-1">{fullName(p)}</Title>
            </NoirCard>
          ) : null}
          <EmptyState icon="person-outline" message="Este jugador no figura en la tabla del torneo activo." />
        </>
      );
    }

    const { player, currentStats } = details;
    const myEntry = rankings?.find((r) => r.playerId === playerId);
    const avgPosition = rankings ? averageNightlyPosition(rankings, playerId) : null;
    const avgPoints = myEntry ? averagePointsPerDate(myEntry) : null;
    const totalCompleted = details.datePerformance.filter((x) => x.status === 'completed').length;
    const absences = details.datePerformance.filter((x) => x.status === 'completed' && x.isAbsent).length;
    const above = rankings?.find((r) => r.position === currentStats.position - 1) ?? null;
    const below = rankings?.find((r) => r.position === currentStats.position + 1) ?? null;
    const lastThree = (d.dates ?? []).filter((x) => x.status === 'completed').sort((a, b) => b.dateNumber - a.dateNumber).slice(0, 3);
    const multas = multasSwr.multas ?? [];

    return (
      <>
        {/* HERO */}
        <NoirCard accent className="gap-4">
          <View className="flex-row items-center gap-4">
            <View>
              <PlayerAvatar name={fullName(player)} photoUrl={player.photoUrl} size={84} ringColor={noir.gold} />
              <View className="absolute -bottom-1 -left-1 rounded-lg border-2 border-noir-surface bg-noir-copper px-1.5 py-0.5">
                <Text className="font-inter-bold text-xs text-noir-text">#{currentStats.position}</Text>
              </View>
            </View>
            <View className="flex-1 gap-1">
              <Title className="text-xl leading-tight">{fullName(player)}</Title>
              {player.aliases.length > 0 ? <Text className="font-inter text-sm italic text-noir-gold">“{player.aliases[0]}”</Text> : null}
              {champs.count > 0 ? (
                <View className="flex-row items-center gap-1">
                  <Ionicons name="trophy" size={13} color={noir.gold} />
                  <Text className="font-inter-bold text-sm text-noir-gold">{champs.count}x campeón</Text>
                </View>
              ) : null}
            </View>
            <View className="items-end">
              <Muted className="text-[10px] uppercase tracking-[1px]">{isOwn ? 'Tu posición' : 'Posición'}</Muted>
              <Score value={`#${currentStats.position}`} size={26} />
              {myEntry ? <Delta value={myEntry.positionsChanged} /> : null}
            </View>
          </View>
          <View className="border-t border-noir-border pt-3">
            <StatRow
              items={[
                { value: scoreOf(currentStats), label: SCORE_LABELS.points, color: noir.gold },
                { value: currentStats.totalPoints, label: SCORE_LABELS.accumulated, color: NEGATIVE },
                { value: `${totalCompleted - absences}/${totalCompleted}`, label: 'FECHAS' },
              ]}
            />
          </View>
        </NoirCard>

        {/* RIVAL DIRECTO */}
        {above || below ? (
          <View className="gap-2">
            <Overline>{isOwn ? 'Tu rival directo' : 'Rival cercano'}</Overline>
            {[
              { p: above, tag: 'ARRIBA' },
              { p: below, tag: 'ABAJO' },
            ]
              .filter((r): r is { p: NonNullable<typeof above>; tag: string } => !!r.p)
              .map(({ p, tag }) => (
                <Pressable
                  key={p.playerId}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/players/[id]', params: { id: p.playerId } })}
                  className="active:opacity-80">
                  <NoirCard className="flex-row items-center gap-3 p-3">
                    <PlayerAvatar name={p.playerName} photoUrl={p.playerPhoto} size={44} />
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="rounded bg-noir-raised px-1.5 py-0.5 font-inter-bold text-[10px] tracking-[1px] text-noir-muted">
                          {tag}
                        </Text>
                        <Text numberOfLines={1} className="flex-1 font-inter-semibold text-sm text-noir-text">
                          {p.playerName}
                        </Text>
                      </View>
                      <Muted className="text-xs">#{p.position} en el torneo</Muted>
                    </View>
                    <View className="items-end">
                      <Score value={`${Math.abs(scoreOf(currentStats) - scoreOf(p))} pts`} size={14} />
                      <Muted className="text-xs">de diferencia</Muted>
                    </View>
                  </NoirCard>
                </Pressable>
              ))}
          </View>
        ) : null}

        {/* LOGROS */}
        {achievements ? (
          <View className="gap-2">
            <Overline>Logros</Overline>
            <NoirCard className="p-4">
              <StatRow
                items={[
                  { value: achievements.victories, label: achievements.victories === 1 ? 'victoria' : 'victorias' },
                  { value: achievements.podiums, label: achievements.podiums === 1 ? 'podio' : 'podios' },
                  { value: achievements.mesaFinal, label: achievements.mesaFinal === 1 ? 'mesa final' : 'mesas finales' },
                  { value: achievements.last, label: achievements.last === 1 ? 'último' : 'últimos' },
                ]}
              />
            </NoirCard>
          </View>
        ) : null}

        {/* EVOLUCIÓN */}
        {details.rankingEvolution.length > 1 ? (
          <View className="gap-2">
            <Overline>{isOwn ? 'Mi evolución en el torneo' : 'Evolución en el torneo'}</Overline>
            <NoirCard className="p-3">
              <EvolutionChart evolution={details.rankingEvolution} />
            </NoirCard>
          </View>
        ) : null}

        {/* RESUMEN */}
        <View className="gap-2">
          <Overline>Resumen de {isOwn ? 'tu' : 'su'} torneo</Overline>
          <NoirCard className="py-1">
            <KeyValue label="Mejor resultado" value={details.bestResult} />
            <KeyValue label="Fechas jugadas" value={`${totalCompleted - absences}/${totalCompleted}`} />
            <KeyValue label="Posición promedio" value={avgPosition !== null ? `#${Math.round(avgPosition)}` : '—'} />
            <KeyValue label="Puntos promedio" value={avgPoints !== null ? `${Math.round(avgPoints)} pts` : '—'} last />
          </NoirCard>
        </View>

        {/* ÚLTIMAS FECHAS */}
        {lastThree.length > 0 ? (
          <View className="gap-2">
            <Overline>{isOwn ? 'Tus últimas fechas' : 'Últimas fechas'}</Overline>
            {lastThree.map((gd) => {
              const myElim = gd.eliminations.find((e) => e.eliminatedPlayer.id === playerId);
              const winner = gd.eliminations.find((e) => e.position === 1);
              const participated = !!myElim || winner?.eliminatedPlayer.id === playerId;
              return (
                <NoirCard key={gd.id} className="flex-row items-center gap-3 p-3">
                  <DateBadge n={gd.dateNumber} />
                  <View className="flex-1 flex-row items-center gap-2">
                    {winner ? (
                      <>
                        <PlayerAvatar
                          name={fullName(winner.eliminatedPlayer)}
                          photoUrl={winner.eliminatedPlayer.photoUrl}
                          size={28}
                          playerId={winner.eliminatedPlayer.id}
                          linkToProfile
                        />
                        <Muted className="flex-1">
                          Ganó <Text className="font-inter-semibold text-noir-text">{playerLabel(winner.eliminatedPlayer)}</Text>
                        </Muted>
                      </>
                    ) : null}
                  </View>
                  <View className="items-end">
                    {participated ? (
                      <>
                        <Muted className="text-xs font-inter-semibold">{!myElim || myElim.position === 1 ? '¡GANÓ!' : `#${myElim.position}`}</Muted>
                        <Score value={`${myElim?.points ?? winner?.points ?? ''} pts`} size={14} />
                      </>
                    ) : (
                      <Muted className="text-xs">No participó</Muted>
                    )}
                  </View>
                </NoirCard>
              );
            })}
          </View>
        ) : null}

        {/* FECHAS QUE ELIMINA */}
        {eliminatedDates.length > 0 ? (
          <View className="gap-2">
            <Overline>{isOwn ? 'Fechas que eliminás' : 'Fechas que elimina'}</Overline>
            {eliminatedDates.map((x) => (
              <NoirCard key={x.dateNumber} className="flex-row items-center gap-3 p-3">
                <DateBadge n={x.dateNumber} />
                <Muted className="flex-1">
                  {x.isAbsent ? 'Ausencia' : x.eliminationPosition ? `Posición #${x.eliminationPosition}` : 'Ganador'}
                </Muted>
                <Score value={`−${x.points} pts`} size={14} color={NEGATIVE} />
              </NoirCard>
            ))}
            <NoirCard className="flex-row items-center justify-between p-3">
              <Text className="font-inter-semibold text-sm text-noir-text">Total eliminado</Text>
              <Score value={`−${eliminatedDates.reduce((s, x) => s + x.points, 0)} pts`} size={15} color={NEGATIVE} />
            </NoirCard>
          </View>
        ) : null}

        {/* MULTAS */}
        {multas.length > 0 ? (
          <View className="gap-2">
            <Overline>Multas</Overline>
            {multas.map((m) => (
              <NoirCard key={m.id} className="flex-row items-center gap-3 p-3" style={{ borderColor: `${noir.copper}88` }}>
                <View className="flex-1">
                  <Text className="font-inter-semibold text-sm text-noir-text">{m.reason}</Text>
                  <Muted className="text-xs">
                    {[
                      m.pointsPenalty > 0 ? `-${m.pointsPenalty} pts` : null,
                      m.chipsAmount ? `${m.chipsAmount} fichas` : null,
                      m.moneyAmount ? `$${m.moneyAmount}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Muted>
                </View>
                <Text style={{ color: m.paid ? POSITIVE : noir.danger }} className="font-inter-bold text-xs">
                  {m.paid ? 'PAGADA' : 'PENDIENTE'}
                </Text>
              </NoirCard>
            ))}
          </View>
        ) : null}

        {isOwn ? <NoirButton title="Editar perfil" variant="outline" onPress={() => router.push('/perfil')} /> : null}
      </>
    );
  })();

  return (
    <>
      <Stack.Screen options={{ title }} />
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {body}
      </Screen>
    </>
  );
}

function DateBadge({ n }: { n: number }) {
  return (
    <View className="w-10 items-center">
      <Text className="font-inter text-[10px] uppercase tracking-[1px] text-noir-muted">Fecha</Text>
      <Score value={n} size={16} />
    </View>
  );
}
