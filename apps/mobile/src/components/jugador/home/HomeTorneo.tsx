/**
 * Home, vista "Torneo" del T31 como cartelera de lucha libre:
 *
 * 1. El campeón a sangre: la foto del líder a borde completo, "dueño del
 *    cinturón", la frase (`leaderPhrase`), el cinturón oro (#1 · T31 · pts) y
 *    mesas finales / podios / victorias. Entra entero en la primera pantalla.
 *    Tocar la foto abre su tarjeta en grande.
 * 2. La cartelera: #1 contra #2 en un póster cortado en diagonal, con
 *    `rivalryPhrase` debajo. Cada lado abre la ficha.
 * 3. Los contendientes: las tarjetas del #2 al #5 en una fila deslizable.
 * 4. Los 7/2 del torneo: los dos últimos de la tabla en el bloque rosa.
 *
 * Con el torneo FINALIZADO, la tarjeta final (podio oficial y "próximo torneo:
 * por anunciar") reemplaza el campeón y la cartelera.
 */
import {
  leaderPhrase,
  nightlyPosition,
  playedDateNumbers,
  rivalryPhrase,
  SCORE_LABELS,
  scoreOf,
  shortenFullName,
  tournamentSieteDos,
  type PlayerRanking,
} from '@poker/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Svg, { ClipPath, Defs, Image as SvgImage, Line, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';

import { photoUri } from '@/components/common/PlayerAvatar';
import { PlayerCard, playerCardSources } from '@/components/common/PlayerCard';
import { PhotoViewer } from '@/components/common/PhotoViewer';
import { alpha, cp, fonts } from '@/theme/colors';
import { ToneView, useCP } from '@/theme/tone';

import { Bento } from './bento';
import { Headline, MEDALS, openPlayer, PhotoFill, Rise, SectionTitle, useHeroAvailableHeight, VsBadge } from './lucha';
import { TorneoFinalizadoCard } from './TorneoFinalizadoCard';

type Props = {
  tournamentNumber: number;
  /** Torneo FINALIZADO: podio final y "por anunciar" en vez del campeón y la cartelera. */
  finished?: boolean;
  rankings: PlayerRanking[];
  /** Número de la última fecha jugada (semilla de la frase del líder). */
  lastDateNumber?: number | null;
  /** Fechas jugadas / planificadas ("FECHA N DE M"). */
  progress?: { completed: number; total: number } | null;
  onSeeTabla: () => void;
};

/** Puesto máximo de una mesa final (como la Tabla). */
const MESA_FINAL_MAX = 9;
/** Padding lateral del Inicio (px-5 en home.tsx). */
const SCREEN_PAD = 20;
/** Alto máximo del bloque del campeón (el del diseño). */
const HERO_MAX = 556;
const HERO_MIN = 420;

const nick = (r: PlayerRanking) => r.playerAlias || shortenFullName(r.playerName);

export function HomeTorneo({ tournamentNumber, finished = false, rankings, lastDateNumber, progress, onSeeTabla }: Props) {
  const sorted = [...rankings].sort((a, b) => a.position - b.position);
  const [leader, second] = sorted;
  const contenders = sorted.slice(1, 5);
  // El 7 (penúltimo) y el 2 (último) de la tabla: misma regla que la web y el reporte.
  const ultimos = tournamentSieteDos(sorted);
  const bottom2 = ultimos ? [ultimos.siete, ultimos.dos] : [];

  let n = 0;

  return (
    <Bento>
      {finished ? <TorneoFinalizadoCard tournamentNumber={tournamentNumber} rankings={rankings} index={n++} /> : null}

      {/* 1. El campeón a sangre */}
      {!finished && leader ? (
        <Rise index={n++}>
          <ChampionHero
            leader={leader}
            rankings={rankings}
            tournamentNumber={tournamentNumber}
            lastDateNumber={lastDateNumber ?? 0}
            progress={progress ?? null}
          />
        </Rise>
      ) : null}

      {/* 2. La cartelera */}
      {!finished && leader && second ? (
        <Rise index={n++} style={{ gap: 12, marginTop: 16 }}>
          <SectionTitle title="LA CARTELERA" />
          <Poster first={leader} second={second} />
          <RivalryLine diff={scoreOf(leader) - scoreOf(second)} />
        </Rise>
      ) : null}

      {/* 3. Los contendientes */}
      {contenders.length > 0 ? (
        <Rise index={n++} style={{ gap: 12, marginTop: 16 }}>
          <SectionTitle title="LOS CONTENDIENTES" link="TABLA" onLink={onSeeTabla} />
          <Contenders players={contenders} />
        </Rise>
      ) : null}

      {/* 4. Los 7/2 del torneo */}
      {bottom2.length === 2 ? (
        <Rise index={n++} style={{ marginTop: 12 }}>
          <SieteDosBlock players={bottom2} />
        </Rise>
      ) : null}
    </Bento>
  );
}

