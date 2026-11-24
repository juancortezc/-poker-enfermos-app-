/**
 * Home, vista "Torneo". Port de HomeTorneo de la web: tu posición, cuenta
 * regresiva y próxima fecha (con "agregar a mi calendario"), el podio con su
 * comparación, malazos 7/2, tu carrera y lo destacado de la temporada.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  averagePointsPerDate,
  nightlyPosition,
  playedDateNumbers,
  playerLabel,
  SCORE_LABELS,
  scoreOf,
  shortenFullName,
  type PlayerRanking,
  type TournamentInsightsData,
} from '@poker/shared';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { LinkCta, MALAZO, NEGATIVE, POSITIVE, Score, SectionHeader, StatRow } from '@/components/jugador/Bits';
import { NoirCard } from '@/components/ui/NoirCard';
import { Muted, Overline, Title } from '@/components/ui/Typography';
import { useDaysWithoutVictory } from '@/hooks/useHomeExtras';
import { daysUntil } from '@/lib/dates';
import { fonts, noir } from '@/theme/colors';

import { MalazosCard, PodiumRow } from './shared';

type Props = {
  userId: string;
  tournamentId: number;
  tournamentNumber: number;
  rankings: PlayerRanking[];
  nextDate: { dateNumber?: number; scheduledDate: string | null } | null;
  seasonHighlights?: TournamentInsightsData['seasonHighlights'];
  onOpenProfile: () => void;
  onOpenCalendarPage: () => void;
  onAddToPersonalCalendar: () => void;
  onSeeTabla: () => void;
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('es-EC', { day: 'numeric', month: 'long' });
}


const CICLO = 14;
const R = 30;
const CIRC = 2 * Math.PI * R;

export function HomeTorneo({
  userId,
  tournamentId,
  tournamentNumber,
  rankings,
  nextDate,
  seasonHighlights,
  onOpenProfile,
  onOpenCalendarPage,
  onAddToPersonalCalendar,
  onSeeTabla,
}: Props) {
  const { data: drought } = useDaysWithoutVictory(tournamentId);
  const [abierto, setAbierto] = useState<string | null>(null);

  const droughtLeader = drought?.players.find((p) => !p.hasNeverWon);
  const myRanking = rankings.find((r) => r.playerId === userId);
  const leaderScore = rankings.length ? scoreOf(rankings[0]) : 0;
  const gapToLeader = myRanking ? leaderScore - scoreOf(myRanking) : null;

  const sortedByPosition = [...rankings].sort((a, b) => a.position - b.position);
  const penultimate = sortedByPosition.length >= 2 ? sortedByPosition[sortedByPosition.length - 2] : null;
  const isNearBottom = myRanking && penultimate ? myRanking.position >= penultimate.position : false;
  const gapToMalazos = myRanking && penultimate && !isNearBottom ? scoreOf(myRanking) - scoreOf(penultimate) : null;

  const playedDates = playedDateNumbers(rankings);
  const avgPointsPerDate = myRanking ? averagePointsPerDate(myRanking) : null;
  const myPlayedDates = myRanking ? playedDates.filter((d) => (myRanking.pointsByDate[d] ?? 0) > 0) : [];
  const avgNightly =
    myRanking && myPlayedDates.length > 0
      ? myPlayedDates.reduce((s, d) => s + (nightlyPosition(rankings, d, myRanking.playerId) ?? 0), 0) / myPlayedDates.length
      : null;
  const last3 = myRanking ? playedDates.slice(-3).reduce((acc, d) => acc + (myRanking.pointsByDate[d] ?? 0), 0) : null;

  const formattedDate = formatDate(nextDate?.scheduledDate ?? null);
  const days = daysUntil(nextDate?.scheduledDate ?? null);
  const avance = days !== null ? Math.max(0, Math.min(1, 1 - days / CICLO)) : 0;

  const podio = sortedByPosition.slice(0, 3);
  const abiertoP = podio.find((p) => p.playerId === abierto);

  const highlights: { key: string; icon: React.ReactNode; text: React.ReactNode }[] = [];
  if (droughtLeader)
    highlights.push({
      key: 'drought',
      icon: <Ionicons name="time-outline" size={16} color={noir.gold} />,
      text: (
        <>
          {playerLabel(droughtLeader)} lleva <Text className="font-inter-bold text-noir-gold">{droughtLeader.daysWithoutVictory} días</Text> sin
          ganar una fecha
        </>
      ),
    });
  if (seasonHighlights?.longestTop3Streak)
    highlights.push({
      key: 'top3',
      icon: <Text style={{ fontSize: 15 }}>🔥</Text>,
      text: (
        <>
          {shortenFullName(seasonHighlights.longestTop3Streak.playerName)} lleva{' '}
          <Text style={{ color: POSITIVE }} className="font-inter-bold">
            {seasonHighlights.longestTop3Streak.streakLength} fechas seguidas
          </Text>{' '}
          en el Top 3
        </>
      ),
    });
  if (seasonHighlights?.biggestJump)
    highlights.push({
      key: 'jump',
      icon: <Ionicons name="trophy-outline" size={16} color={noir.gold} />,
      text: (
        <>
          La racha más grande de la temporada:{' '}
          <Text className="font-inter-bold text-noir-gold">+{seasonHighlights.biggestJump.positionsChanged} posiciones</Text> (
          {shortenFullName(seasonHighlights.biggestJump.playerName)}, Fecha {seasonHighlights.biggestJump.dateNumber})
        </>
      ),
    });

  return (
    <View className="gap-4">
      {/* Tu posición */}
      {myRanking ? (
        <NoirCard accent className="gap-3">
          <Overline>{shortenFullName(myRanking.playerName)}, estás</Overline>
          <View className="flex-row items-start gap-4">
            <View className="flex-row items-start">
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 30, color: noir.copper, lineHeight: 40 }}>#</Text>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 72, color: noir.text, lineHeight: 78 }}>{myRanking.position}</Text>
            </View>
            <View className="gap-1 pt-3">
              <View className="flex-row items-baseline gap-2">
                <Score value={scoreOf(myRanking)} size={26} color={noir.gold} />
                <Muted className="text-xs">{SCORE_LABELS.points}</Muted>
              </View>
              <Muted>
                {SCORE_LABELS.accumulatedLong} <Text style={{ color: NEGATIVE }} className="font-inter-bold">{myRanking.totalPoints}</Text>
              </Muted>
            </View>
          </View>
          <View className="border-t border-noir-border pt-3">
            <StatRow
              valueSize={17}
              items={[
                {
                  value: myRanking.positionsChanged > 0 ? `+${myRanking.positionsChanged}` : myRanking.positionsChanged,
                  label: 'última fecha',
                  color: myRanking.positionsChanged > 0 ? POSITIVE : myRanking.positionsChanged < 0 ? NEGATIVE : undefined,
                },
                { value: avgNightly !== null ? `#${Math.round(avgNightly)}` : '—', label: 'puesto prom.' },
                { value: avgPointsPerDate !== null ? Math.round(avgPointsPerDate) : '—', label: 'prom./fecha' },
                { value: last3 ?? '—', label: 'últimas 3' },
              ]}
            />
          </View>
        </NoirCard>
      ) : null}

      {/* Anillo + próxima fecha */}
      {formattedDate ? (
        <View className="flex-row gap-3">
          <NoirCard className="flex-1 items-center justify-center gap-2 p-4">
            <View style={{ width: 72, height: 72 }}>
              <Svg width={72} height={72} viewBox="0 0 72 72" style={{ transform: [{ rotate: '-90deg' }] }}>
                <Circle cx={36} cy={36} r={R} fill="none" stroke={noir.raised} strokeWidth={6} />
                <Circle
                  cx={36}
                  cy={36}
                  r={R}
                  fill="none"
                  stroke={noir.gold}
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={CIRC * (1 - avance)}
                />
              </Svg>
              <View className="absolute inset-0 items-center justify-center">
                <Score value={days ?? '—'} size={24} />
                <Text className="font-inter text-[9px] tracking-[1px] text-noir-muted">DÍAS</Text>
              </View>
            </View>
            <Overline className="text-center text-[10px]">para la fecha</Overline>
          </NoirCard>
          <NoirCard className="flex-1 justify-between gap-2 p-4">
            <View>
              <Overline>Próxima</Overline>
              <Title className="text-xl leading-tight">{formattedDate}</Title>
              <Muted className="text-xs">Fecha {nextDate?.dateNumber ?? '—'}</Muted>
            </View>
            <View className="flex-row items-center gap-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Agregar a mi calendario"
                onPress={onAddToPersonalCalendar}
                className="h-11 w-11 items-center justify-center rounded-full border border-noir-border bg-noir-raised active:opacity-70">
                <Ionicons name="calendar-outline" size={18} color={noir.muted} />
              </Pressable>
              <LinkCta title={`T${tournamentNumber}`} onPress={onOpenCalendarPage} />
            </View>
          </NoirCard>
        </View>
      ) : null}

      {/* Podio */}
      {podio.length === 3 ? (
        <NoirCard className="gap-3">
          <SectionHeader title="El podio" action="Tabla" onAction={onSeeTabla} />
          <PodiumRow podium={podio} selectedId={abierto} onPressName={(id) => setAbierto(abierto === id ? null : id)} />
          {abiertoP ? (
            <View className="border-t border-noir-border pt-3">
              <StatRow
                valueSize={16}
                items={[
                  { value: abiertoP.firstPlaces, label: 'victorias' },
                  { value: abiertoP.firstPlaces + abiertoP.secondPlaces + abiertoP.thirdPlaces, label: 'podios' },
                  { value: abiertoP.totalPoints, label: 'acum.' },
                  (() => {
                    const v = scoreOf(abiertoP) - (myRanking ? scoreOf(myRanking) : 0);
                    return { value: v > 0 ? `+${v}` : v, label: 'vs vos', color: v > 0 ? NEGATIVE : POSITIVE };
                  })(),
                ]}
              />
            </View>
          ) : null}
        </NoirCard>
      ) : null}

      <MalazosCard rankings={rankings} />

      {/* Tu carrera */}
      {myRanking ? (
        <NoirCard className="gap-3">
          <Overline>Tu carrera</Overline>
          <Meter
            label="Hacia el líder"
            value={leaderScore > 0 ? scoreOf(myRanking) / leaderScore : 0}
            right={`−${gapToLeader ?? 0}`}
            color={noir.gold}
          />
          {gapToMalazos !== null ? (
            <Meter
              label="Colchón sobre el 7/2"
              value={Math.max(0, Math.min(1, gapToMalazos / Math.max(leaderScore, 1)))}
              right={String(gapToMalazos)}
              color={MALAZO}
            />
          ) : null}
          <LinkCta title="Ver mi torneo" onPress={onOpenProfile} />
        </NoirCard>
      ) : null}

      {/* De la temporada */}
      {highlights.length > 0 ? (
        <NoirCard className="gap-1">
          <Overline>De la temporada</Overline>
          {highlights.map((h, k) => (
            <View key={h.key} className={`flex-row items-center gap-3 py-2 ${k > 0 ? 'border-t border-noir-border' : ''}`}>
              {h.icon}
              <Text className="flex-1 font-inter text-sm leading-snug text-noir-muted">{h.text}</Text>
            </View>
          ))}
        </NoirCard>
      ) : null}
    </View>
  );
}

function Meter({ label, value, right, color }: { label: string; value: number; right: string; color: string }) {
  return (
    <View className="gap-1">
      <View className="flex-row items-baseline justify-between">
        <Muted>{label}</Muted>
        <Score value={right} size={15} color={color === MALAZO ? MALAZO : noir.text} />
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-noir-raised">
        <View style={{ width: `${Math.round(value * 100)}%`, backgroundColor: color }} className="h-full rounded-full" />
      </View>
    </View>
  );
}
