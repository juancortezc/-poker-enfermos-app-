/**
 * Barra inferior. Mismos items y orden que CPBottomNav de la web
 * (src/components/clean-poker/CPBottomNav.tsx): Inicio, Tabla, Podcast,
 * Estadisticas, Mas. Las cinco pestañas van en claro en la web, asi que la
 * barra tambien: papel, iconos de linea y el item activo en una pildora
 * blanca elevada.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, type BottomTabBarButtonProps } from 'expo-router/js-tabs';
import { Pressable, type ColorValue } from 'react-native';

import { cpLight, fonts } from '@/theme/colors';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IconName) {
  function TabIcon({ color }: { color: ColorValue; focused: boolean; size: number }) {
    return <Ionicons name={name} color={color as string} size={22} />;
  }
  return TabIcon;
}

// Fuera del render: crear componentes dentro de el los remonta en cada pasada.
const icons = {
  home: tabIcon('home-outline'),
  ranking: tabIcon('list-outline'),
  podcast: tabIcon('mic-outline'),
  stats: tabIcon('bar-chart-outline'),
  mas: tabIcon('ellipsis-horizontal'),
};

/** La pildora activa lleva sombra; las demas, no. */
function TabButton({ children, style, ref: _ref, ...props }: BottomTabBarButtonProps) {
  void _ref;
  const active = !!props['aria-selected'];
  return (
    <Pressable
      {...props}
      style={[
        style,
        { borderRadius: 18 },
        active
          ? { shadowColor: '#17120F', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 }
          : null,
      ]}>
      {children}
    </Pressable>
  );
}

const renderTabButton = (props: BottomTabBarButtonProps) => <TabButton {...props} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: cpLight.onSurface,
        tabBarInactiveTintColor: cpLight.onSurfaceMuted,
        tabBarActiveBackgroundColor: cpLight.surface1,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11.5 },
        tabBarItemStyle: { borderRadius: 18, marginHorizontal: 1, marginVertical: 5, paddingHorizontal: 0 },
        // Se llama como funcion, no como componente: hay que envolverlo.
        tabBarButton: renderTabButton,
        tabBarStyle: {
          backgroundColor: cpLight.surface0,
          borderTopColor: cpLight.surfaceBorder,
        },
        sceneStyle: { backgroundColor: cpLight.surface0 },
      }}>
      <Tabs.Screen name="home" options={{ title: 'Inicio', tabBarIcon: icons.home }} />
      <Tabs.Screen name="ranking" options={{ title: 'Tabla', tabBarIcon: icons.ranking }} />
      <Tabs.Screen name="podcast" options={{ title: 'Podcast', tabBarIcon: icons.podcast }} />
      <Tabs.Screen name="stats" options={{ title: 'Estadísticas', tabBarIcon: icons.stats }} />
      <Tabs.Screen name="mas" options={{ title: 'Más', tabBarIcon: icons.mas }} />
    </Tabs>
  );
}
