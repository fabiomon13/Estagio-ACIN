import { useMemo } from 'react';

import type { StaffDashboard, StaffDashboardTable, StaffReadyTable } from '../types/staff.types';

export function useStaffReadyToServe(
  data: StaffDashboard | null,
  tablesView: StaffDashboardTable[],
  staffId?: number,
  isAdmin = false,
): StaffReadyTable[] {
  return useMemo(() => {
    if (!staffId) {
      return [];
    }

    return (data?.ready_to_serve ?? [])
      .filter((group) => {
        // Admin isn't ever assigned as a table's waiter, so the ownership
        // check below would always exclude them -- they see every table.
        if (isAdmin) return group.items.length > 0;

        const table = tablesView.find(
          (currentTable) => currentTable.table_number === group.table_number,
        );

        return table?.waiter_id === staffId && group.items.length > 0;
      })
      .map((group) => ({
        ...group,
        items: group.items ?? [],
      }));
  }, [data, tablesView, staffId, isAdmin]);
}
