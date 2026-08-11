import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffProfileModal } from './StaffProfileModal';

vi.mock('../hooks/AuthContext', () => ({
  useAuth: vi.fn(),
  ROLE_HOME_ROUTE: { admin: '/admin', waiter: '/staff', chef: '/kitchen' },
}));
const useLocationMock = vi.fn(() => ({ pathname: '/kitchen' }));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => useLocationMock(),
}));
vi.mock('../../../components/ui/toast/useToast', () => ({
  useToast: vi.fn(),
}));

import { useAuth } from '../hooks/AuthContext';
import type { AuthContextValue } from '../hooks/AuthContext';
import { useToast } from '../../../components/ui/toast/useToast';

const staff = {
  id: 1,
  name: 'Ana Ferreira',
  email: 'ana@test.dev',
  role: 'chef' as const,
  photo_url: null,
  is_active: true,
};

function mockAuth(overrides: Partial<AuthContextValue> = {}) {
  vi.mocked(useAuth).mockReturnValue({
    staff,
    isLoading: false,
    connectionError: false,
    retryConnection: vi.fn(),
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
    updateShiftStatus: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });
}

describe('StaffProfileModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    useLocationMock.mockReturnValue({ pathname: '/kitchen' });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows the staff name, email, and a single shift toggle labeled for an active shift', () => {
    mockAuth();
    render(<StaffProfileModal isOpen onClose={vi.fn()} />);

    expect(screen.getByText('Ana Ferreira')).toBeDefined();
    expect(screen.getByText('ana@test.dev')).toBeDefined();
    expect(screen.getByText('Em Serviço')).toBeDefined();
    expect(screen.getByRole('button', { name: /fechar turno/i })).toBeDefined();
  });

  it('calls updateShiftStatus with the toggled value', async () => {
    const updateShiftStatus = vi.fn().mockResolvedValue(undefined);
    mockAuth({ updateShiftStatus });
    render(<StaffProfileModal isOpen onClose={vi.fn()} />);

    const shiftButton = screen.getByRole('button', { name: /fechar turno/i });
    await act(async () => {
      fireEvent.click(shiftButton);
    });

    await waitFor(() => {
      expect(updateShiftStatus).toHaveBeenCalledWith(false);
    });
  });

  it('shows a toast when shift toggle fails', async () => {
    const updateShiftStatus = vi.fn().mockRejectedValue(new Error('API error'));
    const showToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ showToast });
    mockAuth({ updateShiftStatus });
    render(<StaffProfileModal isOpen onClose={vi.fn()} />);

    const shiftButton = screen.getByRole('button', { name: /fechar turno/i });
    await act(async () => {
      fireEvent.click(shiftButton);
    });

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith({
        variant: 'danger',
        title: 'Não foi possível alterar turno',
      });
    });
  });

  it('asks for confirmation before logging out, and only logs out on confirm', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    mockAuth({ logout });
    render(<StaffProfileModal isOpen onClose={vi.fn()} />);

    const logoutButton = screen.getByRole('button', { name: /terminar sessão/i });
    fireEvent.click(logoutButton);
    expect(logout).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /sim, sair/i }));
    await waitFor(() => {
      expect(logout).toHaveBeenCalled();
    });
  });

  it('renders nothing when isOpen is false', () => {
    mockAuth();
    const { container } = render(<StaffProfileModal isOpen={false} onClose={vi.fn()} />);

    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('does not show area shortcuts for a non-admin staff member', () => {
    mockAuth();
    render(<StaffProfileModal isOpen onClose={vi.fn()} />);

    expect(screen.queryByText('Atalhos')).toBeNull();
  });

  it('shows shortcuts to the other two areas for an admin, excluding the current one', () => {
    useLocationMock.mockReturnValue({ pathname: '/kitchen' });
    mockAuth({ staff: { ...staff, role: 'admin' } });
    render(<StaffProfileModal isOpen onClose={vi.fn()} />);

    expect(screen.getByRole('button', { name: /ir para staff/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /ir para admin/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /ir para cozinha/i })).toBeNull();
  });

  it('shows all three shortcuts when the admin is on a page outside those areas', () => {
    useLocationMock.mockReturnValue({ pathname: '/login' });
    mockAuth({ staff: { ...staff, role: 'admin' } });
    render(<StaffProfileModal isOpen onClose={vi.fn()} />);

    expect(screen.getByRole('button', { name: /ir para staff/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /ir para cozinha/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /ir para admin/i })).toBeDefined();
  });

  it('closes the modal and navigates when a shortcut is clicked', () => {
    useLocationMock.mockReturnValue({ pathname: '/admin' });
    mockAuth({ staff: { ...staff, role: 'admin' } });
    const onClose = vi.fn();
    render(<StaffProfileModal isOpen onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /ir para staff/i }));

    expect(onClose).toHaveBeenCalled();
  });
});
