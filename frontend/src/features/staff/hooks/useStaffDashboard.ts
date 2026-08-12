import { useCallback, useEffect, useRef, useState } from 'react';

import { useToast } from '../../../components/ui/toast/useToast';
import { buildWebSocketUrl } from '../../../services/api/client';
import { getStaffDashboard } from '../api/staffApi';
import type { StaffDashboard, StaffDashboardTable } from '../types/staff.types';

const BACKUP_POLL_MS = 30_000;
const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

function getStaffWebSocketUrl(): string {
  return buildWebSocketUrl('/staff/ws');
}

export function useStaffDashboard() {
  const { showToast } = useToast();

  const [data, setData] = useState<StaffDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [tablesView, setTablesView] = useState<StaffDashboardTable[]>([]);
  const activeLoadRef = useRef<Promise<void> | null>(null);

  const applyDashboard = useCallback((dashboard: StaffDashboard) => {
    setData(dashboard);

    setTablesView((previousTables) => {
      const tablesByNumber = new Map<number, StaffDashboardTable>();

      for (const table of previousTables) {
        tablesByNumber.set(table.table_number, table);
      }

      for (const table of dashboard.tables ?? []) {
        tablesByNumber.set(table.table_number, table);
      }

      const incomingTableNumbers = new Set(
        (dashboard.tables ?? []).map((table) => table.table_number),
      );

      for (const [tableNumber, table] of tablesByNumber) {
        if (!incomingTableNumbers.has(tableNumber)) {
          tablesByNumber.set(tableNumber, {
            ...table,
            state: 'inactive',
          });
        }
      }

      return Array.from(tablesByNumber.values()).sort(
        (firstTable, secondTable) => firstTable.table_number - secondTable.table_number,
      );
    });
  }, []);

  const load = useCallback((): Promise<void> => {
    if (activeLoadRef.current) return activeLoadRef.current;

    const request = (async () => {
      try {
        const dashboard = await getStaffDashboard();
        applyDashboard(dashboard);
      } catch {
        showToast({
          variant: 'danger',
          title: 'Erro ao carregar dashboard',
        });
      } finally {
        setLoading(false);
      }
    })();

    activeLoadRef.current = request;
    void request.finally(() => {
      if (activeLoadRef.current === request) activeLoadRef.current = null;
    });

    return request;
  }, [applyDashboard, showToast]);

  useEffect(() => {
    let isMounted = true;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;

    function connect() {
      socket = new WebSocket(getStaffWebSocketUrl());

      socket.onopen = () => {
        reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;
      };

      socket.onmessage = (event: MessageEvent<string>) => {
        if (!isMounted) return;

        try {
          const payload = JSON.parse(event.data) as
            { type: 'dashboard.changed' } | { dashboard: StaffDashboard };

          if ('type' in payload && payload.type === 'dashboard.changed') {
            void load();
            return;
          }

          if ('dashboard' in payload) {
            applyDashboard(payload.dashboard);
            setLoading(false);
          }
        } catch {
          // Ignore an invalid message; the backup REST poll will recover.
        }
      };

      socket.onclose = () => {
        if (!isMounted) return;

        reconnectTimer = setTimeout(() => {
          reconnectDelayMs = Math.min(reconnectDelayMs * 2, MAX_RECONNECT_DELAY_MS);
          connect();
        }, reconnectDelayMs);
      };
    }

    connect();
    void Promise.resolve().then(load);

    const pollTimer = setInterval(() => {
      if (document.visibilityState !== 'hidden') void load();
    }, BACKUP_POLL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void load();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
      }

      socket?.close();
    };
  }, [applyDashboard, load]);

  return {
    data,
    loading,
    tablesView,
    load,
  };
}
