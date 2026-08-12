import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthContextValue, AuthStaff } from '../features/auth/hooks/AuthContext';
import { useAuth } from '../features/auth/hooks/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';

vi.mock('../features/auth/hooks/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('../features/auth/hooks/AuthContext')>(
    '../features/auth/hooks/AuthContext',
  );
  return { ...actual, useAuth: vi.fn() };
});

const showToast = vi.fn();
vi.mock('./ui/toast/useToast', () => ({
  useToast: () => ({ showToast }),
}));

const useAuthMock = vi.mocked(useAuth);
const retryConnection = vi.fn();

const staff = (role: AuthStaff['role']): AuthStaff => ({
  id: 1,
  name: 'Test Staff',
  email: 'staff@test.dev',
  role,
  photo_url: null,
  is_active: true,
});

function authState(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    staff: staff('admin'),
    isLoading: false,
    connectionError: false,
    retryConnection,
    login: vi.fn(),
    logout: vi.fn(),
    updateShiftStatus: vi.fn(),
    ...overrides,
  };
}

function renderAdminRoute() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <p>Admin content</p>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<p>Login page</p>} />
        <Route path="/staff" element={<p>Staff home</p>} />
        <Route path="/kitchen" element={<p>Kitchen home</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute admin access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue(authState());
  });

  it('renders the admin page for an administrator', () => {
    renderAdminRoute();
    expect(screen.getByText('Admin content')).toBeTruthy();
  });

  it.each([
    ['waiter', 'Staff home'],
    ['chef', 'Kitchen home'],
  ] as const)('redirects a %s to the correct role home', async (role, destination) => {
    useAuthMock.mockReturnValue(authState({ staff: staff(role) }));

    renderAdminRoute();

    expect(await screen.findByText(destination)).toBeTruthy();
    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(1));
  });

  it('redirects an unauthenticated user to login', async () => {
    useAuthMock.mockReturnValue(authState({ staff: null }));
    renderAdminRoute();
    expect(await screen.findByText('Login page')).toBeTruthy();
  });

  it('shows a loading state while authentication is being checked', () => {
    useAuthMock.mockReturnValue(authState({ isLoading: true }));
    renderAdminRoute();
    expect(screen.getByText(/verificar sess/)).toBeTruthy();
  });

  it('offers a retry instead of redirecting on connection failure', () => {
    useAuthMock.mockReturnValue(authState({ connectionError: true }));
    renderAdminRoute();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(retryConnection).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Login page')).toBeNull();
  });
});
