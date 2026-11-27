/**
 * El torneo que arranca: mientras el torneo activo no tiene ninguna fecha
 * jugada no hay tabla (todos en 0, en el orden de inscripción), así que el
 * Inicio > Torneo y la Tabla muestran el afiche con la próxima fecha y los
 * inscritos. Port de CPTournamentPoster de la web; qué torneo tiene afiche y
 * los textos vienen de @poker/shared.
 *
 * Bloque negro en cualquier tono, como los carteles del Inicio.
 */
import { nextDateLine, registeredPlayersLabel, toRoman, tournamentPoster } from '@poker/shared';
import { Image, type ImageSource } from 'expo-image';
import { Text, View } from 'react-native';

import { alpha, cp, fonts } from '@/theme/colors';

/**
 * Los archivos de cada afiche (un `require` literal por torneo: Metro no
 * resuelve rutas armadas). Al agregar un afiche: el WebP en
 * `assets/torneos/` y la entrada en TOURNAMENT_POSTERS de @poker/shared.
 */
const POSTER_ASSETS: Record<number, ImageSource> = {
  31: require('../../../assets/torneos/torneo-31-1024.webp'),
};

type Props = {
  tournamentNumber: number;
  nextDate?: { dateNumber: number; scheduledDate?: string | null } | null;
  registeredCount?: number;
};

export function TournamentPoster({ tournamentNumber, nextDate, registeredCount }: Props) {
  const poster = tournamentPoster(tournamentNumber);
  const source = poster ? POSTER_ASSETS[tournamentNumber] : undefined;
  const fecha = nextDateLine(nextDate);

  return (
    <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: cp.surface0 }}>
      <View style={{ width: '100%', aspectRatio: 2 / 3 }}>
        {poster && source ? (
          <Image
            source={source}
            accessibilityLabel={poster.alt}
            accessibilityRole="image"
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
          />
        ) : (
          <GenericPoster tournamentNumber={tournamentNumber} />
        )}
      </View>

      <View style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 20, gap: 8, borderTopWidth: 3, borderTopColor: cp.primary }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 12, letterSpacing: 1.7, color: cp.primaryLight }}>ARRANCA EL TORNEO</Text>
        <Text accessibilityRole="header" style={{ fontFamily: fonts.displayBlackItalic, fontSize: 38, lineHeight: 40, color: cp.onSurface }}>
          {`TORNEO ${tournamentNumber}`}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 16, rowGap: 4 }}>
          {fecha ? <Text style={{ fontFamily: fonts.display, fontSize: 18, color: cp.gold }}>{fecha}</Text> : null}
          {registeredCount ? (
            <Text style={{ fontFamily: fonts.body, fontSize: 14, color: cp.onSurfaceMuted }}>{registeredPlayersLabel(registeredCount)}</Text>
          ) : null}
        </View>
        <Text style={{ fontFamily: fonts.body, fontSize: 13, color: cp.onSurfaceMuted }}>
          La tabla aparece cuando se juegue la primera fecha.
        </Text>
      </View>
    </View>
  );
}

/** Sin afiche propio: el número en romano, en grande, sobre el negro del club. */
function GenericPoster({ tournamentNumber }: { tournamentNumber: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        borderWidth: 6,
        borderColor: cp.primary,
        borderRadius: 20,
        backgroundColor: alpha(cp.primary, 0.12),
      }}>
      <Text style={{ fontFamily: fonts.displayBlack, fontSize: 28, letterSpacing: 5, color: cp.onSurface }}>TORNEO</Text>
      <Text style={{ fontFamily: fonts.displayBlackItalic, fontSize: 110, lineHeight: 116, color: cp.onSurface }}>{toRoman(tournamentNumber)}</Text>
      <Text style={{ fontFamily: fonts.display, fontSize: 14, letterSpacing: 2.5, color: cp.primaryLight }}>POKER DE ENFERMOS</Text>
    </View>
  );
}
