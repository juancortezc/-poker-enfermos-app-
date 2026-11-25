import { Stack, useRouter } from 'expo-router';
import { View } from 'react-native';

import { CPTabBar, TabBarContext } from '@/components/navigation/CPTabBar';
import { stackScreenOptions } from '@/theme/navigation';

/**
 * Stack con cabecera Clean Poker para los grupos (jugador), (envivo), (torneo),
 * (admin), con la barra inferior debajo como en la web. Ningun item queda
 * activo: estas pantallas no son una de las cinco secciones.
 */
export function GroupStack() {
  const router = useRouter();
  return (
    <TabBarContext.Provider value>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={stackScreenOptions} />
        <CPTabBar active={null} onSelect={(key) => router.navigate(`/(tabs)/${key}`)} />
      </View>
    </TabBarContext.Provider>
  );
}
