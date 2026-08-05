import { useMemo } from 'react';

import type { StaffDashboard, StaffOpenRequest } from '../types/staff.types';
import { isAssistanceType } from '../utils/staffDashboard.utils';

type StaffDashboardDerivedData = {
  assistanceTables: Set<number>;
  assistanceCount: number;
  approvalRequests: number;
  assistanceRequestByTable: Map<number, StaffOpenRequest>;
  paymentRequestByTable: Map<number, StaffOpenRequest>;
  paymentRequestCount: number;
};

export function useStaffDashboardDerivedData(
  data: StaffDashboard | null,
): StaffDashboardDerivedData {
  return useMemo(() => {
    const assistanceTables = new Set<number>();
    const assistanceRequestByTable = new Map<number, StaffOpenRequest>();
    const paymentRequestByTable = new Map<number, StaffOpenRequest>();

    let assistanceCount = 0;

    for (const request of data?.requests ?? []) {
      const tableNumber = Number(request.table_number);
      const currentAssistanceRequest = assistanceRequestByTable.get(tableNumber);
      const currentPaymentRequest = paymentRequestByTable.get(tableNumber);

      if (isAssistanceType(request.type)) {
        assistanceCount += 1;
        assistanceTables.add(tableNumber);

        if (
          !currentAssistanceRequest ||
          new Date(request.created_at).getTime() >
            new Date(currentAssistanceRequest.created_at).getTime()
        ) {
          assistanceRequestByTable.set(tableNumber, request);
        }
      }

      const normalizedType = String(request.type ?? '')
        .trim()
        .toLowerCase();

      if (
        normalizedType === 'payment_request' &&
        (!currentPaymentRequest ||
          new Date(request.created_at).getTime() >
            new Date(currentPaymentRequest.created_at).getTime())
      ) {
        paymentRequestByTable.set(tableNumber, request);
      }
    }

    const approvalRequests = (data?.tables ?? []).filter(
      (table) => table.state === 'awaiting_approval',
    ).length;

    return {
      assistanceTables,
      assistanceCount,
      approvalRequests,
      assistanceRequestByTable,
      paymentRequestByTable,
      paymentRequestCount: paymentRequestByTable.size,
    };
  }, [data]);
}
