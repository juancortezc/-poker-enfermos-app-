/**
 * /tabla: en la web redirige a /ranking. Aquí muestra la misma tabla dentro
 * del stack (con botón atrás), para no sacar al usuario de donde venía.
 */
import { Stack } from 'expo-router';

import { RankingScreenContent } from '@/components/jugador/RankingScreenContent';

export default function TablaScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Tabla' }} />
      <RankingScreenContent />
    </>
  );
}
