import { useMemo } from 'react';

import type {
  StaffDashboard,
  StaffDashboardTable,
  StaffPreparingTable,
} from '../types/staff.types';

export function useStaffPreparingOrders(
  data: StaffDashboard | null,
  tablesView: StaffDashboardTable[],
  staffId?: number,
  isAdmin = false,
): StaffPreparingTable[] {
  return useMemo(() => {
    if (!staffId) return [];

    // Admin isn't ever assigned as a table's waiter, so the ownership check
    // below would always exclude them -- they see every table's orders.
    if (isAdmin) return data?.preparing_orders ?? [];

    return (data?.preparing_orders ?? []).filter((group) => {
      const table = tablesView.find(
        (currentTable) => currentTable.table_number === group.table_number,
      );

      return table?.waiter_id === staffId;
    });
  }, [data, staffId, tablesView, isAdmin]);
}