function RivalryLine({ diff }: { diff: number }) {
  const c = useCP();
  return (
    <Text style={{ fontFamily: fonts.displayBlack, fontSize: 22, letterSpacing: 1, color: c.primaryLight, textAlign: 'center' }}>
      {rivalryPhrase(diff)}
    </Text>
  );
}

/** El líder a borde completo, con el cinturón cruzado. */
function ChampionHero({
  leader,
  rankings,
  tournamentNumber,
  lastDateNumber,
  progress,
}: {
  leader: PlayerRanking;
  rankings: PlayerRanking[];
  tournamentNumber: number;
  lastDateNumber: number;
  progress: { completed: number; total: number } | null;
}) {
  const { width } = useWindowDimensions();
  const available = useHeroAvailableHeight();
  const height = Math.round(Math.max(HERO_MIN, Math.min(HERO_MAX, available)));
  const blockWidth = width - SCREEN_PAD * 2;
  const [open, setOpen] = useState(false);

  const name = nick(leader);
  // Líder nuevo: no era #1 antes de esta fecha (subió puestos para llegar).
  const phrase = leaderPhrase(name, lastDateNumber, leader.positionsChanged > 0);
  const mesasFinales = playedDateNumbers(rankings).filter(
    (d) => (leader.pointsByDate[d] ?? 0) > 0 && (nightlyPosition(rankings, d, leader.playerId) ?? 999) <= MESA_FINAL_MAX
  ).length;
  const podios = leader.firstPlaces + leader.secondPlaces + leader.thirdPlaces;
  const stats = [
    { v: mesasFinales, l: mesasFinales === 1 ? 'mesa final' : 'mesas finales' },
    { v: podios, l: podios === 1 ? 'podio' : 'podios' },
    { v: leader.firstPlaces, l: leader.firstPlaces === 1 ? 'victoria' : 'victorias' },
  ];
  // El visor muestra la tarjeta completa (o la foto si no tiene).
  const card = playerCardSources(leader.playerPhoto, null, blockWidth);
  const points = scoreOf(leader);

  return (
    <ToneView tone="dark" style={{ height, borderRadius: 20, overflow: 'hidden', backgroundColor: cp.surface0 }}>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={`${leader.playerName}, líder del torneo. Ver su tarjeta en grande`}
        disabled={!card.full}
        onPress={() => setOpen(true)}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <PhotoFill name={leader.playerName} photoUrl={leader.playerPhoto} width={blockWidth} />
      </Pressable>
      <LinearGradient
        pointerEvents="none"
        colors={[alpha(cp.surface0, 0.55), alpha(cp.surface0, 0), alpha(cp.surface0, 0), alpha(cp.surface0, 0.92)]}
        locations={[0, 0.22, 0.45, 0.78]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <Svg pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%">
        <Defs>
          <RadialGradient id="brilloLider" cx="50%" cy="18%" r="55%">
            <Stop offset="0" stopColor={cp.gold} stopOpacity={0.28} />
            <Stop offset="1" stopColor={cp.gold} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#brilloLider)" />
      </Svg>

      {/* Arriba: la pastilla y la fecha */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text
          style={{
            backgroundColor: cp.gold,
            color: cp.ink,
            fontFamily: fonts.displayBlack,
            fontSize: 12,
            letterSpacing: 2,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 5,
            overflow: 'hidden',
          }}>
          DUEÑO DEL CINTURÓN
        </Text>
        {progress ? (
          <Text style={{ fontFamily: fonts.display, fontSize: 12, letterSpacing: 2, color: cp.onSurface }}>
            FECHA {progress.completed} DE {progress.total}
          </Text>
        ) : null}
      </View>

      {/* Abajo: frase, cinturón y números */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingBottom: 20, alignItems: 'center', gap: 12 }}>
        <Headline lines={phrase} accent={cp.gold} />
        <View
          accessible
          accessibilityLabel={`Primero del torneo ${tournamentNumber} con ${points} puntos`}
          style={{
            width: '100%',
            height: 64,
            borderRadius: 32,
            backgroundColor: cp.gold,
            borderWidth: 4,
            borderColor: cp.goldOnLight,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: 18,
            paddingRight: 18,
            shadowColor: cp.surface0,
            shadowOpacity: 0.6,
            shadowRadius: 11,
            shadowOffset: { width: 0, height: 10 },
            elevation: 10,
          }}>
          <Text style={{ fontFamily: fonts.displayBlack, fontSize: 34, color: cp.ink }}>#1</Text>
          <View style={{ width: 56, height: 44, borderRadius: 8, backgroundColor: cp.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.displayBlack, fontSize: 13, letterSpacing: 1, color: cp.gold }}>T{tournamentNumber}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={{ fontFamily: fonts.displayBlack, fontSize: 34, color: cp.ink }}>{points}</Text>
            <Text style={{ fontFamily: fonts.displayBlack, fontSize: 12, letterSpacing: 1, color: cp.ink }}>{SCORE_LABELS.pointsShort}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 18 }}>
          {stats.map((m) => (
            <Text key={m.l} style={{ fontFamily: fonts.body, fontSize: 13, color: cp.onSurfaceMuted }}>
              <Text style={{ fontFamily: fonts.displayBlack, fontSize: 16, color: cp.onSurface }}>{m.v}</Text> {m.l}
            </Text>
          ))}
        </View>
      </View>

      {card.full ? (
        <PhotoViewer visible={open} uri={card.full} placeholderUri={card.uri} aspect={card.aspect} label={leader.playerName} onClose={() => setOpen(false)} />
      ) : null}
    </ToneView>
  );
}

