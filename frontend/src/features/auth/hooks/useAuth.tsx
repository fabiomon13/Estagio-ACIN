import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ApiError, apiFetch } from '../../../services/api/client';

export type StaffRole = 'admin' | 'waiter' | 'chef';

export type AuthStaff = {
  id: number;
  name: string;
  email: string;
  role: StaffRole;
  photo_url: string | null;
  is_active: boolean;
};

export const ROLE_HOME_ROUTE: Record<StaffRole, string> = {
  admin: '/admin',
  waiter: '/staff',
  chef: '/kitchen',
};

type AuthContextValue = {
  staff: AuthStaff | null;
  isLoading: boolean;
  connectionError: boolean;
  retryConnection: () => void;
  login: (email: string, password: string) => Promise<AuthStaff>;
  logout: () => Promise<void>;
  updateShiftStatus: (isActive: boolean) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Provides authentication state and actions to the entire application
export function AuthProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const isClientRoute = pathname.startsWith('/table/');
  const [staff, setStaff] = useState<AuthStaff | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  // Checks whether the user already has a valid session. A real rejection
  // from the server (ApiError, e.g. 401) means "not authenticated" -- any
  // other failure (no network, server unreachable) doesn't tell us that, so
  // it must not be treated as a logout, or a network blip on page load would
  // kick out an otherwise still-valid session.
  const checkSession = useCallback(() => {
    if (isClientRoute) {
      setIsLoading(false);
      setConnectionError(false);
      return;
    }

    setIsLoading(true);
    apiFetch<AuthStaff>('/auth/me')
      .then((result) => {
        setStaff(result);
        setConnectionError(false);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError) {
          setStaff(null);
          setConnectionError(false);
        } else {
          setConnectionError(true);
        }
      })
      .finally(() => setIsLoading(false));
  }, [isClientRoute]);

  // Checks whether the user already has a valid session when the app loads
  useEffect(() => {
    void Promise.resolve().then(checkSession);
  }, [checkSession]);

  // Authenticates the user and stores the returned staff data
  const login = async (email: string, password: string): Promise<AuthStaff> => {
    const result = await apiFetch<AuthStaff>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    setStaff(result);
    return result;
  };

  // Ends the current session and clears the authenticated staff data
  const logout = async (): Promise<void> => {
    await apiFetch<void>('/auth/logout', { method: 'POST' });
    setStaff(null);
  };

  // Toggles the current staff member's own shift status.
  const updateShiftStatus = async (isActive: boolean): Promise<void> => {
    const result = await apiFetch<AuthStaff>('/auth/me/shift', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }),
    });
    setStaff(result);
  };

  return (
    <AuthContext.Provider
      value={{
        staff,
        isLoading,
        connectionError,
        retryConnection: checkSession,
        login,
        logout,
        updateShiftStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Returns the current authentication state and actions
// Must be used inside AuthProvider
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
