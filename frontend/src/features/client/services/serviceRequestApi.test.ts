// frontend/src/features/client/services/serviceRequestApi.test.ts

import { beforeEach, describe, expect, it, vi } from 'vitest';
const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api/client', () => ({ apiFetch }));
import {
  cancelServiceRequest,
  createServiceRequest,
  getServiceRequests,
} from './serviceRequestApi';

// describe the test suite for assistance and payment requests
describe('serviceRequestApi', () => {
  // reset the request mock before every test
  beforeEach(() => apiFetch.mockReset());
  it('cria um pedido de assistência', () => {
    createServiceRequest('mesa', 'token', 'assistance');
    expect(apiFetch).toHaveBeenCalledWith(
      '/client/tables/mesa/service-requests',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ type: 'assistance' }) }),
    );
  });

  // test case to check if an existing service request can be cancelled
  it('cancela um pedido', () => {
    cancelServiceRequest('mesa', 'token', 7);
    expect(apiFetch).toHaveBeenCalledWith(
      '/client/tables/mesa/service-requests/7/cancel',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  // test case to check if service requests are loaded with authentication
  it('lista os pedidos', () => {
    getServiceRequests('mesa', 'token');
    expect(apiFetch).toHaveBeenCalledWith(
      '/client/tables/mesa/service-requests',
      expect.objectContaining({ headers: { 'X-Device-Token': 'token' } }),
    );
  });
});
