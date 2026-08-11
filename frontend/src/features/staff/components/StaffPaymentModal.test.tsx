import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { StaffSessionBill } from '../types/staff.types';
import { StaffPaymentModal } from './StaffPaymentModal';

const bill: StaffSessionBill = {
  session_id: 10,
  guests: [
    {
      guest_id: 1,
      label: 'Guest 1',
      buffet_total: '20.00',
      extras_total: '5.00',
      total: '25.00',
    },
  ],
  subtotal: '25.00',
  waste_box_count: 0,
  waste_total: '0.00',
  tip_amount: '0.00',
  total: '25.00',
  is_paid: false,
  paid_at: null,
};

describe('StaffPaymentModal', () => {
  it('renders the bill and calculates waste and tip totals', () => {
    render(<StaffPaymentModal bill={bill} tableNumber={3} onClose={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByText(/Table 03/)).toBeTruthy();
    expect(screen.getByText('Guest 1')).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Waste boxes/), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/Tip amount/), { target: { value: '3.5' } });

    expect(screen.getByText('$40.50')).toBeTruthy();
  });

  it('submits the selected method and normalized amounts', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <StaffPaymentModal bill={bill} tableNumber={3} onClose={vi.fn()} onConfirm={onConfirm} />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'card' } });
    fireEvent.change(screen.getByLabelText(/Waste boxes/), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/Tip amount/), { target: { value: '3.5' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm payment/ }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('card', 3.5, 2));
  });

  it('prevents duplicate submissions while payment is pending', async () => {
    const onConfirm = vi.fn(() => new Promise<void>(() => {}));
    render(
      <StaffPaymentModal bill={bill} tableNumber={3} onClose={vi.fn()} onConfirm={onConfirm} />,
    );

    const button = screen.getByRole('button', { name: /Confirm payment/ });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(
      (screen.getByRole('button', { name: /Saving payment/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('clamps negative inputs before submission', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <StaffPaymentModal bill={bill} tableNumber={3} onClose={vi.fn()} onConfirm={onConfirm} />,
    );

    fireEvent.change(screen.getByLabelText(/Waste boxes/), { target: { value: '-2' } });
    fireEvent.change(screen.getByLabelText(/Tip amount/), { target: { value: '-3' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm payment/ }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('cash', 0, 0));
  });
});
