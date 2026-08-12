// frontend/src/features/client/services/orderApi.test.ts

import { beforeEach, describe, expect, it, vi } from 'vitest';
const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api/client', () => ({ apiFetch }));
import { cancelOrderItem, createOrder, getOrders } from './orderApi';

// describe the test suite for the client order API
describe('orderApi', () => {
  // reset the request mock before every test
  beforeEach(() => apiFetch.mockReset());

  // test case to check if orders are requested with the device token
  it('lista pedidos com o token', () => {
    getOrders('mesa 1', 'token');
    expect(apiFetch).toHaveBeenCalledWith(
      '/client/tables/mesa%201/orders',
      expect.objectContaining({ headers: expect.objectContaining({ 'X-Device-Token': 'token' }) }),
    );
  });

  // test case to check the payload sent when an order is created
  it('envia o contrato esperado ao criar um pedido', () => {
    createOrder('mesa', 'token', {
      clientRequestId: 'uuid',
      items: [{ itemId: 2, quantity: 3, notes: 'sem sal' }],
    });
    expect(apiFetch).toHaveBeenCalledWith(
      '/client/tables/mesa/orders',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          client_request_id: 'uuid',
          items: [{ item_id: 2, quantity: 3, notes: 'sem sal' }],
        }),
      }),
    );
  });

  // test case to check if invalid order data is rejected locally
  it('rejeita pedidos inválidos', () => {
    expect(() => createOrder('mesa', 'token', { clientRequestId: '', items: [] })).toThrow();
    expect(() =>
      createOrder('mesa', 'token', { clientRequestId: 'x', items: [{ itemId: 0, quantity: 1 }] }),
    ).toThrow();
    expect(() =>
      createOrder('mesa', 'token', { clientRequestId: 'x', items: [{ itemId: 1, quantity: 0 }] }),
    ).toThrow();
  });

  // test case to check the endpoint used to cancel an order item
  it('cancela um artigo', () => {
    cancelOrderItem('mesa', 4, 8, 'token');
    expect(apiFetch).toHaveBeenCalledWith(
      '/client/tables/mesa/orders/4/items/8/cancel',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});
