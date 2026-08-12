import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as apiClient from '../../../services/api/client';
import { AuthProvider } from './useAuth';
import { useAuth } from './AuthContext';

vi.mock('../../../services/api/client', async () => {
  const actual = await vi.importActual<typeof import('../../../services/api/client')>(
    '../../../services/api/client',
  );
  return { ...actual, apiFetch: vi.fn() };
});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  );
}

describe('useAuth updateShiftStatus', () => {
  beforeEach(() => {
    vi.mocked(apiClient.apiFetch).mockReset();
  });

  it('PATCHes the new shift status and updates the local staff state', async () => {
    const staff = {
      id: 1,
      name: 'Ana',
      email: 'ana@test.dev',
      role: 'chef' as const,
      photo_url: null,
      is_active: true,
    };
    vi.mocked(apiClient.apiFetch)
      .mockResolvedValueOnce(staff) // initial GET /auth/me on mount
      .mockResolvedValueOnce({ ...staff, is_active: false }); // PATCH /auth/me/shift

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateShiftStatus(false);
    });

    expect(apiClient.apiFetch).toHaveBeenLastCalledWith('/auth/me/shift', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: false }),
    });
    expect(result.current.staff?.is_active).toBe(false);
  });
});
