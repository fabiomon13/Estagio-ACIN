import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { ROLE_HOME_ROUTE, useAuth } from '../features/auth/hooks/useAuth';
import type { StaffRole } from '../features/auth/hooks/useAuth';
import { useToast } from './ui/toast/useToast';

type ProtectedRouteProps = {
  roles: StaffRole[];
  children: ReactNode;
};

export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { staff, isLoading } = useAuth();
  const { showToast } = useToast();
  const isAllowed = staff !== null && (staff.role === 'admin' || roles.includes(staff.role));

  useEffect(() => {
    if (!isLoading && staff !== null && !isAllowed) {
      showToast({ variant: 'danger', title: 'Não tens permissão para aceder a esta página.' });
    }
  }, [isLoading, staff, isAllowed, showToast]);

  if (isLoading) {
    return null;
  }

  if (staff === null) {
    return <Navigate to="/login" replace />;
  }

  if (!isAllowed) {
    return <Navigate to={ROLE_HOME_ROUTE[staff.role]} replace />;
  }

  return <>{children}</>;
}
