/**
 * Encabezado de contenido: rotulo + titulo grande en Archivo + subtitulo
 * opcional. La barra de arriba es la cabecera nativa del stack (o CPHeader en
 * las pestañas); esto va dentro de la pantalla.
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
    <View className="flex-row items-end justify-between gap-3 pb-1">
      <View className="flex-1 gap-1">
        {overline ? <Overline>{overline}</Overline> : null}
        <Title className="text-[28px] leading-[32px]">{title}</Title>
        {subtitle ? <Muted>{subtitle}</Muted> : null}
      </View>
      {right}
    </View>
  );
}
