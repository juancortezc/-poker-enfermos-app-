/**
 * Tabla ELIMINA del torneo. Port de CPRankingView de la web:
 *
 * - Tarjeta del líder y del #2/#3.
 * - Una sola tabla con cuatro niveles de detalle (Resumen · Fechas · Elimina ·
 *   ACUM.). Todas ordenan por PUNTOS salvo ACUM., que es una lectura paralela
 *   por el total sin descartar nada.
 * - Proyección en vivo en ámbar y cursiva mientras hay una fecha en curso.
 * - Tocar una fila (o una tarjeta) abre el perfil del jugador.
 * - El CSV se comparte con la hoja del sistema en vez de descargarse.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  averagePointsPerDate,
  buildCsv,
  compareByTiebreak,
  eliminatedDateNumbers,
  nightlyPosition,
  playedDateNumbers,
  SCORE_LABELS,
  scoreOf,
  shortenFullName,
  type PlayerRanking,
  type TournamentRankingData,
} from '@poker/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View, type TextStyle } from 'react-native';

import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { Delta, MEDAL, NEGATIVE, PROJECTED, Score, StatRow } from '@/components/jugador/Bits';
import { Segmented } from '@/components/jugador/Segmented';
import { NoirCard } from '@/components/ui/NoirCard';
import { Muted, Overline } from '@/components/ui/Typography';
import { shareTextFile } from '@/lib/share-file';
import { fonts, noir } from '@/theme/colors';

type TableView = 'resumen' | 'fechas' | 'elimina' | 'acum';

const VIEWS: { id: TableView; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'fechas', label: 'Fechas' },
  { id: 'elimina', label: 'Elimina' },
  { id: 'acum', label: SCORE_LABELS.accumulated },
];

const MESA_FINAL_THRESHOLD = 9;
const INACTIVE = `${noir.muted}66`;
const ROW_ME = 'rgba(169,68,28,0.55)'; // cobre: tu fila
const ROW_MALAZO = 'rgba(236,72,153,0.10)';
const ROW_ZEBRA = 'rgba(243,230,197,0.03)';

const W = { pos: 38, points: 58, date: 40, small: 46 };

const goToPlayer = (playerId: string) => router.push({ pathname: '/players/[id]', params: { id: playerId } });

type Props = {
  data: TournamentRankingData;
  tournamentNumber: number;
  currentUserId?: string | null;
};

export function RankingView({ data, tournamentNumber, currentUserId }: Props) {
  const [view, setView] = useState<TableView>('resumen');
  const [tableWidth, setTableWidth] = useState(0);

  const { rankings, tournament } = data;
  const completedDates = playedDateNumbers(rankings);
  const datesToEliminate = tournament.datesToEliminate ?? 2;
  const totalDates = tournament.totalDates ?? 12;
  const bestOf = Math.max(0, totalDates - datesToEliminate);
  const eliminasActive = rankings.some((r) => r.eliminasActive);
  const showElimina3 = datesToEliminate >= 3;
  const hasPenalties = rankings.some((r) => (r.pointPenalty ?? 0) > 0);
  const hasLiveProjection = rankings.some((r) => r.liveProjection);

  const acumDe = (p: PlayerRanking) => p.totalPoints + (p.liveProjection?.points ?? 0);

  const filas = (() => {
    if (view !== 'acum') return rankings.map((player) => ({ player, posicion: player.position }));
    const ordenadas = [...rankings].sort((a, b) => {
      const dif = acumDe(b) - acumDe(a);
      return dif !== 0 ? dif : compareByTiebreak(a, b);
    });
    let puesto = 1;
    return ordenadas.map((player, i) => {
      if (i > 0 && acumDe(ordenadas[i - 1]) !== acumDe(player)) puesto = i + 1;
      return { player, posicion: puesto };
    });
  })();

  const mesasFinalesFor = (p: PlayerRanking) =>
    completedDates.filter(
      (d) => (p.pointsByDate[d] ?? 0) > 0 && (nightlyPosition(rankings, d, p.playerId) ?? 999) <= MESA_FINAL_THRESHOLD
    ).length;

  const leader = rankings.find((r) => r.position === 1);
  const podium23 = [rankings.find((r) => r.position === 2), rankings.find((r) => r.position === 3)].filter(
    (p): p is PlayerRanking => !!p
  );

  const viewNote = (() => {
    if (view === 'fechas') return 'Las fechas tachadas son las que se descartan. PROM es el promedio de las fechas jugadas.';
    if (view === 'acum')
      return `Ordenado por ${SCORE_LABELS.accumulated}: todos los puntos, sin descartar ninguna fecha. No es la tabla oficial — DIF es lo que te quita el ELIMINA.`;
    if (view === 'elimina')
      return hasPenalties
        ? `${SCORE_LABELS.points} = ${SCORE_LABELS.accumulated} menos las fechas descartadas y las multas de puntos.`
        : `${SCORE_LABELS.points} = ${SCORE_LABELS.accumulated} menos las fechas descartadas.`;
    return eliminasActive
      ? `${SCORE_LABELS.points} es lo que manda: tus mejores ${bestOf} fechas de ${totalDates}.`
      : `${SCORE_LABELS.points} es lo que manda. Las ${datesToEliminate} peores fechas se empiezan a descartar a mitad del torneo.`;
  })();

  const shareCsv = async () => {
    const headers = [
      '#',
      'Jugador',
      'Puntos',
      ...completedDates.map((d) => `F${d}`),
      'Prom',
      'E1',
      'E2',
      ...(showElimina3 ? ['E3'] : []),
      ...(hasPenalties ? ['Multa'] : []),
      'Acumulado',
    ];
    const rows = rankings.map((p) => [
      p.position,
      p.playerName,
      scoreOf(p),
      ...completedDates.map((d) => p.pointsByDate[d] ?? 0),
      Math.round(averagePointsPerDate(p)),
      p.elimina1 ?? 0,
      p.elimina2 ?? 0,
      ...(showElimina3 ? [p.elimina3 ?? 0] : []),
      ...(hasPenalties ? [p.pointPenalty ?? 0] : []),
      p.totalPoints,
    ]);
    try {
      await shareTextFile(`tabla-torneo-${tournamentNumber}.csv`, buildCsv(headers, rows), {
        mimeType: 'text/csv',
        UTI: 'public.comma-separated-values-text',
        dialogTitle: `Tabla del Torneo ${tournamentNumber}`,
      });
    } catch (e) {
      Alert.alert('No se pudo compartir', e instanceof Error ? e.message : 'Probá de nuevo.');
    }
  };

  // Columnas extra según la vista; el nombre se queda con el ancho que sobra.
  const extraCols: { key: string; label: string; width: number }[] = (() => {
    if (view === 'fechas')
      return [
        ...completedDates.map((d) => ({ key: `F${d}`, label: `F${d}`, width: W.date })),
        { key: 'prom', label: 'PROM', width: W.small },
      ];
    if (view === 'acum')
      return [
        { key: 'oficial', label: SCORE_LABELS.points, width: W.small + 10 },
        { key: 'dif', label: 'DIF', width: W.small },
      ];
    if (view === 'elimina')
      return [
        { key: 'acum', label: SCORE_LABELS.accumulated, width: W.small + 10 },
        { key: 'e1', label: 'E1', width: W.date },
        { key: 'e2', label: 'E2', width: W.date },
        ...(showElimina3 ? [{ key: 'e3', label: 'E3', width: W.date }] : []),
        ...(hasPenalties ? [{ key: 'multa', label: 'MULTA', width: W.small + 6 }] : []),
      ];
    return [];
  })();
  const fixedWidth = W.pos + W.points + extraCols.reduce((s, c) => s + c.width, 0);
  const nameWidth = Math.max(view === 'resumen' ? 150 : 118, tableWidth - fixedWidth);

  const cell: TextStyle = { fontFamily: fonts.body, fontSize: 13, color: noir.text, textAlign: 'center' };
  const head: TextStyle = { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.6, color: noir.muted, textAlign: 'center' };

  return (
    <View className="gap-4">
      {/* LÍDER */}
      {leader ? (
        <Pressable accessibilityRole="button" onPress={() => goToPlayer(leader.playerId)} className="active:opacity-80">
          <NoirCard accent className="gap-3">
            <View className="flex-row items-center gap-4">
              <View className="flex-1 gap-1">
                <Overline>👑 Líder del torneo</Overline>
                <View className="flex-row items-baseline gap-2">
                  <Score value="#1" size={28} color={noir.text} />
                  <Text numberOfLines={1} className="flex-1 font-inter-bold text-base text-noir-text">
                    {shortenFullName(leader.playerName)}
                  </Text>
                </View>
                <View className="flex-row flex-wrap items-baseline gap-2">
                  <Score value={scoreOf(leader)} size={22} color={noir.gold} />
                  <Muted className="text-xs">{SCORE_LABELS.points}</Muted>
                  {leader.positionsChanged !== 0 ? <Delta value={leader.positionsChanged} size={12} /> : null}
                </View>
                {leader.playerAlias ? (
                  <Text className="font-inter text-sm italic text-noir-gold">“{leader.playerAlias}”</Text>
                ) : null}
              </View>
              <PlayerAvatar name={leader.playerName} photoUrl={leader.playerPhoto} size={84} ringColor={MEDAL[0]} />
            </View>
            <View className="border-t border-noir-border pt-3">
              <StatRow
                items={[
                  { value: mesasFinalesFor(leader), label: 'MESAS FINALES' },
                  { value: leader.firstPlaces + leader.secondPlaces + leader.thirdPlaces, label: 'PODIOS' },
                  { value: leader.firstPlaces, label: 'VICTORIAS' },
                ]}
              />
            </View>
          </NoirCard>
        </Pressable>
      ) : null}

      {/* #2 / #3 */}
      {podium23.length > 0 ? (
        <View className="flex-row gap-3">
          {podium23.map((p) => (
            <Pressable
              key={p.playerId}
              accessibilityRole="button"
              onPress={() => goToPlayer(p.playerId)}
              className="flex-1 active:opacity-80">
              <NoirCard className="flex-row items-center gap-3 p-3" style={{ borderColor: MEDAL[p.position - 1] }}>
                <PlayerAvatar name={p.playerName} photoUrl={p.playerPhoto} size={40} />
                <View className="min-w-0 flex-1">
                  <Score value={`#${p.position}`} size={13} color={MEDAL[p.position - 1]} />
                  <Text numberOfLines={1} className="font-inter-semibold text-sm text-noir-text">
                    {shortenFullName(p.playerName)}
                  </Text>
                  <View className="flex-row items-baseline gap-1">
                    <Score value={scoreOf(p)} size={15} />
                    <Muted className="text-xs">{SCORE_LABELS.pointsShort}</Muted>
                  </View>
                  {p.positionsChanged !== 0 ? <Delta value={p.positionsChanged} size={11} /> : null}
                </View>
              </NoirCard>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* SELECTOR + CSV */}
      <Segmented options={VIEWS} value={view} onChange={setView} />
      <View className="flex-row items-start gap-3">
        <Muted className="flex-1 text-sm">{viewNote}</Muted>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Compartir la tabla completa en CSV"
          onPress={shareCsv}
          className="min-h-[44px] flex-row items-center gap-1 rounded-full border border-noir-border px-3 active:opacity-70">
          <Ionicons name="share-outline" size={14} color={noir.muted} />
          <Text className="font-inter-semibold text-xs text-noir-muted">CSV</Text>
        </Pressable>
      </View>

      {/* TABLA */}
      <View
        className="overflow-hidden rounded-2xl border border-noir-border bg-noir-surface"
        onLayout={(e) => setTableWidth(e.nativeEvent.layout.width)}>
        <ScrollView horizontal showsHorizontalScrollIndicator={view === 'fechas'} bounces={false}>
          <View>
            {/* Encabezado */}
            <View className="flex-row border-b border-noir-border bg-noir-raised">
              <View style={{ width: W.pos }} className="py-2">
                <Text style={head}>#</Text>
              </View>
              <View style={{ width: nameWidth }} className="py-2">
                <Text style={[head, { textAlign: 'left' }]}>JUGADOR</Text>
              </View>
              <View style={{ width: W.points, backgroundColor: noir.copper }} className="py-2">
                <Text style={[head, { color: noir.text }]}>
                  {view === 'acum' ? SCORE_LABELS.accumulated : SCORE_LABELS.points}
                </Text>
              </View>
              {extraCols.map((c) => (
                <View key={c.key} style={{ width: c.width }} className="py-2">
                  <Text style={head}>{c.label}</Text>
                </View>
              ))}
            </View>

            {/* Filas */}
            {filas.map(({ player, posicion }, index) => {
              const isMe = !!currentUserId && player.playerId === currentUserId;
              const isMalazo = posicion > rankings.length - 2;
              const rowBg = isMe ? ROW_ME : isMalazo ? ROW_MALAZO : index % 2 === 1 ? ROW_ZEBRA : 'transparent';
              const points = view === 'acum' ? acumDe(player) : scoreOf(player);
              const eliminated = view === 'fechas' ? eliminatedDateNumbers(player, datesToEliminate) : null;
              const proj = player.liveProjection;

              const extra = (key: string): { text: string | number; style?: TextStyle } => {
                if (key.startsWith('F')) {
                  const d = Number(key.slice(1));
                  const projHere = proj?.dateNumber === d && player.pointsByDate[d] === undefined ? proj : null;
                  if (projHere) return { text: projHere.points, style: { color: PROJECTED, fontStyle: 'italic' } };
                  const isElim = eliminated?.has(d);
                  return {
                    text: player.pointsByDate[d] ?? '—',
                    style: isElim ? { color: INACTIVE, textDecorationLine: 'line-through' } : undefined,
                  };
                }
                switch (key) {
                  case 'prom':
                    return { text: Math.round(averagePointsPerDate(player)) };
                  case 'oficial':
                    return { text: scoreOf(player), style: { color: noir.muted } };
                  case 'dif': {
                    const dif = acumDe(player) - scoreOf(player);
                    return { text: dif > 0 ? `−${dif}` : '—', style: { color: dif > 0 ? NEGATIVE : INACTIVE } };
                  }
                  case 'acum':
                    return proj
                      ? { text: player.totalPoints + proj.points, style: { color: PROJECTED, fontStyle: 'italic' } }
                      : { text: player.totalPoints, style: { color: NEGATIVE } };
                  case 'e1':
                  case 'e2':
                  case 'e3': {
                    const n = key.slice(1) as '1' | '2' | '3';
                    const value = proj ? proj[`elimina${n}`] : player[`elimina${n}`];
                    return {
                      text: value !== undefined ? `−${value}` : '—',
                      style: proj
                        ? { color: PROJECTED, fontStyle: 'italic' }
                        : { color: player.eliminasActive ? NEGATIVE : INACTIVE },
                    };
                  }
                  case 'multa':
                    return {
                      text: (player.pointPenalty ?? 0) > 0 ? `−${player.pointPenalty}` : '—',
                      style: { color: NEGATIVE },
                    };
                  default:
                    return { text: '' };
                }
              };

              const medal = posicion <= 3 ? MEDAL[posicion - 1] : null;

              return (
                <Pressable
                  key={player.playerId}
                  accessibilityRole="button"
                  accessibilityLabel={`${posicion}. ${player.playerName}, ${points} puntos`}
                  onPress={() => goToPlayer(player.playerId)}
                  style={{ backgroundColor: rowBg }}
                  className="min-h-[48px] flex-row items-center border-b border-noir-border/60 active:opacity-70">
                  <View style={{ width: W.pos }} className="items-center">
                    {isMalazo ? (
                      <Text style={{ fontSize: 15 }}>💀</Text>
                    ) : (
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: medal ?? noir.raised,
                        }}>
                        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: medal ? noir.bg : noir.text }}>
                          {posicion}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={{ width: nameWidth }} className="flex-row items-center gap-2 pr-2">
                    <PlayerAvatar name={player.playerName} photoUrl={player.playerPhoto} size={view === 'resumen' ? 28 : 24} />
                    <Text numberOfLines={1} className="flex-1 font-inter-semibold text-sm text-noir-text">
                      {view === 'resumen' ? player.playerName : shortenFullName(player.playerName)}
                      {isMe ? ' (Tú)' : ''}
                    </Text>
                  </View>
                  <View
                    style={{ width: W.points, alignSelf: 'stretch', backgroundColor: isMe ? 'transparent' : 'rgba(224,182,108,0.08)' }}
                    className="items-center justify-center">
                    <Text style={[cell, { fontFamily: fonts.bodyBold, fontSize: 15, color: noir.gold }]}>{points}</Text>
                  </View>
                  {extraCols.map((c) => {
                    const v = extra(c.key);
                    return (
                      <View key={c.key} style={{ width: c.width }}>
                        <Text style={[cell, v.style]}>{v.text}</Text>
                      </View>
                    );
                  })}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {hasLiveProjection ? (
        <Muted className="text-sm">
          Hay una fecha en juego. En <Text style={{ color: PROJECTED, fontStyle: 'italic' }}>ámbar y cursiva</Text> va
          lo proyectado: lo que se llevaría cada uno si sale ahora. La tabla no cambia hasta que la fecha termine.
        </Muted>
      ) : null}

      {view === 'elimina' && !eliminasActive ? (
        <Muted className="text-sm">
          En gris, las fechas que se descartarían: todavía no se restan de {SCORE_LABELS.points}. Empiezan a contar a
          mitad del torneo.
        </Muted>
      ) : null}
    </View>
  );
}
