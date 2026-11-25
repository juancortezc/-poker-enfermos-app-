/**
 * Home, vista "Última Fecha" del T31 (lucha libre):
 *
 * 1. El cartel "Función estelar": la tarjeta del ganador rotada con la cinta
 *    oro, la frase de la noche (`nightWinnerPhrase`), sus puntos y VER
 *    RESULTADOS. Tocar la tarjeta la abre en grande.
 * 2. El podio de la fecha en pedestales 2-1-3.
 * 3. Los 7/2 de la noche: los dos primeros eliminados (mismo criterio que
 *    /api/stats/date-awards), en rosa.
 * 4. Lo que dejó la noche: Varón, Malazo, noche para olvidar y el más contento.
 * 5. Tu noche y tu lugar en el campeonato (si jugaste).
 */
import { nightWinnerPhrase, playerLabel, shortenFullName, type PlayerRanking } from '@poker/shared';
import { Text, View } from 'react-native';

import { PlayerCard } from '@/components/common/PlayerCard';
import { useGameDateEliminations } from '@/hooks/useTournamentDates';
import { CPButton } from '@/components/ui/CPButton';
import { ErrorState } from '@/components/ui/States';
import { cp, fonts } from '@/theme/colors';
import { useCP } from '@/theme/tone';

import { Tile } from './bento';
import { HERO_CARD_STYLE, useHeroCardWidth, Headline, Marquee, MarqueeOverline, MedalPodium, PhotoTile, Rise, SectionTitle, TilePair } from './lucha';

type Props = {
  userId: string;
  rankings: PlayerRanking[];
  lastCompletedDate: { id: number; dateNumber: number };
  onOpenProfile: () => void;
  onSeeAllResults: () => void;
  onSeeResultsTab: () => void;
};

type Person = { id: string; firstName: string; lastName: string; photoUrl?: string | null; role?: string | null };

export function HomeUltimaFecha({ userId, rankings, lastCompletedDate, onOpenProfile, onSeeAllResults, onSeeResultsTab }: Props) {
  const c = useCP();
  const { data: eliminations, error, mutate } = useGameDateEliminations(lastCompletedDate.id);

  if (error) return <ErrorState error={error} onRetry={() => mutate()} />;
  if (!eliminations || eliminations.length === 0 || rankings.length === 0) {
    return (
      <Tile tone="papel" padding={24}>
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: c.onSurfaceVariant, textAlign: 'center' }}>
          {eliminations ? 'Todavía no hay resultados de la última fecha.' : 'Cargando la última fecha…'}
        </Text>
      </Tile>
    );
  }

  const byId = new Map(rankings.map((r) => [r.playerId, r]));
  const photoOf = (p: { id: string; photoUrl?: string | null }) => p.photoUrl ?? byId.get(p.id)?.playerPhoto ?? undefined;
  // Apodo (primer alias) o nombre corto, como el resto de la app.
  const nick = (p: Person) => byId.get(p.id)?.playerAlias || playerLabel(p);

  const sorted = [...eliminations].sort((a, b) => a.position - b.position);
  const winner = sorted.find((e) => e.position === 1);
  const podium = sorted.filter((e) => e.position <= 3);
  // 7/2: los dos últimos puestos (los dos primeros eliminados), el primero eliminado primero.
  const total = sorted.length;
  const sieteDos = sorted.filter((e) => e.position >= total - 1).sort((a, b) => b.position - a.position);

  // El Varón de la Noche: más eliminaciones (el ganador figura como su propio
  // eliminador en la posición 1; no cuenta).
  const kills = new Map<string, { player: Person; count: number }>();
  sorted.forEach((e) => {
    if (!e.eliminatorPlayer || e.position === 1) return;
    const entry = kills.get(e.eliminatorPlayer.id) ?? { player: e.eliminatorPlayer, count: 0 };
    entry.count += 1;
    kills.set(e.eliminatorPlayer.id, entry);
  });
  const varon = [...kills.values()].sort((a, b) => b.count - a.count)[0];
  const malazo = sorted[sorted.length - 1];

  const fallers = rankings.filter((r) => r.positionsChanged < 0);
  const risers = rankings.filter((r) => r.positionsChanged > 0);
  const olvidar = fallers.length ? fallers.reduce((m, r) => (r.positionsChanged < m.positionsChanged ? r : m)) : null;
  const contento = risers.length ? risers.reduce((m, r) => (r.positionsChanged > m.positionsChanged ? r : m)) : null;


  const insights = [
    varon && {
      key: 'varon',
      tag: 'EL VARÓN',
      color: cp.primary,
      text: cp.onPrimary,
      id: varon.player.id,
      name: nick(varon.player),
      photo: photoOf(varon.player),
      detail: `${varon.count} ${varon.count === 1 ? 'eliminación' : 'eliminaciones'}`,
    },
    malazo && {
      key: 'malazo',
      tag: 'EL MALAZO',
      color: cp.malazo,
      text: cp.ink,
      id: malazo.eliminatedPlayer.id,
      name: nick(malazo.eliminatedPlayer),
      photo: photoOf(malazo.eliminatedPlayer),
      detail: 'primer eliminado',
    },
    olvidar && {
      key: 'olvidar',
      tag: 'PARA OLVIDAR',
      color: cp.negative,
      text: cp.ink,
      id: olvidar.playerId,
      name: olvidar.playerAlias || shortenFullName(olvidar.playerName),
      photo: olvidar.playerPhoto,
      detail: `bajó ${Math.abs(olvidar.positionsChanged)} en el torneo`,
    },
    contento && {
      key: 'contento',
      tag: 'EL MÁS CONTENTO',
      color: cp.positive,
      text: cp.ink,
      id: contento.playerId,
      name: contento.playerAlias || shortenFullName(contento.playerName),
      photo: contento.playerPhoto,
      detail: `subió ${contento.positionsChanged} en el torneo`,
    },
  ].filter((x): x is NonNullable<typeof x> => Boolean(x));
  const insightPairs: (typeof insights)[] = [];
  for (let i = 0; i < insights.length; i += 2) insightPairs.push(insights.slice(i, i + 2));

  let n = 0;

  return (
    <View style={{ gap: 26 }}>
      {/* 1. El cartel */}
      {winner ? (
        <Rise index={n++}>
          <WinnerMarquee
            winner={winner.eliminatedPlayer}
            name={nick(winner.eliminatedPlayer)}
            photoUrl={photoOf(winner.eliminatedPlayer)}
            points={winner.points}
            dateNumber={lastCompletedDate.dateNumber}
            wins={byId.get(winner.eliminatedPlayer.id)?.firstPlaces}
            onSeeResults={onSeeAllResults}
          />
        </Rise>
      ) : null}

      {/* 2. El podio */}
      {podium.length > 0 ? (
        <Rise index={n++} style={{ gap: 14 }}>
          <SectionTitle title="EL PODIO" link="TODOS" onLink={onSeeResultsTab} />
          <MedalPodium
            spots={podium.map((e) => ({ id: e.eliminatedPlayer.id, name: playerLabel(e.eliminatedPlayer), photoUrl: photoOf(e.eliminatedPlayer), points: e.points }))}
          />
        </Rise>
      ) : null}

      {/* 3. Los 7/2 de la noche */}
      {sieteDos.length === 2 ? (
        <Rise index={n++} style={{ gap: 14 }}>
          <SectionTitle title="LOS 7/2 DE LA NOCHE" />
          <TilePair>
            {sieteDos.map((e) => (
              <PhotoTile
                key={e.id}
                playerId={e.eliminatedPlayer.id}
                name={nick(e.eliminatedPlayer)}
                photoUrl={photoOf(e.eliminatedPlayer)}
                role={e.eliminatedPlayer.role}
                tag="7/2"
                tagColor={cp.malazo}
                tagText={cp.ink}
                ringColor={cp.malazo}
                detail={e.position === total ? 'primer eliminado' : 'segundo eliminado'}
              />
            ))}
          </TilePair>
        </Rise>
      ) : null}

      {/* 4. Lo que dejó la noche */}
      {insights.length > 0 ? (
        <Rise index={n++} style={{ gap: 14 }}>
          <SectionTitle title="LO QUE DEJÓ LA NOCHE" />
          {insightPairs.map((pair) => (
            <TilePair key={pair[0].key}>
              {pair.map((card) => (
                <PhotoTile
                  key={card.key}
                  playerId={card.id}
                  name={card.name}
                  photoUrl={card.photo}
                  tag={card.tag}
                  tagColor={card.color}
                  tagText={card.text}
                  detail={card.detail}
                />
              ))}
              {pair.length === 1 ? <View className="flex-1" /> : null}
            </TilePair>
          ))}
        </Rise>
      ) : null}

    </View>
  );
}

