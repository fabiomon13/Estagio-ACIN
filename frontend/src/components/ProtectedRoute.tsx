import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { ROLE_HOME_ROUTE, useAuth } from '../features/auth/hooks/useAuth';
import type { StaffRole } from '../features/auth/hooks/useAuth';
import Button from './ui/button/Button';
import Loader from './ui/loader/Loader';
import { useToast } from './ui/toast/useToast';

type ProtectedRouteProps = {
  roles: StaffRole[];
  children: ReactNode;
};

export function ProtectedRoute({ roles, children }: ProtectedRouteProps) {
  const { staff, isLoading, connectionError, retryConnection } = useAuth();
  const { showToast } = useToast();
  const isAllowed = staff !== null && (staff.role === 'admin' || roles.includes(staff.role));

  useEffect(() => {
    if (!isLoading && staff !== null && !isAllowed) {
      showToast({ variant: 'danger', title: 'Não tens permissão para aceder a esta página.' });
    }
  }, [isLoading, staff, isAllowed, showToast]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader label="A verificar sessão..." />
      </div>
    );
  }

  // A network/server failure isn't the same as "not logged in" -- don't
  // bounce to /login over a connection blip. Offer to retry instead.
  if (connectionError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-content">Não foi possível ligar ao servidor.</p>
        <Button onClick={retryConnection}>Tentar novamente</Button>
      </div>
    );
  }

  if (staff === null) {
    return <Navigate to="/login" replace />;
  }

  if (!isAllowed) {
    return <Navigate to={ROLE_HOME_ROUTE[staff.role]} replace />;
  }

  return <>{children}</>;
}
