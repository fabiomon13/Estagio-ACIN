// frontend/src/features/client/hooks/useClientOrders.test.ts

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
// mock used to control order refresh responses
const { getOrders } = vi.hoisted(() => ({ getOrders: vi.fn() }));
vi.mock('../services/orderApi', () => ({ getOrders }));
vi.mock('../utils/deviceToken', () => ({ getDeviceToken: () => 'token' }));
import { useClientOrders } from './useClientOrders';

// describe the test suite for the client orders state hook
describe('useClientOrders', () => {
  // reset visibility and API state before every test
  beforeEach(() => {
    getOrders.mockReset();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  });
  it('hidrata e adiciona pedidos no início', () => {
    const { result } = renderHook(() => useClientOrders('mesa'));
    const first = { id: 1 };
    const second = { id: 2 };
    act(() => result.current.hydrateOrders([first] as never[]));
    act(() => result.current.prependOrder(second as never));
    expect(result.current.orders.map((order) => order.id)).toEqual([2, 1]);
  });
  it('atualiza os pedidos', async () => {
    getOrders.mockResolvedValue([{ id: 3 }]);
    const { result } = renderHook(() => useClientOrders('mesa'));
    await act(() => result.current.refetch());
    expect(getOrders).toHaveBeenCalledWith('mesa', 'token');
    expect(result.current.orders[0].id).toBe(3);
  });
  it('guarda uma mensagem quando a atualização falha', async () => {
    getOrders.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useClientOrders('mesa'));
    await act(() => result.current.refetch());
    await waitFor(() => expect(result.current.refreshError).not.toBeNull());
  });
});
// frontend/src/features/client/hooks/useClientOrders.test.ts

// test case to check initial hydration and optimistic insertion
// test case to check if orders can be refreshed from the backend
// test case to check if refresh errors are exposed to the interface
