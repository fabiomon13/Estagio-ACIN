import { createContext, useContext } from 'react';

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

export type AuthContextValue = {
  staff: AuthStaff | null;
  isLoading: boolean;
  connectionError: boolean;
  retryConnection: () => void;
  login: (email: string, password: string) => Promise<AuthStaff>;
  logout: () => Promise<void>;
  updateShiftStatus: (isActive: boolean) => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

// Returns the current authentication state and actions
// Must be used inside AuthProvider
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
