/**
 * Panel `noir-card`: superficie algo más clara que el fondo, borde cobre
 * oscuro y sombra profunda. `accent` añade un filo dorado arriba.
 */
import { View, type ViewProps } from 'react-native';

type Props = ViewProps & { className?: string; accent?: boolean };

export function NoirCard({ className = '', accent = false, style, children, ...rest }: Props) {
  return (
    <View
      className={`overflow-hidden rounded-2xl border border-noir-border bg-noir-surface p-5 ${className}`}
      style={[
        {
          shadowColor: '#000',
          shadowOpacity: 0.45,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 12 },
          elevation: 8,
        },
        style,
      ]}
      {...rest}>
      {accent ? <View className="absolute left-0 right-0 top-0 h-[2px] bg-noir-gold/70" /> : null}
      {children}
    </View>
  );
}
