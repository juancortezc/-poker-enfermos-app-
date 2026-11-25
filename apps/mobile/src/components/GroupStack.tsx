import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/theme/navigation';

/** Stack con cabecera Clean Poker para los grupos (jugador), (envivo), (torneo), (admin). */
export function GroupStack() {
  return <Stack screenOptions={stackScreenOptions} />;
}
