/**
 * Home, vista "Torneo" del T31 (lucha libre):
 *
 * 1. Dueño del cinturón: la tarjeta del líder rotada, el cinturón oro con sus
 *    puntos, la frase (`leaderPhrase`) y mesas finales / podios / victorias.
 * 2. Mano a mano: #1 contra #2 y la distancia (`rivalryPhrase`).
 * 3. La tabla: el top 3 y el enlace a la completa.
 * 4. Los 7/2 del torneo: los dos últimos de la tabla, en rosa.
 * 5. Lo de antes, debajo: tu posición, la próxima fecha, tu carrera y lo
 *    destacado de la temporada.
 *
 * Con el torneo FINALIZADO, la tarjeta final (podio oficial y "próximo torneo:
 * por anunciar") reemplaza el cinturón, el mano a mano y la cuenta regresiva.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  averagePointsPerDate,
  leaderPhrase,
  nightlyPosition,
  playedDateNumbers,
  playerLabel,
  rivalryPhrase,
  SCORE_LABELS,
  scoreOf,
  shortenFullName,
  type PlayerRanking,
  type TournamentInsightsData,
} from '@poker/shared';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { PlayerCard } from '@/components/common/PlayerCard';
import { useDaysWithoutVictory } from '@/hooks/useHomeExtras';
import { daysUntil } from '@/lib/dates';
import { cp, fonts } from '@/theme/colors';
import { useCP } from '@/theme/tone';

import { Bento, BigScore, HashScore, ON_COLOR, Tile, TileLink, TileOverline, TileRow, useReduceMotion } from './bento';
import { HERO_CARD_STYLE, Headline, useHeroCardWidth, Marquee, MarqueeOverline, MEDALS, openPlayer, PhotoTile, Rise, SectionTitle, TilePair, VsBadge } from './lucha';
import { TorneoFinalizadoCard } from './TorneoFinalizadoCard';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  userId: string;
  tournamentId: number;
  tournamentNumber: number;
  /** Torneo FINALIZADO: podio final y "por anunciar" en vez de cuenta regresiva y calendario. */
  finished?: boolean;
  rankings: PlayerRanking[];
  nextDate: { dateNumber?: number; scheduledDate: string | null } | null;
  /** Número de la última fecha jugada (semilla de la frase del líder). */
  lastDateNumber?: number | null;
  /** Fechas jugadas / planificadas ("FECHA N DE M"). */
  progress?: { completed: number; total: number } | null;
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
/** Puesto máximo de una mesa final (como la Tabla). */
const MESA_FINAL_MAX = 9;
const R = 30;
const CIRC = 2 * Math.PI * R;

