import { useCallback, useEffect, useState } from 'react';

import type { ClientView } from '../clientTypes';
import { getOrders, type ClientOrder } from '../services/orderApi';
import { getDeviceToken } from '../utils/deviceToken';

export function useClientOrders(tableCode: string | undefined, activeView: ClientView) {
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [pollingError, setPollingError] = useState<string | null>(null);

  useEffect(() => {
    if (activeView !== 'orders' || !tableCode) return;

    let isActive = true;
    let isLoading = false;
    let controller: AbortController | null = null;
    const loadOrders = async () => {
      if (isLoading || document.visibilityState === 'hidden') return;
      isLoading = true;
      controller = new AbortController();
      try {
        const nextOrders = await getOrders(tableCode, getDeviceToken(), {
          signal: controller.signal,
        });
        if (isActive) {
          setOrders(nextOrders);
          setPollingError(null);
        }
      } catch (error) {
        if (isActive && !(error instanceof DOMException && error.name === 'AbortError')) {
          setPollingError('Orders could not be refreshed. Retrying…');
        }
      } finally {
        isLoading = false;
      }
    };

    void loadOrders();
    const timer = window.setInterval(loadOrders, 5000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void loadOrders();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isActive = false;
      controller?.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeView, tableCode]);

  const hydrateOrders = useCallback((nextOrders: ClientOrder[]) => setOrders(nextOrders), []);
  const prependOrder = useCallback(
    (order: ClientOrder) => setOrders((current) => [order, ...current]),
    [],
  );

  return { orders, setOrders, hydrateOrders, prependOrder, pollingError };
}
