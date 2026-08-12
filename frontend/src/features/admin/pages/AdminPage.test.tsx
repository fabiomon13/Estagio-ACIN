import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiFetch } from '../../../services/api/client';
import { getAdminCreateStaffError } from '../utils/adminErrors';
import { AdminPage } from './AdminPage';

function renderAdminPage() {
  return render(<AdminPage />);
}

vi.mock('../../../services/api/client', async () => {
  const actual = await vi.importActual<typeof import('../../../services/api/client')>(
    '../../../services/api/client',
  );
  return { ...actual, apiFetch: vi.fn() };
});

const apiFetchMock = vi.mocked(apiFetch);

const showToastMock = vi.fn();
vi.mock('../../../components/ui/toast/useToast', () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

function fillForm(role: 'Waiter' | 'Chef' | 'Admin' = 'Waiter') {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ana Silva' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@test.dev' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'safe-password' } });
  fireEvent.click(screen.getByLabelText(role));
}

describe('AdminPage', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    showToastMock.mockReset();
  });

  it('creates a staff account with the selected role and shows a success toast', async () => {
    apiFetchMock.mockResolvedValue({
      id: 4,
      name: 'Ana Silva',
      email: 'ana@test.dev',
      role: 'chef',
      photo_url: null,
      is_active: true,
    });
    renderAdminPage();
    fillForm('Chef');

    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    await waitFor(() =>
      expect(apiFetchMock).toHaveBeenCalledWith('/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Ana Silva',
          email: 'ana@test.dev',
          password: 'safe-password',
          role: 'chef',
        }),
      }),
    );
    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith({
        variant: 'success',
        title: 'Conta criada',
        description: 'Ana Silva (ana@test.dev, chef)',
      }),
    );
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Waiter') as HTMLInputElement).checked).toBe(true);
  });

  it.each([
    ['Waiter', 'waiter'],
    ['Chef', 'chef'],
    ['Admin', 'admin'],
  ] as const)('serializes the %s role as %s', async (label, role) => {
    apiFetchMock.mockResolvedValue({
      id: 1,
      name: 'Ana Silva',
      email: 'ana@test.dev',
      role,
      photo_url: null,
      is_active: true,
    });
    renderAdminPage();
    fillForm(label);

    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    await waitFor(() =>
      expect(apiFetchMock).toHaveBeenCalledWith(
        '/staff',
        expect.objectContaining({ body: expect.stringContaining(`"role":"${role}"`) }),
      ),
    );
    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'success', title: 'Conta criada' }),
      ),
    );
  });

  it('uses the backend detail for an API error', () => {
    expect(getAdminCreateStaffError(new ApiError(409, 'Email already exists'))).toBe(
      'Email already exists',
    );
  });

  it('uses a safe fallback for unexpected errors', () => {
    expect(getAdminCreateStaffError(new Error('network details'))).toBe('Erro ao criar conta.');
  });

  it('disables submission while the request is pending', async () => {
    let resolveRequest!: (value: never) => void;
    apiFetchMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    renderAdminPage();
    fillForm();

    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    const button = await screen.findByRole('button', { name: 'A criar...' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(apiFetchMock).toHaveBeenCalledTimes(1);

    resolveRequest({
      id: 1,
      name: 'Ana Silva',
      email: 'ana@test.dev',
      role: 'waiter',
      photo_url: null,
      is_active: true,
    } as never);
    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'success', title: 'Conta criada' }),
      ),
    );
  });
});
