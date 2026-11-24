/**
 * Barra inferior. Mismos ítems y orden que CPBottomNav de la web
 * (src/components/clean-poker/CPBottomNav.tsx): Inicio, Tabla, Podcast,
 * Estadísticas, Más. En la web la barra es igual para todos los roles.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';

import { fonts, noir } from '@/theme/colors';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(active: IconName, inactive: IconName) {
  function TabIcon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return <Ionicons name={focused ? active : inactive} color={color as string} size={size} />;
  }
  return TabIcon;
}

// Fuera del render: crear componentes dentro de él los remonta en cada pasada.
const icons = {
  home: tabIcon('home', 'home-outline'),
  ranking: tabIcon('list', 'list-outline'),
  podcast: tabIcon('mic', 'mic-outline'),
  stats: tabIcon('bar-chart', 'bar-chart-outline'),
  mas: tabIcon('ellipsis-horizontal', 'ellipsis-horizontal-outline'),
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: noir.gold,
        tabBarInactiveTintColor: noir.muted,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: noir.tabBar,
          borderTopColor: noir.border,
        },
        sceneStyle: { backgroundColor: noir.bg },
      }}>
      <Tabs.Screen name="home" options={{ title: 'Inicio', tabBarIcon: icons.home }} />
      <Tabs.Screen name="ranking" options={{ title: 'Tabla', tabBarIcon: icons.ranking }} />
      <Tabs.Screen name="podcast" options={{ title: 'Podcast', tabBarIcon: icons.podcast }} />
      <Tabs.Screen
        name="stats"
        options={{ title: 'Estadísticas', tabBarIcon: icons.stats }}
      />
      <Tabs.Screen
        name="mas"
        options={{ title: 'Más', tabBarIcon: icons.mas }}
      />
    </Tabs>
  );
}
