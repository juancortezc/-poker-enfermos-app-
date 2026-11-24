/**
 * Pull-to-refresh: corre las revalidaciones en paralelo y mantiene el
 * indicador mientras tanto. `mutate()` de SWR ignora el dedupingInterval,
 * así que el gesto siempre va a la red.
 */
import { useState } from 'react';

export function useRefresh(...revalidators: (() => Promise<unknown>)[]) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled(revalidators.map((r) => r()));
    } finally {
      setRefreshing(false);
    }
  };

  return { refreshing, onRefresh };
}