export function HomeTorneo({
  userId,
  tournamentId,
  tournamentNumber,
  finished = false,
  rankings,
  nextDate,
  lastDateNumber,
  progress,
  seasonHighlights,
  onOpenProfile,
  onOpenCalendarPage,
  onAddToPersonalCalendar,
  onSeeTabla,
}: Props) {
  const c = useCP();
  const { data: drought } = useDaysWithoutVictory(tournamentId);

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

  const formattedDate = finished ? null : formatDate(nextDate?.scheduledDate ?? null);
  const days = daysUntil(nextDate?.scheduledDate ?? null);
  const avance = days !== null ? Math.max(0, Math.min(1, 1 - days / CICLO)) : 0;

  const top3 = sortedByPosition.slice(0, 3);
  const [leader, second] = sortedByPosition;
  const bottom2 = sortedByPosition.length >= 4 ? sortedByPosition.slice(-2) : [];
  const nick = (r: PlayerRanking) => r.playerAlias || shortenFullName(r.playerName);

  const highlights: { key: string; icon: React.ReactNode; text: React.ReactNode }[] = [];
  if (droughtLeader)
    highlights.push({
      key: 'drought',
      icon: <Ionicons name="time-outline" size={16} color={c.primaryLight} />,
      text: (
        <>
          {playerLabel(droughtLeader)} lleva <Text style={{ fontFamily: fonts.bodyBold, color: c.primaryLight }}>{droughtLeader.daysWithoutVictory} días</Text> sin
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
          <Text style={{ fontFamily: fonts.bodyBold, color: c.positive }}>
            {seasonHighlights.longestTop3Streak.streakLength} fechas seguidas
          </Text>{' '}
          en el Top 3
        </>
      ),
    });
  if (seasonHighlights?.biggestJump)
    highlights.push({
      key: 'jump',
      icon: <Ionicons name="trophy-outline" size={16} color={c.gold} />,
      text: (
        <>
          La racha más grande de la temporada:{' '}
          <Text style={{ fontFamily: fonts.bodyBold, color: c.gold }}>+{seasonHighlights.biggestJump.positionsChanged} posiciones</Text> (
          {shortenFullName(seasonHighlights.biggestJump.playerName)}, Fecha {seasonHighlights.biggestJump.dateNumber})
        </>
      ),
    });

  let n = 0;
  const signedColor = (v: number) => (v < 0 ? '#FF9E5E' : v > 0 ? '#6ECB71' : '#FFFFFF');

  return (
    <Bento>
      {finished ? <TorneoFinalizadoCard tournamentNumber={tournamentNumber} rankings={rankings} index={n++} /> : null}

      {/* 1. Dueño del cinturón */}
      {!finished && leader ? (
        <Rise index={n++}>
          <BeltMarquee leader={leader} rankings={rankings} name={nick(leader)} lastDateNumber={lastDateNumber ?? 0} progress={progress ?? null} />
        </Rise>
      ) : null}

      {/* 2. Mano a mano */}
      {!finished && leader && second ? (
        <Rise index={n++} style={{ gap: 14, marginTop: 12 }}>
          <SectionTitle title="MANO A MANO" />
          <View>
            <TilePair style={{ gap: 10 }}>
              {[leader, second].map((p, i) => (
                <PhotoTile
                  key={p.playerId}
                  playerId={p.playerId}
                  name={nick(p)}
                  photoUrl={p.playerPhoto}
                  top={`#${p.position}`}
                  topColor={MEDALS[i]}
                  big={scoreOf(p)}
                  align={i === 0 ? 'left' : 'right'}
                />
              ))}
            </TilePair>
            <VsBadge />
          </View>
          <Text style={{ fontFamily: fonts.displayBlack, fontSize: 22, letterSpacing: 1, color: c.primaryLight, textAlign: 'center' }}>
            {rivalryPhrase(scoreOf(leader) - scoreOf(second))}
          </Text>
        </Rise>
      ) : null}

      {/* 3. La tabla: top 3 */}
      {top3.length > 0 ? (
        <Rise index={n++} style={{ gap: 10, marginTop: 12 }}>
          <SectionTitle title="LA TABLA" link="COMPLETA" onLink={onSeeTabla} />
          <View className="overflow-hidden rounded-card border border-cp-surface-border bg-cp-surface-1">
            {top3.map((p, i) => (
              <Pressable
                key={p.playerId}
                accessibilityRole="button"
                accessibilityLabel={`${p.position}. ${p.playerName}, ${scoreOf(p)} puntos. Ver su ficha`}
                onPress={() => openPlayer(p.playerId)}
                className="flex-row items-center active:opacity-70"
                style={{ gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.surface2 }}>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: MEDALS[i], alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontFamily: fonts.displayBlack, fontSize: 14, color: cp.ink }}>{p.position}</Text>
                </View>
                <PlayerAvatar name={p.playerName} photoUrl={p.playerPhoto} size={56} />
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} style={{ fontFamily: fonts.bodySemibold, fontSize: 16, color: c.onSurface }}>
                    {p.playerName}
                  </Text>
                  {p.playerAlias ? (
                    <Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 13, color: c.onSurfaceVariant }}>
                      {p.playerAlias}
                    </Text>
                  ) : null}
                </View>
                <Text style={{ fontFamily: fonts.displayBlack, fontSize: 22, color: c.onSurface }}>{scoreOf(p)}</Text>
              </Pressable>
            ))}
          </View>
        </Rise>
      ) : null}

      {/* 4. Los 7/2 del torneo */}
      {bottom2.length === 2 ? (
        <Rise index={n++} style={{ gap: 14, marginTop: 12 }}>
          <SectionTitle title="LOS 7/2 DEL TORNEO" />
          <TilePair>
            {bottom2.map((p) => (
              <PhotoTile
                key={p.playerId}
                playerId={p.playerId}
                name={nick(p)}
                photoUrl={p.playerPhoto}
                tag="7/2"
                tagColor={cp.malazo}
                tagText={cp.ink}
                ringColor={cp.malazo}
                detail={`#${p.position} · ${scoreOf(p)} ${SCORE_LABELS.pointsShort}`}
              />
            ))}
          </TilePair>
        </Rise>
      ) : null}

      <View style={{ height: 12 }} />

      {/* Tu posición — el ancla negra */}
      {myRanking ? (
        <Tile tone="negro" index={n++}>
          <Text
            aria-hidden
            style={{ position: 'absolute', right: -14, top: -34, fontFamily: fonts.display, fontSize: 150, lineHeight: 160, color: 'rgba(255,255,255,0.05)' }}>
            {myRanking.position}
          </Text>
          <TileOverline color={ON_COLOR.faint}>{shortenFullName(myRanking.playerName)}, estás</TileOverline>
          <View className="mt-1 flex-row items-start" style={{ gap: 14 }}>
            <HashScore value={myRanking.position} size={84} color="#FFFFFF" hashColor="#FF5A56" />
            <View style={{ gap: 4, paddingTop: 12 }}>
              <View className="flex-row items-baseline" style={{ gap: 5 }}>
                <BigScore value={scoreOf(myRanking)} size={28} color="#FFFFFF" />
                <TileOverline color={ON_COLOR.faint}>{SCORE_LABELS.points}</TileOverline>
              </View>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                {SCORE_LABELS.accumulatedLong}{' '}
                <Text style={{ fontFamily: fonts.bodyBold, color: '#FF9E5E' }}>{myRanking.totalPoints}</Text>
              </Text>
            </View>
          </View>
          <View className="mt-3 flex-row pt-3" style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.14)' }}>
            {[
              { v: myRanking.positionsChanged, l: 'última fecha', signed: true },
              { v: avgNightly !== null ? Math.round(avgNightly) : null, l: 'puesto prom.', prefix: '#' },
              { v: avgPointsPerDate !== null ? Math.round(avgPointsPerDate) : null, l: 'prom./fecha' },
              { v: last3, l: 'últimas 3' },
            ].map((m, k) => (
              <View
                key={m.l}
                className="min-w-0 flex-1"
                style={{ paddingLeft: k ? 10 : 0, borderLeftWidth: k ? 1 : 0, borderLeftColor: 'rgba(255,255,255,0.14)' }}>
                <Text
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 19,
                    letterSpacing: -0.5,
                    color: m.signed && typeof m.v === 'number' ? signedColor(m.v) : '#FFFFFF',
                  }}>
                  {m.v === null ? '—' : `${m.prefix ?? ''}${m.signed && m.v > 0 ? '+' : ''}${m.v}`}
                </Text>
                <Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 11.5, color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>
                  {m.l}
                </Text>
              </View>
            ))}
          </View>
        </Tile>
      ) : null}

      {/* El anillo + la fecha: dos bloques chicos */}
      {formattedDate ? (
        <TileRow>
          <Tile tone="papel" span={1} index={n++}>
            <View className="flex-1 items-center justify-center" style={{ gap: 6 }}>
              <Ring avance={avance} days={days} />
              <TileOverline style={{ textAlign: 'center' }}>para la fecha</TileOverline>
            </View>
          </Tile>
          <Tile tone="papel" span={1} index={n++}>
            <TileOverline>Próxima</TileOverline>
            <Text style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 25, color: c.onSurface, marginTop: 3, letterSpacing: -0.4 }}>
              {formattedDate}
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: c.onSurfaceMuted, marginTop: 3 }}>
              Fecha {nextDate?.dateNumber ?? '—'}
            </Text>
            <View className="mt-auto flex-row items-center pt-3" style={{ gap: 12 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Agregar a mi calendario"
                onPress={onAddToPersonalCalendar}
                hitSlop={5}
                className="h-[38px] w-[38px] items-center justify-center rounded-full border border-cp-surface-border bg-cp-surface-2 active:opacity-70">
                <Ionicons name="calendar-outline" size={17} color={c.onSurfaceMuted} />
              </Pressable>
              <TileLink title={`T${tournamentNumber}`} onPress={onOpenCalendarPage} />
            </View>
          </Tile>
        </TileRow>
      ) : null}

      {/* Tu carrera */}
      {myRanking ? (
        <Tile tone="papel" index={n++} style={{}}>
          <TileOverline>Tu carrera</TileOverline>
          <View style={{ gap: 13, marginTop: 12 }}>
            <Meter
              label="Hacia el líder"
              value={leaderScore > 0 ? scoreOf(myRanking) / leaderScore : 0}
              right={`−${gapToLeader ?? 0}`}
              color={c.primary}
              rightColor={c.onSurface}
            />
            {gapToMalazos !== null ? (
              <Meter
                label="Colchón sobre el 7/2"
                value={Math.max(0, Math.min(1, gapToMalazos / Math.max(leaderScore, 1)))}
                right={String(gapToMalazos)}
                color={c.malazo}
                rightColor={c.malazoText}
              />
            ) : null}
            <TileLink title="VER MI TORNEO" onPress={onOpenProfile} />
          </View>
        </Tile>
      ) : null}

      {/* De la temporada */}
      {highlights.length > 0 ? (
        <Tile tone="papel" index={n++} padding={16}>
          <TileOverline>De la temporada</TileOverline>
          <View className="mt-1">
            {highlights.map((h, k) => (
              <View
                key={h.key}
                className="flex-row items-center py-2.5"
                style={{ gap: 10, borderTopWidth: k ? 1 : 0, borderTopColor: c.surfaceBorder }}>
                {h.icon}
                <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 13.5, lineHeight: 19, color: c.onSurfaceMuted }}>{h.text}</Text>
              </View>
            ))}
          </View>
        </Tile>
      ) : null}
    </Bento>
  );
}

