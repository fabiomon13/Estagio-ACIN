import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as staffApi from '../api/staffApi';
import type { StaffDashboard, StaffDashboardTable } from '../types/staff.types';
import { useStaffDashboard } from './useStaffDashboard';

vi.mock('../api/staffApi');

const showToast = vi.fn();
vi.mock('../../../components/ui/toast/useToast', () => ({
  useToast: () => ({ showToast }),
}));

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onclose: (() => void) | null = null;
  closed = false;
  url: string;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  close() {
    this.closed = true;
  }
}

const table = (tableNumber: number, state: StaffDashboardTable['state'] = 'active') => ({
  session_id: tableNumber,
  table_number: tableNumber,
  guest_count: 2,
  state,
  started_at: '2026-08-11T10:00:00Z',
  ready_item_count: 0,
  total: '$10.00',
  waiter_id: 7,
});

const dashboard = (tables: StaffDashboardTable[] = []): StaffDashboard => ({
  summary: { occupied_tables: tables.length, guest_count: tables.length * 2, open_requests: 0 },
  tables,
  ready_to_serve: [],
  requests: [],
  preparing_orders: [],
});

async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe('useStaffDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    vi.mocked(staffApi.getStaffDashboard).mockResolvedValue(dashboard([table(2), table(1)]));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('loads the dashboard on mount and sorts tables by number', async () => {
    const { result } = renderHook(() => useStaffDashboard());
    expect(result.current.loading).toBe(true);

    await flush();

    expect(result.current.loading).toBe(false);
    expect(result.current.tablesView.map((item) => item.table_number)).toEqual([1, 2]);
    expect(staffApi.getStaffDashboard).toHaveBeenCalledTimes(1);
  });

  it('opens the staff WebSocket using the configured API URL', async () => {
    renderHook(() => useStaffDashboard());
    await flush();

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toContain('/api/staff/ws');
  });

  it('applies a dashboard pushed directly through WebSocket', async () => {
    const { result } = renderHook(() => useStaffDashboard());
    await flush();

    act(() => {
      FakeWebSocket.instances[0].onmessage?.({
        data: JSON.stringify({ dashboard: dashboard([table(5)]) }),
      } as MessageEvent<string>);
    });

    expect(result.current.data?.tables[0].table_number).toBe(5);
    expect(result.current.tablesView.find((item) => item.table_number === 5)?.state).toBe('active');
  });

  it('refetches when dashboard.changed is received', async () => {
    renderHook(() => useStaffDashboard());
    await flush();
    vi.mocked(staffApi.getStaffDashboard).mockResolvedValue(dashboard([table(3)]));

    act(() => {
      FakeWebSocket.instances[0].onmessage?.({
        data: JSON.stringify({ type: 'dashboard.changed' }),
      } as MessageEvent<string>);
    });
    await flush();

    expect(staffApi.getStaffDashboard).toHaveBeenCalledTimes(2);
  });

  it('keeps disappeared tables visible as inactive', async () => {
    const { result } = renderHook(() => useStaffDashboard());
    await flush();

    act(() => {
      FakeWebSocket.instances[0].onmessage?.({
        data: JSON.stringify({ dashboard: dashboard([table(2)]) }),
      } as MessageEvent<string>);
    });

    expect(result.current.tablesView).toEqual([
      expect.objectContaining({ table_number: 1, state: 'inactive' }),
      expect.objectContaining({ table_number: 2, state: 'active' }),
    ]);
  });

  it('shows a toast when REST loading fails', async () => {
    vi.mocked(staffApi.getStaffDashboard).mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useStaffDashboard());
    await flush();

    expect(result.current.loading).toBe(false);
    expect(showToast).toHaveBeenCalledWith({
      variant: 'danger',
      title: 'Erro ao carregar dashboard',
    });
  });

  it('ignores invalid WebSocket messages and backup-polls while visible', async () => {
    renderHook(() => useStaffDashboard());
    await flush();

    act(() => {
      FakeWebSocket.instances[0].onmessage?.({ data: 'not-json' } as MessageEvent<string>);
    });
    await act(async () => vi.advanceTimersByTimeAsync(30_000));

    expect(staffApi.getStaffDashboard).toHaveBeenCalledTimes(2);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('reconnects after close and cleans timers and socket on unmount', async () => {
    const { unmount } = renderHook(() => useStaffDashboard());
    await flush();
    const firstSocket = FakeWebSocket.instances[0];

    act(() => firstSocket.onclose?.());
    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    expect(FakeWebSocket.instances).toHaveLength(2);

    const secondSocket = FakeWebSocket.instances[1];
    unmount();
    expect(secondSocket.closed).toBe(true);

    act(() => secondSocket.onclose?.());
    await act(async () => vi.advanceTimersByTimeAsync(60_000));
    expect(FakeWebSocket.instances).toHaveLength(2);
  });
});
