/**
 * Tarjeta Clean Poker: superficie 1 del tono, borde neutro y elevacion 2.
 * En claro es la HomeCard de la web (blanca, radio 18); en oscuro, `.cp-card`.
 * `raised` sube un piso (`.cp-card-raised`): la tarjeta que hay que mirar.
 */
import { View, type ViewProps } from 'react-native';

import { useTone } from '@/theme/tone';

type Props = ViewProps & { className?: string; raised?: boolean };

export function CPCard({ className = '', raised = false, style, children, ...rest }: Props) {
  const light = useTone() === 'light';
  return (
    <View
      className={`rounded-card border p-5 ${
        raised ? 'border-cp-outline bg-cp-surface-2' : 'border-cp-surface-border bg-cp-surface-1'
      } ${className}`}
      style={[
        light
          ? { shadowColor: '#17120F', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 }
          : { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}
