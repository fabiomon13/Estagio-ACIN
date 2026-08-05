import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import type { CategorySection, ClientSessionState } from '../clientTypes';
import { ensureGuest } from '../services/guestApi';
import {
  getActiveSession,
  getBuffetItems,
  getBuffets,
  getCategories,
  getMenu,
  getTable,
  type Buffet,
  type MenuItem,
  type Table,
} from '../services/menuApi';
import { getOrders, type ClientOrder } from '../services/orderApi';
import { ApiError } from '../../../services/api/client';
import { getDeviceToken } from '../utils/deviceToken';
import { buildCategorySections, groupCategorySections } from '../utils/clientSections';

type Status = 'loading' | 'ready' | 'error';

type UseClientBootstrapOptions = {
  tableCode?: string;
  setTable: Dispatch<SetStateAction<Table | null>>;
  setGuestCount: Dispatch<SetStateAction<number>>;
  setSessionState: Dispatch<SetStateAction<ClientSessionState>>;
  onOrdersLoaded: (orders: ClientOrder[]) => void;
};

export function useClientBootstrap({
  tableCode,
  setTable,
  setGuestCount,
  setSessionState,
  onOrdersLoaded,
}: UseClientBootstrapOptions) {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [buffets, setBuffets] = useState<Buffet[]>([]);
  const [buffetItems, setBuffetItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<CategorySection['category'][]>([]);
  const [selectedBuffetId, setSelectedBuffetId] = useState<number | null>(null);

  useEffect(() => {
    if (!tableCode) return;
    let isActive = true;
    let isCheckingApproval = false;
    let approvalTimer: number | null = null;
    const controller = new AbortController();

    const loadData = async () => {
      const token = getDeviceToken();
      // A new device must be associated with the active session before any
      // endpoint protected by X-Device-Token (such as orders) is requested.
      const guest = await ensureGuest(tableCode, token);
      const [nextCategories, menu, nextBuffets, orders] = await Promise.all([
        getCategories({ signal: controller.signal }),
        getMenu({ signal: controller.signal }),
        getBuffets({ signal: controller.signal }),
        getOrders(tableCode, token, { signal: controller.signal }),
      ]);
      const buffet = nextBuffets.find((item) => item.id === guest.buffet_id) ?? nextBuffets[0];
      const nextBuffetItems = buffet
        ? await getBuffetItems(buffet.id, { signal: controller.signal })
        : [];
      if (!isActive) return;
      setCategories(nextCategories);
      setMenuItems(menu.items);
      setBuffets(nextBuffets);
      setBuffetItems(nextBuffetItems);
      setSelectedBuffetId(guest.buffet_id);
      onOrdersLoaded(orders);
      setSessionState('ready');
      setStatus('ready');
    };

    const waitForApproval = async () => {
      if (isCheckingApproval) return;
      isCheckingApproval = true;
      try {
        const activeSession = await getActiveSession(tableCode, { signal: controller.signal });
        if (activeSession.is_approved && activeSession.waiter_id !== null) {
          if (approvalTimer !== null) {
            window.clearInterval(approvalTimer);
            approvalTimer = null;
          }
          await loadData();
        }
      } catch {
        // Keep polling while approval is pending.
      } finally {
        isCheckingApproval = false;
      }
    };

    const start = async () => {
      setStatus('loading');
      setError(null);
      try {
        const currentTable = await getTable(tableCode, { signal: controller.signal });
        if (!isActive) return;
        setTable(currentTable);
        setGuestCount(Math.min(2, currentTable.max_capacity));
        try {
          const activeSession = await getActiveSession(tableCode, { signal: controller.signal });
          if (!activeSession.is_approved || activeSession.waiter_id === null) {
            setSessionState('waiting');
            setStatus('ready');
            void waitForApproval();
            approvalTimer = window.setInterval(waitForApproval, 2500);
            return;
          }
        } catch (requestError) {
          if (requestError instanceof ApiError && requestError.status === 404) {
            setSessionState('setup');
            setStatus('ready');
            return;
          }
          throw requestError;
        }
        await loadData();
      } catch (requestError) {
        if (!isActive) return;
        setError(
          requestError instanceof ApiError ? requestError.detail : 'The menu could not be loaded.',
        );
        setStatus('error');
      }
    };

    void start();
    return () => {
      isActive = false;
      controller.abort();
      if (approvalTimer !== null) window.clearInterval(approvalTimer);
    };
  }, [onOrdersLoaded, reloadKey, setGuestCount, setSessionState, setTable, tableCode]);

  const buffetItemIds = useMemo(() => new Set(buffetItems.map((item) => item.id)), [buffetItems]);
  const menuSections = useMemo(() => {
    const visibleItems =
      selectedBuffetId === null
        ? menuItems
        : menuItems.filter((item) => !buffetItemIds.has(item.id));
    return buildCategorySections(categories, visibleItems);
  }, [buffetItemIds, categories, menuItems, selectedBuffetId]);
  const buffetSections = useMemo(
    () => buildCategorySections(categories, buffetItems),
    [buffetItems, categories],
  );
  const menuStations = useMemo(() => groupCategorySections(menuSections), [menuSections]);
  const buffetStations = useMemo(() => groupCategorySections(buffetSections), [buffetSections]);

  useEffect(() => {
    const displayedBuffetId = selectedBuffetId ?? buffets[0]?.id ?? null;
    if (displayedBuffetId === null) {
      return;
    }

    let isActive = true;
    const controller = new AbortController();
    getBuffetItems(displayedBuffetId, { signal: controller.signal })
      .then((items) => {
        if (isActive) setBuffetItems(items);
      })
      .catch((requestError: unknown) => {
        if (!isActive) return;
        setError(
          requestError instanceof ApiError
            ? requestError.detail
            : 'The buffet could not be loaded.',
        );
        setStatus('error');
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [buffets, selectedBuffetId]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return {
    status,
    error,
    reload,
    data: {
      menuItems,
      buffets,
      buffetItems,
      buffetItemIds,
      selectedBuffetId,
      setSelectedBuffetId,
      menuStations,
      buffetStations,
    },
  };
}
