// frontend/src/features/client/components/shared/ClientHeader.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClientHeader } from './ClientHeader';

// render the header and expose its interaction callbacks
function renderHeader(active = {}) {
  const onServiceRequest = vi.fn();
  const onEditAllergies = vi.fn();
  const onChangeView = vi.fn();
  render(
    <ClientHeader
      tableNumber={3}
      activeView="menu"
      isDragging={false}
      indicatorPosition={0}
      pendingServiceRequest={null}
      activeServiceRequests={active}
      showBuffet
      onChangeView={onChangeView}
      onServiceRequest={onServiceRequest}
      onEditAllergies={onEditAllergies}
    />,
  );
  return { onServiceRequest, onEditAllergies, onChangeView };
}
// describe the test suite for client navigation and service actions
describe('ClientHeader', () => {
  // test case to check allergy, payment, and assistance actions
  it('executa as ações de serviço e alergias', () => {
    const callbacks = renderHeader();
    fireEvent.click(screen.getByRole('button', { name: /Editar alergias/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Pedir a conta' }));
    fireEvent.click(screen.getByRole('button', { name: /Chamar um funcionário/i }));
    expect(callbacks.onEditAllergies).toHaveBeenCalledOnce();
    expect(callbacks.onServiceRequest.mock.calls).toEqual([['payment_request'], ['assistance']]);
  });
  it('altera o rótulo de um pedido ativo', () => {
    renderHeader({ payment_request: 7 });
    expect(
      screen.getByRole('button', { name: 'Cancelar pedido de conta' }).getAttribute('aria-pressed'),
    ).toBe('true');
  });
});
// frontend/src/features/client/components/shared/ClientHeader.test.tsx

// test case to check the label and pressed state of an active request