const POSTER_H = 330;

/**
 * El póster del mano a mano: #1 a la izquierda y #2 a la derecha, cortados en
 * diagonal con ClipPath de SVG (igual en iOS y Android), la franja roja en la
 * costura y el VS encima.
 */
function Poster({ first, second }: { first: PlayerRanking; second: PlayerRanking }) {
  const { width } = useWindowDimensions();
  const W = width - SCREEN_PAD * 2;
  const H = POSTER_H;
  // Cada foto ocupa el 62% del ancho; el corte va del 72% (arriba) al 0% (abajo) de su caja.
  const leftW = W * 0.62;
  const rightX = W - leftW;
  const left = `0,0 ${leftW},0 ${leftW * 0.72},${H} 0,${H}`;
  const right = `${rightX + leftW * 0.28},0 ${W},0 ${W},${H} ${rightX},${H}`;
  const seamTop = (leftW + rightX + leftW * 0.28) / 2;
  const seamBottom = (leftW * 0.72 + rightX) / 2;
  const uri1 = photoUri(first.playerPhoto, null, leftW);
  const uri2 = photoUri(second.playerPhoto, null, leftW);

  const side = (p: PlayerRanking, i: 0 | 1) => (
    <Pressable
      key={p.playerId}
      accessibilityRole="button"
      accessibilityLabel={`${i === 0 ? 'Campeón' : 'Retador'}: ${p.playerName}, número ${p.position} con ${scoreOf(p)} puntos. Ver su ficha`}
      onPress={() => openPlayer(p.playerId)}
      style={{ position: 'absolute', top: 0, bottom: 0, width: '50%', [i === 0 ? 'left' : 'right']: 0 }}
      className="active:opacity-90"
    />
  );

  return (
    <View style={{ height: H, borderRadius: 20, overflow: 'hidden', backgroundColor: cp.surface0 }}>
      <Svg width={W} height={H} pointerEvents="none">
        <Defs>
          <ClipPath id="corteIzq">
            <Polygon points={left} />
          </ClipPath>
          <ClipPath id="corteDer">
            <Polygon points={right} />
          </ClipPath>
        </Defs>
        {uri1 ? (
          <SvgImage href={{ uri: uri1 }} x={0} y={0} width={leftW} height={H} preserveAspectRatio="xMidYMin slice" clipPath="url(#corteIzq)" />
        ) : null}
        {uri2 ? (
          <SvgImage href={{ uri: uri2 }} x={rightX} y={0} width={leftW} height={H} preserveAspectRatio="xMidYMin slice" clipPath="url(#corteDer)" />
        ) : null}
        <Line x1={seamTop} y1={-20} x2={seamBottom} y2={H + 20} stroke={cp.primary} strokeWidth={14} />
      </Svg>
      <LinearGradient
        pointerEvents="none"
        colors={[alpha(cp.surface0, 0), alpha(cp.surface0, 0.9)]}
        locations={[0.55, 1]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <VsBadge size={76} top="42%" ringColor={cp.onSurface} />
      <PosterName p={first} label="#1 CAMPEÓN" color={MEDALS[0]} align="left" />
      <PosterName p={second} label="#2 RETADOR" color={MEDALS[1]} align="right" />
      {side(first, 0)}
      {side(second, 1)}
    </View>
  );
}

function PosterName({ p, label, color, align }: { p: PlayerRanking; label: string; color: string; align: 'left' | 'right' }) {
  const right = align === 'right';
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', bottom: 12, maxWidth: '46%', [right ? 'right' : 'left']: 14, alignItems: right ? 'flex-end' : 'flex-start' }}>
      <Text style={{ fontFamily: fonts.displayBlack, fontSize: 12, letterSpacing: 1.5, color }}>{label}</Text>
      <Text numberOfLines={1} style={{ fontFamily: fonts.displayBlack, fontSize: 22, color: cp.onSurface, textAlign: right ? 'right' : 'left' }}>
        {nick(p)}
      </Text>
      <Text style={{ fontFamily: fonts.displayBlack, fontSize: 30, lineHeight: 32, color: cp.onSurface }}>{scoreOf(p)}</Text>
    </View>
  );
}