/** El anillo de cuenta regresiva: se dibuja al aparecer. */
function Ring({ avance, days }: { avance: number; days: number | null }) {
  const c = useCP();
  const reduce = useReduceMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduce === null) return;
    p.value = reduce ? avance : withTiming(avance, { duration: 900, easing: Easing.bezier(0.22, 1, 0.36, 1) });
  }, [avance, reduce, p]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: CIRC * (1 - p.value) }));
  return (
    <View style={{ width: 76, height: 76 }}>
      <Svg width={76} height={76} viewBox="0 0 72 72" style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={36} cy={36} r={R} fill="none" stroke={c.surface3} strokeWidth={6} />
        <AnimatedCircle
          cx={36}
          cy={36}
          r={R}
          fill="none"
          stroke={c.primary}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          animatedProps={animatedProps}
        />
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <Text style={{ fontFamily: fonts.display, fontSize: 27, lineHeight: 29, color: c.onSurface, letterSpacing: -0.8 }}>{days ?? '—'}</Text>
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 9.5, letterSpacing: 1, color: c.onSurfaceVariant }}>DÍAS</Text>
      </View>
    </View>
  );
}

function Meter({ label, value, right, color, rightColor }: { label: string; value: number; right: string; color: string; rightColor: string }) {
  const c = useCP();
  return (
    <View style={{ gap: 5 }}>
      <View className="flex-row items-baseline justify-between">
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: c.onSurfaceMuted }}>{label}</Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 16, color: rightColor, letterSpacing: -0.4 }}>{right}</Text>
      </View>
      <View style={{ height: 8, borderRadius: 8, backgroundColor: c.surface3, overflow: 'hidden' }}>
        <View style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`, height: '100%', borderRadius: 8, backgroundColor: color }} />
      </View>
    </View>
  );
}

/** El cartel del líder: tarjeta rotada, cinturón oro, frase y sus números. */
function BeltMarquee({
  leader,
  rankings,
  name,
  lastDateNumber,
  progress,
}: {
  leader: PlayerRanking;
  rankings: PlayerRanking[];
  name: string;
  lastDateNumber: number;
  progress: { completed: number; total: number } | null;
}) {
  // Líder nuevo: no era #1 antes de esta fecha (subió puestos para llegar).
  const phrase = leaderPhrase(name, lastDateNumber, leader.positionsChanged > 0);
  const mesasFinales = playedDateNumbers(rankings).filter(
    (d) => (leader.pointsByDate[d] ?? 0) > 0 && (nightlyPosition(rankings, d, leader.playerId) ?? 999) <= MESA_FINAL_MAX
  ).length;
  const podios = leader.firstPlaces + leader.secondPlaces + leader.thirdPlaces;
  const stats = [
    { v: mesasFinales, l: mesasFinales === 1 ? 'MESA FINAL' : 'MESAS FINALES' },
    { v: podios, l: podios === 1 ? 'PODIO' : 'PODIOS' },
    { v: leader.firstPlaces, l: leader.firstPlaces === 1 ? 'VICTORIA' : 'VICTORIAS' },
  ];
  // Rótulo, cinturón, titular de 2 líneas, fila de números, paddings y separaciones.
  const cardWidth = useHeroCardWidth(290);
  return (
    <Marquee pattern="glow">
      <MarqueeOverline icon="👑">
        {progress ? `DUEÑO DEL CINTURÓN · FECHA ${progress.completed} DE ${progress.total}` : 'DUEÑO DEL CINTURÓN'}
      </MarqueeOverline>
      <View style={{ alignItems: 'center' }}>
        <PlayerCard
          name={leader.playerName}
          photoUrl={leader.playerPhoto}
          width={cardWidth}
          ringColor={cp.gold}
          ringWidth={3}
          elevate={0}
          zoomable
          accessibilityLabel={`Tarjeta de ${name}, líder del torneo. Ver en grande`}
          style={HERO_CARD_STYLE(3)}
        />
        <View
          accessible
          accessibilityLabel={`Primero con ${scoreOf(leader)} puntos`}
          style={{
            marginTop: -30,
            minWidth: 260,
            maxWidth: '100%',
            height: 54,
            paddingHorizontal: 24,
            borderRadius: 27,
            backgroundColor: cp.gold,
            borderWidth: 3,
            borderColor: cp.goldOnLight,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: cp.surface0,
            shadowOpacity: 0.55,
            shadowRadius: 9,
            shadowOffset: { width: 0, height: 8 },
            elevation: 14,
          }}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontFamily: fonts.displayBlack, fontSize: 30, letterSpacing: 1, color: cp.ink }}>
            #1 · {scoreOf(leader)} {SCORE_LABELS.pointsShort.toUpperCase()}
          </Text>
        </View>
      </View>
      <Headline lines={phrase} accent={cp.gold} />
      <View className="w-full flex-row pt-3.5" style={{ borderTopWidth: 1, borderTopColor: cp.surfaceBorder }}>
        {stats.map((m, k) => (
          <View
            key={m.l}
            className="flex-1 items-center"
            style={{ gap: 2, borderLeftWidth: k ? 1 : 0, borderLeftColor: cp.surfaceBorder }}>
            <Text style={{ fontFamily: fonts.displayBlack, fontSize: 26, color: cp.onSurface }}>{m.v}</Text>
            <Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 12, letterSpacing: 1, color: cp.onSurfaceMuted }}>
              {m.l}
            </Text>
          </View>
        ))}
      </View>
    </Marquee>
  );
}
