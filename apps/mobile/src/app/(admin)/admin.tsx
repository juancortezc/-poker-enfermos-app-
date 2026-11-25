/**
 * Panel de Comisión. Mismas pestañas que /admin de la web: Activar (fecha),
 * Torneo, Blinds, Enfermos, Premios y Multas. Lo que ya existe en otras
 * áreas se enlaza o se reutiliza (directorio de jugadores, premios y P&H de
 * Estadísticas); la importación CSV vive en Enfermos.
 */
import { Stack } from 'expo-router';
import { useState } from 'react';
import { useSWRConfig } from 'swr';

import { ActivarTab } from '@/components/admin/tabs/ActivarTab';
import { MultasTab } from '@/components/admin/tabs/MultasTab';
import { BlindsTab, EnfermosTab, PremiacionTab, TorneoTab } from '@/components/admin/tabs/SimpleTabs';
import { ChipTabs } from '@/components/torneo/ChipTabs';
import { Header } from '@/components/ui/Header';
import { Screen } from '@/components/ui/Screen';
import { useActiveTournament } from '@/hooks/useActiveTournament';

type TabId = 'activar' | 'torneo' | 'blinds' | 'jugadores' | 'premiacion' | 'multas';

const TABS = [
  { id: 'activar', label: 'Activar' },
  { id: 'torneo', label: 'Torneo' },
  { id: 'blinds', label: 'Blinds' },
  { id: 'jugadores', label: 'Enfermos' },
  { id: 'premiacion', label: 'Premios' },
  { id: 'multas', label: 'Multas' },
] as const;

export default function AdminScreen() {
  const [tab, setTab] = useState<TabId>('activar');
  const { tournament } = useActiveTournament();
  const { mutate } = useSWRConfig();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await mutate(
        (key) =>
          typeof key === 'string' &&
          (key.startsWith('/api/tournaments') ||
            key.startsWith('/api/game-dates') ||
            key.startsWith('/api/players') ||
            key.startsWith('/api/multas') ||
            key.startsWith('/api/stats'))
      );
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Screen tone="light" refreshing={refreshing} onRefresh={onRefresh}>
      <Stack.Screen options={{ title: 'Comisión' }} />
      <Header overline={tournament ? `Torneo ${tournament.number}` : 'Comisión'} title="Configuración" />
      <ChipTabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'activar' ? <ActivarTab /> : null}
      {tab === 'torneo' ? <TorneoTab tournament={tournament} /> : null}
      {tab === 'blinds' ? <BlindsTab tournamentId={tournament?.id} /> : null}
      {tab === 'jugadores' ? <EnfermosTab /> : null}
      {tab === 'premiacion' ? <PremiacionTab /> : null}
      {tab === 'multas' ? <MultasTab tournamentId={tournament?.id} /> : null}
    </Screen>
  );
}
