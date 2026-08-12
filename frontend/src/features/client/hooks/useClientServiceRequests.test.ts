// frontend/src/features/client/hooks/useClientServiceRequests.test.ts

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
// mocks used to control service requests and toast notifications
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  create: vi.fn(),
  cancel: vi.fn(),
  toast: vi.fn(),
}));
vi.mock('../services/serviceRequestApi', () => ({
  getServiceRequests: mocks.get,
  createServiceRequest: mocks.create,
  cancelServiceRequest: mocks.cancel,
}));
vi.mock('../utils/deviceToken', () => ({ getDeviceToken: () => 'token' }));
vi.mock('../../../components/ui/toast/useToast', () => ({
  useToast: () => ({ showToast: mocks.toast }),
}));
import { useClientServiceRequests } from './useClientServiceRequests';

// example active assistance request used in the tests
const request = {
  id: 4,
  resolved_at: null,
  status: { alias: 'pending' },
  request_type: { alias: 'assistance' },
};
// describe the test suite for the service request state hook
describe('useClientServiceRequests', () => {
  // reset all service mocks before every test
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.get.mockResolvedValue([]);
  });
  it('carrega pedidos ativos', async () => {
    mocks.get.mockResolvedValue([request]);
    const { result } = renderHook(() =>
      useClientServiceRequests({ tableCode: 'mesa', enabled: true }),
    );
    await waitFor(() => expect(result.current.activeRequests.assistance).toBe(4));
  });
  it('cria e cancela um pedido', async () => {
    mocks.create.mockResolvedValue({ id: 8 });
    mocks.cancel.mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useClientServiceRequests({ tableCode: 'mesa', enabled: true }),
    );
    await waitFor(() => expect(mocks.get).toHaveBeenCalled());
    await act(() => result.current.toggleRequest('assistance'));
    expect(result.current.activeRequests.assistance).toBe(8);
    await act(() => result.current.toggleRequest('assistance'));
    expect(mocks.cancel).toHaveBeenCalledWith('mesa', 'token', 8);
    expect(result.current.activeRequests.assistance).toBeUndefined();
  });
  it('expõe erro de atualização', async () => {
    mocks.get.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() =>
      useClientServiceRequests({ tableCode: 'mesa', enabled: true }),
    );
    await waitFor(() => expect(result.current.refreshError).not.toBeNull());
  });
});
// frontend/src/features/client/hooks/useClientServiceRequests.test.ts

// test case to check if active requests are loaded
// test case to check the create and cancel toggle flow
// test case to check if refresh errors are exposed
