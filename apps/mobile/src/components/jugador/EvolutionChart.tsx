/**
 * Posición del jugador en la tabla, fecha a fecha (web: PlayerEvolutionChart
 * con recharts). El eje va invertido —el puesto 1 arriba— porque subir tiene
 * que verse como subir, y cada punto lleva su número encima.
 *
 * gifted-charts no invierte el eje: se grafica `maxPos + 1 - posición` y se
 * rotula cada punto con la posición real.
 */
import type { RankingEvolutionPoint } from '@poker/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { Muted } from '@/components/ui/Typography';
import { fonts } from '@/theme/colors';
import { useCP } from '@/theme/tone';

export function EvolutionChart({ evolution }: { evolution: RankingEvolutionPoint[] }) {
  const c = useCP();
  const [width, setWidth] = useState(0);
  const sorted = [...evolution].sort((a, b) => a.dateNumber - b.dateNumber);

  if (sorted.length === 0) return <Muted className="py-6 text-center">Todavía no hay fechas jugadas.</Muted>;

  const maxPos = Math.max(...sorted.map((d) => d.position), 1);
  const data = sorted.map((e) => ({
    value: maxPos + 1 - e.position,
    label: `F${e.dateNumber}`,
    dataPointText: String(e.position),
  }));
  const initialSpacing = 16;
  // Todas las fechas entran en el ancho: sin scroll horizontal, que en iOS se
  // quedaba con el gesto y la pantalla no bajaba. 14 fechas caben de sobra.
  const spacing = sorted.length > 1 ? Math.max(14, (width - initialSpacing * 2 - 8) / (sorted.length - 1)) : 40;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityLabel={`Evolución: ${sorted.map((d) => `fecha ${d.dateNumber}, puesto ${d.position}`).join('; ')}`}>
      {width > 0 ? (
        <LineChart
          data={data}
          width={width - 8}
          height={150}
          maxValue={maxPos + 0.6}
          noOfSections={4}
          hideYAxisText
          yAxisLabelWidth={0}
          yAxisColor="transparent"
          xAxisColor={c.surfaceBorder}
          rulesColor={c.surfaceBorder}
          rulesType="solid"
          initialSpacing={initialSpacing}
          endSpacing={initialSpacing}
          spacing={spacing}
          color={c.primary}
          thickness={2.5}
          dataPointsColor={c.primary}
          dataPointsRadius={4}
          textColor={c.onSurface}
          textFontSize={12}
          textShiftY={-8}
          textShiftX={-3}
          xAxisLabelTextStyle={{ color: c.onSurfaceVariant, fontFamily: fonts.body, fontSize: sorted.length > 12 ? 10 : 12 }}
          disableScroll
          isAnimated
          animationDuration={600}
        />
      ) : null}
    </View>
  );
}
