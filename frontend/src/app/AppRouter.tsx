import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AdminPage } from '../features/admin/pages/AdminPage';
import { AuthProvider } from '../features/auth/hooks/useAuth';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { ClientPage } from '../features/client/pages/ClientPage';
import { KitchenLayout } from '../features/kitchen/components/kitchen-layout/KitchenLayout';
import { KitchenHistoryPage } from '../features/kitchen/pages/KitchenHistoryPage';
import { KitchenPage } from '../features/kitchen/pages/KitchenPage';
import { KitchenSettingsPage } from '../features/kitchen/pages/KitchenSettingsPage';
import { NotFoundPage } from '../features/not-found/pages/NotFoundPage';
import { StaffPage } from '../features/staff/pages/StaffPage';
import { ProtectedRoute } from '../components/ProtectedRoute';

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />

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
                <AdminPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