const CONTENDER_W = 150;

/** Las tarjetas del #2 al #5, deslizables a lo ancho de la pantalla. */
function Contenders({ players }: { players: PlayerRanking[] }) {
  const c = useCP();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -SCREEN_PAD }}
      contentContainerStyle={{ paddingHorizontal: SCREEN_PAD, paddingTop: 4, paddingBottom: 10, gap: 12 }}>
      {players.map((p) => {
        const ring = p.position === 2 ? cp.silver : p.position === 3 ? cp.bronze : undefined;
        return (
          <Pressable
            key={p.playerId}
            accessibilityRole="button"
            accessibilityLabel={`${p.position}. ${p.playerName}, ${scoreOf(p)} puntos. Ver su ficha`}
            onPress={() => openPlayer(p.playerId)}
            style={{ width: CONTENDER_W, gap: 6 }}
            className="active:opacity-80">
            <View>
              <PlayerCard name={p.playerName} photoUrl={p.playerPhoto} width={CONTENDER_W} ringColor={ring} ringWidth={3} elevate={1} />
              <Text
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 8,
                  bottom: 34,
                  fontFamily: fonts.displayBlackItalic,
                  fontSize: 52,
                  lineHeight: 54,
                  color: cp.onPrimary,
                  textShadowColor: alpha(cp.surface0, 0.7),
                  textShadowOffset: { width: 0, height: 3 },
                  textShadowRadius: 10,
                }}>
                {p.position}
              </Text>
            </View>
            <View className="flex-row items-baseline justify-between" style={{ gap: 6 }}>
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: fonts.bodySemibold, fontSize: 14, color: c.onSurface }}>
                {nick(p)}
              </Text>
              <Text style={{ fontFamily: fonts.displayBlack, fontSize: 18, color: c.onSurface }}>{scoreOf(p)}</Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** El bloque rosa: las tarjetas de los dos últimos, torcidas. */
function SieteDosBlock({ players }: { players: PlayerRanking[] }) {
  return (
    <View style={{ borderRadius: 20, backgroundColor: cp.malazo, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 20, gap: 14 }}>
      <View className="flex-row items-center justify-between" style={{ gap: 8 }}>
        <Text accessibilityRole="header" style={{ fontFamily: fonts.displayBlack, fontSize: 24, letterSpacing: 0.5, color: cp.ink, flexShrink: 1 }}>
          LOS 7/2 DEL TORNEO
        </Text>
        <Text style={{ fontFamily: fonts.displayBlack, fontSize: 12, letterSpacing: 1.5, color: cp.ink }}>ZONA DE CASTIGO</Text>
      </View>
      <View className="flex-row" style={{ gap: 16, paddingHorizontal: 6, paddingTop: 4 }}>
        {players.map((p, i) => (
          <Pressable
            key={p.playerId}
            accessibilityRole="button"
            accessibilityLabel={`${p.position}. ${p.playerName}, ${scoreOf(p)} puntos, en el 7/2. Ver su ficha`}
            onPress={() => openPlayer(p.playerId)}
            className="flex-1 items-center active:opacity-80"
            style={{ gap: 10 }}>
            <PlayerCard
              name={p.playerName}
              photoUrl={p.playerPhoto}
              displayWidth={160}
              ringColor={cp.ink}
              ringWidth={3}
              elevate={0}
              style={{
                transform: [{ rotate: i === 0 ? '-4deg' : '4deg' }],
                shadowColor: cp.ink,
                shadowOpacity: 0.35,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 10 },
                elevation: 8,
              }}
            />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontFamily: fonts.displayBlack, fontSize: 18, color: cp.ink }}>
              #{p.position} {nick(p)} · {scoreOf(p)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
