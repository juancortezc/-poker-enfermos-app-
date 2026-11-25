/**
 * Barra inferior unica de la app. La usan las cinco pestañas (como `tabBar`
 * de Tabs) y las pantallas internas (GroupStack), para que la barra no
 * desaparezca al entrar a un jugador, el calendario o Comision, igual que
 * CPBottomNav en la web.
 *
 * Mismos items y orden que la web: Inicio, Tabla, Podcast, Estadisticas, Mas.
 * En pantallas internas no hay item activo (la web solo marca la seccion
 * cuya ruta coincide).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, useContext } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cpLight, fonts } from '@/theme/colors';

export type TabKey = 'home' | 'ranking' | 'podcast' | 'stats' | 'mas';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export const TAB_ITEMS: { key: TabKey; title: string; icon: IconName }[] = [
  { key: 'home', title: 'Inicio', icon: 'home-outline' },
  { key: 'ranking', title: 'Tabla', icon: 'list-outline' },
  { key: 'podcast', title: 'Podcast', icon: 'mic-outline' },
  { key: 'stats', title: 'Estadísticas', icon: 'bar-chart-outline' },
  { key: 'mas', title: 'Más', icon: 'ellipsis-horizontal' },
];

/**
 * true cuando la pantalla tiene la barra debajo: `Screen` deja de reservar el
 * borde inferior seguro, porque ya lo reserva la barra.
 */
export const TabBarContext = createContext(false);
export const useHasTabBar = () => useContext(TabBarContext);

type Props = {
  active: TabKey | null;
  onSelect: (key: TabKey) => void;
};

export function CPTabBar({ active, onSelect }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        alignSelf: 'stretch',
        width: '100%',
        backgroundColor: cpLight.surface0,
        borderTopWidth: 1,
        borderTopColor: cpLight.surfaceBorder,
        paddingHorizontal: 4,
        paddingTop: 5,
        paddingBottom: Math.max(insets.bottom, 5),
      }}>
      {TAB_ITEMS.map((item) => {
        const on = item.key === active;
        const color = on ? cpLight.onSurface : cpLight.onSurfaceMuted;
        return (
          // Estilos fijos: NativeWind descarta el `style` como funcion en Pressable.
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={item.title}
            onPress={() => onSelect(item.key)}
            className="active:opacity-70"
            style={{ flex: 1, marginHorizontal: 1 }}>
            <View
              style={[
                {
                  flex: 1,
                  minHeight: 50,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                },
                on
                  ? {
                      backgroundColor: cpLight.surface1,
                      shadowColor: '#17120F', // sombra de la pildora, igual que la web
                      shadowOpacity: 0.1,
                      shadowRadius: 10,
                      shadowOffset: { width: 0, height: 3 },
                      elevation: 3,
                    }
                  : null,
              ]}>
              <Ionicons name={item.icon} color={color} size={22} />
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11.5, color }} numberOfLines={1}>
                {item.title}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
