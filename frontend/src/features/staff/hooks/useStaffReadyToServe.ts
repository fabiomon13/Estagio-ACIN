import { useMemo } from 'react';

import type { StaffDashboard, StaffDashboardTable, StaffReadyTable } from '../types/staff.types';

export function useStaffReadyToServe(
  data: StaffDashboard | null,
  tablesView: StaffDashboardTable[],
  staffName?: string,
): StaffReadyTable[] {
  return useMemo(() => {
    const readyTables = data?.ready_to_serve ?? [];
    const normalizedStaffName = staffName?.trim().toLowerCase();

    return readyTables
      .filter((group) => {
        const table = tablesView.find(
          (currentTable) => currentTable.table_number === group.table_number,
        );

        const assignedStaffName = table?.waiter_name?.trim().toLowerCase();
        const belongsToCurrentStaff =
          !assignedStaffName || assignedStaffName === normalizedStaffName;

        return belongsToCurrentStaff && group.items.length > 0;
      })
      .map((group) => ({
        ...group,
        items: group.items ?? [],
      }));
  }, [data, tablesView, staffName]);
}