function WinnerMarquee({
  winner,
  name,
  photoUrl,
  points,
  dateNumber,
  wins,
  onSeeResults,
}: {
  winner: Person;
  name: string;
  photoUrl?: string | null;
  points: number;
  dateNumber: number;
  wins?: number;
  onSeeResults: () => void;
}) {
  const phrase = nightWinnerPhrase(name, dateNumber, wins);
  // Rótulo, cinta, titular de 2 líneas, fila de puntos y botón, paddings y separaciones.
  const cardWidth = useHeroCardWidth(250);
  return (
    <Marquee pattern="ring">
      <MarqueeOverline icon="★">{`FUNCIÓN ESTELAR · FECHA ${dateNumber}`}</MarqueeOverline>
      <View style={{ alignItems: 'center' }}>
        <PlayerCard
          name={`${winner.firstName} ${winner.lastName}`}
          photoUrl={photoUrl}
          role={winner.role}
          width={cardWidth}
          ringColor={cp.gold}
          ringWidth={3}
          elevate={0}
          zoomable
          accessibilityLabel={`Tarjeta de ${name}, ganador de la fecha ${dateNumber}. Ver en grande`}
          style={HERO_CARD_STYLE(-3)}
        />
        <Ribbon>CAMPEÓN DE LA NOCHE</Ribbon>
      </View>
      <Headline lines={phrase} accent={cp.primaryLight} />
      <View className="w-full flex-row items-center justify-between" style={{ gap: 12 }}>
        <View className="flex-row items-baseline" style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.displayBlack, fontSize: 40, color: cp.gold }}>{points}</Text>
          <Text style={{ fontFamily: fonts.displayBlack, fontSize: 14, letterSpacing: 2, color: cp.onSurfaceMuted }}>
            {points === 1 ? 'PUNTO' : 'PUNTOS'}
          </Text>
        </View>
        <CPButton title="VER RESULTADOS" onPress={onSeeResults} />
      </View>
    </Marquee>
  );
}

/** Cinta oro sobre el pie de la tarjeta. */
function Ribbon({ children }: { children: string }) {
  return (
    <View
      style={{
        marginTop: -34,
        transform: [{ rotate: '-3deg' }],
        backgroundColor: cp.gold,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 5,
        shadowColor: cp.surface0,
        shadowOpacity: 0.5,
        shadowRadius: 7,
        shadowOffset: { width: 0, height: 6 },
        elevation: 14,
      }}>
      <Text style={{ fontFamily: fonts.displayBlack, fontSize: 14, letterSpacing: 3, color: cp.ink }}>{children}</Text>
    </View>
  );
}
