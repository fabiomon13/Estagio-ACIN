// frontend/src/features/client/components/orders/OrderProgressCard.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ClientOrder } from '../../services/orderApi';
import { OrderProgressCard } from './OrderProgressCard';

// create an order item in the requested status
function item(
  status: ClientOrder['items'][number]['status']['alias'],
): ClientOrder['items'][number] {
  return {
    id: 1,
    item_id: 3,
    status_id: 1,
    quantity: 2,
    notes: null,
    unit_price_at_order: '4.50',
    status: { id: 1, name: status, alias: status },
    menu_item: { id: 3, name: 'Sopa', alias: 'sopa', photo_url: null },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}
// describe the test suite for the order progress card
describe('OrderProgressCard', () => {
  // test case to check the accessible label for every progress status
  it.each([
    ['pending', 'Recebido'],
    ['preparing', 'Em preparação'],
    ['ready', 'Pronto'],
    ['served', 'Servido'],
  ] as const)('mostra %s', (status, label) => {
    render(<OrderProgressCard item={item(status)} isCancelling={false} onCancel={vi.fn()} />);
    expect(screen.getByText(new RegExp(`Estado atual: ${label}`, 'i'))).toBeTruthy();
  });
  it('permite cancelar apenas quando pendente', () => {
    const onCancel = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <OrderProgressCard item={item('pending')} isCancelling={false} onCancel={onCancel} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar Sopa' }));
    expect(onCancel).toHaveBeenCalledOnce();
    rerender(
      <OrderProgressCard item={item('cancelled')} isCancelling={false} onCancel={onCancel} />,
    );
    expect(screen.queryByRole('button', { name: 'Cancelar Sopa' })).toBeNull();
    expect(screen.getByText('Cancelado')).toBeTruthy();
  });
});
// frontend/src/features/client/components/orders/OrderProgressCard.test.tsx

// test case to check that only pending items can be cancelled
