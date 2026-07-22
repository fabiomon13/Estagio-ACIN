import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AdminPage } from '../features/admin/pages/AdminPage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { ClientPage } from '../features/client/pages/ClientPage';
import { KitchenPage } from '../features/kitchen/pages/KitchenPage';
import { NotFoundPage } from '../features/not-found/pages/NotFoundPage';
import { StaffPage } from '../features/staff/pages/StaffPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/table/:tableCode" element={<ClientPage />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/kitchen" element={<KitchenPage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/admin" element={<AdminPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
