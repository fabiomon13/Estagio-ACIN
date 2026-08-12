// frontend/src/features/client/components/shared/SessionSetup.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SessionSetup } from './SessionSetup';

// example restaurant table used in the tests
const table = { id: 1, table_number: 4, max_capacity: 4, public_code: 'mesa-4' };
// describe the test suite for the session setup screen
describe('SessionSetup', () => {
  // test case to check guest controls and session submission
  it('apresenta a mesa e permite alterar/submeter', () => {
    const onIncrease = vi.fn();
    const onDecrease = vi.fn();
    const onSubmit = vi.fn();
    render(
      <SessionSetup
        table={table}
        guestCount={2}
        isSubmitting={false}
        onDecrease={onDecrease}
        onIncrease={onIncrease}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByText(/mesa 4/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Aumentar/i }));
    fireEvent.click(screen.getByRole('button', { name: /Diminuir/i }));
    fireEvent.click(screen.getByRole('button', { name: /Ver menu/i }));
    expect(onIncrease).toHaveBeenCalledOnce();
    expect(onDecrease).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledOnce();
  });
  it('respeita os limites e bloqueia durante submissão', () => {
    const { rerender } = render(
      <SessionSetup
        table={table}
        guestCount={1}
        isSubmitting={false}
        onDecrease={vi.fn()}
        onIncrease={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect((screen.getByRole('button', { name: /Diminuir/i }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    rerender(
      <SessionSetup
        table={table}
        guestCount={4}
        isSubmitting
        onDecrease={vi.fn()}
        onIncrease={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect((screen.getByRole('button', { name: /Aumentar/i }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect((screen.getByRole('button', { name: /A criar/i }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});
// frontend/src/features/client/components/shared/SessionSetup.test.tsx

// test case to check capacity limits and the submitting state
