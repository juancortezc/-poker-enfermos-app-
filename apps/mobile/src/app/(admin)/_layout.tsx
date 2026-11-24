/**
 * Área de Comisión. En la web, /admin, /tournaments, /game-dates y la gestión
 * de jugadores son solo para Comisión (canAccessRoute). Aquí se corta en el
 * layout para que ninguna pantalla del grupo se monte con otro rol.
 */
import { Stack } from 'expo-router';

import { GroupStack } from '@/components/GroupStack';
import { Screen } from '@/components/ui/Screen';
import { RestrictedState } from '@/components/ui/States';
import { useAuth } from '@/contexts/AuthContext';
import { getRestrictionMessage } from '@poker/shared';
import { stackScreenOptions } from '@/theme/navigation';

export default function AdminLayout() {
  const { role } = useAuth();

  if (role !== 'Comision') {
    return (
      <>
        <Stack.Screen options={{ ...stackScreenOptions, headerShown: true, title: 'Comisión' }} />
        <Screen scroll={false} edges={['top', 'bottom']}>
          <RestrictedState message={role ? getRestrictionMessage(role, 'tournaments') : 'Acceso restringido'} />
        </Screen>
      </>
    );
  }

  return <GroupStack />;
}
