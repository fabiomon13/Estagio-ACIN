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
): StaffPreparingTable[] {
  return useMemo(() => {
    if (!staffId) return [];

    return (data?.preparing_orders ?? []).filter((group) => {
      const table = tablesView.find(
        (currentTable) => currentTable.table_number === group.table_number,
      );

      return table?.waiter_id === staffId;
    });
  }, [data, staffId, tablesView]);
}
