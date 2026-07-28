import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { apiFetch } from '../../../services/api/client';

export type StaffRole = 'admin' | 'waiter' | 'chef';

export type AuthStaff = {
  id: number;
  name: string;
  email: string;
  role: StaffRole;
};

export const ROLE_HOME_ROUTE: Record<StaffRole, string> = {
  admin: '/admin',
  waiter: '/staff',
  chef: '/kitchen',
};

type AuthContextValue = {
  staff: AuthStaff | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthStaff>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Provides authentication state and actions to the entire application
export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<AuthStaff | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Checks whether the user already has a valid session when the app loads
  useEffect(() => {
    apiFetch<AuthStaff>('/auth/me')
      .then(setStaff)
      .catch(() => setStaff(null))
      .finally(() => setIsLoading(false));
  }, []);

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

  return (
    <AuthContext.Provider value={{ staff, isLoading, login, logout }}>
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
