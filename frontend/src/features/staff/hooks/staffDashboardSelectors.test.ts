import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { StaffDashboard, StaffDashboardTable, StaffOpenRequest } from '../types/staff.types';
import { useStaffDashboardDerivedData } from './useStaffDashboardDerivedData';
import { useStaffPreparingOrders } from './useStaffPreparingOrders';
import { useStaffReadyToServe } from './useStaffReadyToServe';

const table = (tableNumber: number, waiterId: number | null): StaffDashboardTable => ({
  session_id: tableNumber,
  table_number: tableNumber,
  guest_count: 2,
  state: 'active',
  started_at: '2026-08-11T10:00:00Z',
  ready_item_count: 0,
  total: '$10.00',
  waiter_id: waiterId,
});

const request = (
  id: number,
  tableNumber: number,
  type: string,
  createdAt: string,
): StaffOpenRequest => ({
  id,
  table_number: tableNumber,
  type,
  is_high_priority: false,
  created_at: createdAt,
});

function dashboard(overrides: Partial<StaffDashboard> = {}): StaffDashboard {
  return {
    summary: { occupied_tables: 0, guest_count: 0, open_requests: 0 },
    tables: [],
    ready_to_serve: [],
    requests: [],
    preparing_orders: [],
    ...overrides,
  };
}

describe('staff dashboard selectors', () => {
  it('counts requests and retains the newest request for each table', () => {
    const data = dashboard({
      tables: [
        { ...table(1, 7), state: 'awaiting_approval' },
        { ...table(2, 7), state: 'awaiting_approval' },
      ],
      requests: [
        request(1, 1, 'assistance', '2026-08-11T10:00:00Z'),
        request(2, 1, 'ASSISTANCE', '2026-08-11T11:00:00Z'),
        request(3, 1, 'payment_request', '2026-08-11T09:00:00Z'),
        request(4, 1, 'payment_request', '2026-08-11T12:00:00Z'),
        request(5, 2, 'payment_request', '2026-08-11T12:00:00Z'),
      ],
    });

    const { result } = renderHook(() => useStaffDashboardDerivedData(data));

    expect(result.current.assistanceCount).toBe(2);
    expect([...result.current.assistanceTables]).toEqual([1]);
    expect(result.current.assistanceRequestByTable.get(1)?.id).toBe(2);
    expect(result.current.paymentRequestByTable.get(1)?.id).toBe(4);
    expect(result.current.paymentRequestCount).toBe(2);
    expect(result.current.approvalRequests).toBe(2);
  });

  it('returns empty derived data when the dashboard is absent', () => {
    const { result } = renderHook(() => useStaffDashboardDerivedData(null));
    expect(result.current.assistanceCount).toBe(0);
    expect(result.current.paymentRequestCount).toBe(0);
    expect(result.current.approvalRequests).toBe(0);
  });

  it('shows ready items only for tables assigned to the current waiter', () => {
    const tables = [table(1, 7), table(2, 8), table(3, 7)];
    const data = dashboard({
      ready_to_serve: [
        { table_number: 1, items: [{ id: 10, name: 'Soup', quantity: 1 }] },
        { table_number: 2, items: [{ id: 11, name: 'Rice', quantity: 1 }] },
        { table_number: 3, items: [] },
      ],
    });

    const { result } = renderHook(() => useStaffReadyToServe(data, tables, 7));
    expect(result.current.map((group) => group.table_number)).toEqual([1]);
  });

  it('shows preparing orders only for tables assigned to the current waiter', () => {
    const tables = [table(1, 7), table(2, 8)];
    const preparingItem = {
      id: 20,
      name: 'Soup',
      quantity: 1,
      status: 'preparing' as const,
      preparation_started_at: '2026-08-11T10:00:00Z',
      estimated_ready_at: '2026-08-11T10:10:00Z',
    };
    const data = dashboard({
      preparing_orders: [
        { table_number: 1, waiter_id: 7, items: [preparingItem] },
        { table_number: 2, waiter_id: 8, items: [preparingItem] },
      ],
    });

    const { result } = renderHook(() => useStaffPreparingOrders(data, tables, 7));
    expect(result.current.map((group) => group.table_number)).toEqual([1]);
  });

  it('returns no waiter-specific groups without a staff id', () => {
    const data = dashboard({
      ready_to_serve: [{ table_number: 1, items: [{ id: 1, name: 'Soup', quantity: 1 }] }],
      preparing_orders: [],
    });

    expect(renderHook(() => useStaffReadyToServe(data, [table(1, 7)])).result.current).toEqual([]);
    expect(renderHook(() => useStaffPreparingOrders(data, [table(1, 7)])).result.current).toEqual(
      [],
    );
  });
});
