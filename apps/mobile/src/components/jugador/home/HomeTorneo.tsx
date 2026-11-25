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
import {
  leaderPhrase,
  nightlyPosition,
  playedDateNumbers,
  rivalryPhrase,
  SCORE_LABELS,
  scoreOf,
  shortenFullName,
  type PlayerRanking,
} from '@poker/shared';
import { Pressable, Text, View } from 'react-native';

import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { PlayerCard } from '@/components/common/PlayerCard';
import { cp, fonts } from '@/theme/colors';
import { useCP } from '@/theme/tone';

import { Bento } from './bento';
import { HERO_CARD_STYLE, Headline, useHeroCardWidth, Marquee, MarqueeOverline, MEDALS, openPlayer, PhotoTile, Rise, SectionTitle, TilePair, VsBadge } from './lucha';
import { TorneoFinalizadoCard } from './TorneoFinalizadoCard';

type Props = {
  tournamentNumber: number;
  /** Torneo FINALIZADO: podio final y "por anunciar" en vez de cuenta regresiva y calendario. */
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

export function HomeTorneo({
  tournamentNumber,
  finished = false,
  rankings,
  lastDateNumber,
  progress,
  onSeeTabla,
}: Props) {
  const c = useCP();
  const sortedByPosition = [...rankings].sort((a, b) => a.position - b.position);
  const top3 = sortedByPosition.slice(0, 3);
  const [leader, second] = sortedByPosition;
  const bottom2 = sortedByPosition.length >= 4 ? sortedByPosition.slice(-2) : [];
  const nick = (r: PlayerRanking) => r.playerAlias || shortenFullName(r.playerName);

  let n = 0;

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

    </Bento>
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
