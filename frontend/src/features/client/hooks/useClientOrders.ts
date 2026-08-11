import { useCallback, useEffect, useState } from 'react';

import { getOrders, type ClientOrder } from '../services/orderApi';
import { getDeviceToken } from '../utils/deviceToken';

export function useClientOrders(tableCode: string | undefined) {
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    if (!tableCode || document.visibilityState === 'hidden') return;

    try {
      const nextOrders = await getOrders(tableCode, getDeviceToken());
      setOrders(nextOrders);
      setRefreshError(null);
    } catch {
      setRefreshError('Não foi possível atualizar os pedidos.');
    }
  }, [tableCode]);

  useEffect(() => {
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        void refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch]);

  const hydrateOrders = useCallback((nextOrders: ClientOrder[]) => setOrders(nextOrders), []);
  const prependOrder = useCallback(
    (order: ClientOrder) => setOrders((current) => [order, ...current]),
    [],
  );

  return { orders, setOrders, hydrateOrders, prependOrder, refreshError, refetch };
}
