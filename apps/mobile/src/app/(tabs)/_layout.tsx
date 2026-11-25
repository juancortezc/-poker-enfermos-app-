/**
 * Las cinco pestañas. La barra es CPTabBar, la misma que se ve en las
 * pantallas internas (GroupStack), asi no desaparece al navegar.
 */
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';

import { CPTabBar, TabBarContext, type TabKey } from '@/components/navigation/CPTabBar';
import { cpLight } from '@/theme/colors';

function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const active = state.routes[state.index]?.name as TabKey;
  const onSelect = (key: TabKey) => {
    const route = state.routes.find((r) => r.name === key);
    if (route) navigateToTab(route.key);
  };
  return <CPTabBar active={active} onSelect={onSelect} />;
}

const renderTabBar = (props: BottomTabBarProps) => <TabBar {...props} />;

export default function TabsLayout() {
  return (
    <TabBarContext.Provider value>
      <Tabs
        tabBar={renderTabBar}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: cpLight.surface0 } }}>
        <Tabs.Screen name="home" options={{ title: 'Inicio' }} />
        <Tabs.Screen name="ranking" options={{ title: 'Tabla' }} />
        <Tabs.Screen name="podcast" options={{ title: 'Podcast' }} />
        <Tabs.Screen name="stats" options={{ title: 'Estadísticas' }} />
        <Tabs.Screen name="mas" options={{ title: 'Más' }} />
      </Tabs>
    </TabBarContext.Provider>
  );
}
