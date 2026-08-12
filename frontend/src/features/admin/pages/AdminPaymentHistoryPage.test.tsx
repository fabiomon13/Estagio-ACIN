import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { apiFetch } from '../../../services/api/client';
import { AdminPaymentHistoryPage } from './AdminPaymentHistoryPage';

vi.mock('../../../services/api/client', async () => {
  const actual = await vi.importActual<typeof import('../../../services/api/client')>(
    '../../../services/api/client',
  );
  return { ...actual, apiFetch: vi.fn() };
});

const apiFetchMock = vi.mocked(apiFetch);

describe('AdminPaymentHistoryPage', () => {
  it('renders payments with formatted totals, method, waiter and date', async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          payment_id: 1,
          session_id: 10,
          table_number: 3,
          guest_count: 2,
          waiter_name: 'Ana Silva',
          amount_paid: '40.50',
          tip_amount: '3.50',
          method: 'card',
          waste_count: 0,
          paid_at: '2026-08-12T10:00:00Z',
        },
      ],
      total_count: 1,
    });

    render(<AdminPaymentHistoryPage />);

    expect(await screen.findByText('Mesa 03')).toBeTruthy();
    expect(screen.getByText('Ana Silva')).toBeTruthy();
    expect(screen.getByText('Cartão')).toBeTruthy();
    expect(screen.getByText(/40,50/)).toBeTruthy();
  });

  it('shows an empty state when there are no payments', async () => {
    apiFetchMock.mockResolvedValue({ items: [], total_count: 0 });

    render(<AdminPaymentHistoryPage />);

    expect(await screen.findByText('Sem pagamentos para estes filtros.')).toBeTruthy();
  });

  it('refetches filtered by table number when the field changes', async () => {
    apiFetchMock.mockResolvedValue({ items: [], total_count: 0 });

    render(<AdminPaymentHistoryPage />);

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText('Mesa'), { target: { value: '5' } });

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(2));
    expect(apiFetchMock).toHaveBeenLastCalledWith(
      '/staff/payments?table_number=5&limit=15&offset=0',
    );
  });
});
