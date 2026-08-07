import { useCallback, useEffect, useState } from 'react';

import { useToast } from '../../../components/ui/toast/useToast';
import { getStaffDashboard } from '../api/staffApi';
import type { StaffDashboard, StaffDashboardTable } from '../types/staff.types';

const POLL_MS = 10000;

export function useStaffDashboard() {
  const { showToast } = useToast();

  const [data, setData] = useState<StaffDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [tablesView, setTablesView] = useState<StaffDashboardTable[]>([]);

  const load = useCallback(async () => {
    try {
      const dashboard = await getStaffDashboard();

      setData(dashboard);

      setTablesView((previousTables) => {
        const incomingTables = dashboard.tables ?? [];
        const tablesByNumber = new Map<number, StaffDashboardTable>();

        for (const table of previousTables) {
          tablesByNumber.set(table.table_number, table);
        }

        for (const table of incomingTables) {
          tablesByNumber.set(table.table_number, table);
        }

        const incomingTableNumbers = new Set(incomingTables.map((table) => table.table_number));

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
    } catch {
      showToast({
        variant: 'danger',
        title: 'Erro ao carregar dashboard',
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();

    const intervalId = setInterval(() => {
      void load();
    }, POLL_MS);

    return () => clearInterval(intervalId);
  }, [load]);

  return {
    data,
    loading,
    tablesView,
    load,
  };
}
