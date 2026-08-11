import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api/client', () => ({ apiFetch }));

import {
  approveSession,
  deactivateSession,
  getStaffDashboard,
  getStaffSessionBill,
  markItemAsServed,
  registerPayment,
  resolveRequest,
} from './staffApi';

describe('staffApi', () => {
  beforeEach(() => apiFetch.mockReset());

  it('requests the staff dashboard', () => {
    getStaffDashboard();
    expect(apiFetch).toHaveBeenCalledWith('/staff/dashboard');
  });

  it.each([
    [approveSession, 12, '/staff/sessions/12/approve', 'POST'],
    [deactivateSession, 13, '/staff/sessions/13/deactivate', 'PATCH'],
    [resolveRequest, 14, '/staff/requests/14/resolve', 'PATCH'],
    [markItemAsServed, 15, '/staff/orders/items/15/serve', 'PATCH'],
  ] as const)('calls the correct mutation endpoint', (action, id, path, method) => {
    action(id);
    expect(apiFetch).toHaveBeenCalledWith(path, { method });
  });

  it('registers a payment with the backend contract', () => {
    const payment = { method: 'mb_way' as const, tip_amount: 2.5, waste_count: 1 };

    registerPayment(21, payment);

    expect(apiFetch).toHaveBeenCalledWith('/staff/sessions/21/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment),
    });
  });

  it('requests a session bill', () => {
    getStaffSessionBill(22);
    expect(apiFetch).toHaveBeenCalledWith('/staff/sessions/22/bill');
  });
});
