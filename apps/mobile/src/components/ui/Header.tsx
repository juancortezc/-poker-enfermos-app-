/**
 * Encabezado de contenido: overline dorada en Cinzel + título grande +
 * subtítulo opcional. Para la barra de navegación se usa la cabecera nativa
 * del stack; esto va dentro de la pantalla.
 */
import { View } from 'react-native';

import { Muted, Overline, Title } from '@/components/ui/Typography';

type Props = {
  title: string;
  overline?: string;
  subtitle?: string;
  right?: React.ReactNode;
};

export function Header({ title, overline, subtitle, right }: Props) {
  return (
    <View className="flex-row items-end justify-between gap-3 pb-2">
      <View className="flex-1 gap-1">
        {overline ? <Overline>{overline}</Overline> : null}
        <Title className="text-3xl">{title}</Title>
        {subtitle ? <Muted>{subtitle}</Muted> : null}
      </View>
      {right}
    </View>
  );
}
