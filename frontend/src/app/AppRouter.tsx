import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { AuthProvider } from '../features/auth/hooks/useAuth';
import { ProtectedRoute } from '../components/ProtectedRoute';

const AdminLayout = lazy(() =>
  import('../features/admin/components/AdminLayout').then(({ AdminLayout }) => ({
    default: AdminLayout,
  })),
);
const AdminPage = lazy(() =>
  import('../features/admin/pages/AdminPage').then(({ AdminPage }) => ({ default: AdminPage })),
);
const AdminPaymentHistoryPage = lazy(() =>
  import('../features/admin/pages/AdminPaymentHistoryPage').then(({ AdminPaymentHistoryPage }) => ({
    default: AdminPaymentHistoryPage,
  })),
);
const AdminSessionHistoryPage = lazy(() =>
  import('../features/admin/pages/AdminSessionHistoryPage').then(({ AdminSessionHistoryPage }) => ({
    default: AdminSessionHistoryPage,
  })),
);
const ClientPage = lazy(() =>
  import('../features/client/pages/ClientPage').then(({ ClientPage }) => ({ default: ClientPage })),
);
const KitchenLayout = lazy(() =>
  import('../features/kitchen/components/kitchen-layout/KitchenLayout').then(
    ({ KitchenLayout }) => ({ default: KitchenLayout }),
  ),
);
const KitchenHistoryPage = lazy(() =>
  import('../features/kitchen/pages/KitchenHistoryPage').then(({ KitchenHistoryPage }) => ({
    default: KitchenHistoryPage,
  })),
);
const KitchenPage = lazy(() =>
  import('../features/kitchen/pages/KitchenPage').then(({ KitchenPage }) => ({
    default: KitchenPage,
  })),
);
const KitchenSettingsPage = lazy(() =>
  import('../features/kitchen/pages/KitchenSettingsPage').then(({ KitchenSettingsPage }) => ({
    default: KitchenSettingsPage,
  })),
);
const LandingPage = lazy(() => import('../features/landing-page/pages/LandingPage'));
const LoginPage = lazy(() =>
  import('../features/auth/pages/LoginPage').then(({ LoginPage }) => ({ default: LoginPage })),
);
const NotFoundPage = lazy(() =>
  import('../features/not-found/pages/NotFoundPage').then(({ NotFoundPage }) => ({
    default: NotFoundPage,
  })),
);
const StaffPage = lazy(() =>
  import('../features/staff/pages/StaffPage').then(({ StaffPage }) => ({ default: StaffPage })),
);

function RouteFallback() {
  return (
    <div
      className="grid min-h-dvh place-items-center bg-app px-6 text-center text-content-muted"
      role="status"
    >
      A carregar…
    </div>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />

            <Route path="/table/:tableCode" element={<ClientPage />} />

            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/kitchen"
              element={
                <ProtectedRoute roles={['chef']}>
                  <KitchenLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<KitchenPage />} />
              <Route path="historial" element={<KitchenHistoryPage />} />
              <Route path="configuracao" element={<KitchenSettingsPage />} />
            </Route>
            <Route
              path="/staff"
              element={
                <ProtectedRoute roles={['waiter']}>
                  <StaffPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminPage />} />
              <Route path="mesas" element={<AdminSessionHistoryPage />} />
              <Route path="pagamentos" element={<AdminPaymentHistoryPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
