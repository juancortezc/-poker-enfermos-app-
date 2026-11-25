/**
 * Estadísticas. Mismas subpestañas y orden que /stats de la web (Sin Ganar,
 * Torneos, Campeonatos, 7/2, Podios) más Premios y P&H, que en la web están
 * en admin > Premiación. P&H sigue el permiso `stats-parents` (Comisión).
 */
import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';

import { ChipTabs } from '@/components/torneo/ChipTabs';
import { CampeonesTab, PodiosTab, SieteTab } from '@/components/torneo/stats/Historico';
import { ParentChildTab } from '@/components/torneo/stats/ParentChildTab';
import { PremiosTab } from '@/components/torneo/stats/PremiosTab';
import { SinGanarTab } from '@/components/torneo/stats/SinGanarTab';
import { TorneosTab } from '@/components/torneo/stats/TorneosTab';
import { Screen } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { swrKeys } from '@/lib/swr';

type TabId = 'sin-ganar' | 'torneos' | 'campeones' | 'siete' | 'podios' | 'premios' | 'ph';

type ActiveResponse = { tournament: { id: number; number: number } | null };

export default function StatsScreen() {
  const { can } = useAuth();
  const [tab, setTab] = useState<TabId>('sin-ganar');
  const { data: active, mutate } = useSWR<ActiveResponse>(swrKeys.activeTournament());
  const [refreshing, setRefreshing] = useState(false);

  const tabs = [
    { id: 'sin-ganar' as const, label: 'Sin ganar' },
    { id: 'torneos' as const, label: 'Torneos' },
    { id: 'campeones' as const, label: 'Campeonatos' },
    { id: 'siete' as const, label: '7/2' },
    { id: 'podios' as const, label: 'Podios' },
    { id: 'premios' as const, label: 'Premios' },
    ...(can('stats-parents') ? [{ id: 'ph' as const, label: 'P&H' }] : []),
  ];

  // Pull-to-refresh: revalida las claves de estadísticas y torneos.
  const { mutate: globalMutate } = useSWRConfig();
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        mutate(),
        globalMutate(
          (key) => typeof key === 'string' && (key.startsWith('/api/stats') || key.startsWith('/api/tournaments'))
        ),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Screen edges={['top']} tone="light" appBar refreshing={refreshing} onRefresh={onRefresh}>
      {/* Como la web: sin título, la barra de arriba ya dice el torneo. */}
      <ChipTabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'sin-ganar' ? <SinGanarTab tournamentId={active?.tournament?.id} /> : null}
      {tab === 'torneos' ? <TorneosTab /> : null}
      {tab === 'campeones' ? <CampeonesTab /> : null}
      {tab === 'siete' ? <SieteTab /> : null}
      {tab === 'podios' ? <PodiosTab /> : null}
      {tab === 'premios' ? <PremiosTab /> : null}
      {tab === 'ph' && can('stats-parents') ? <ParentChildTab /> : null}
    </Screen>
  );
}
