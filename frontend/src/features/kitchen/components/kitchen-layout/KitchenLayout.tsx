import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BillFilledIcon,
  BillIcon,
  HistoryFilledIcon,
  HistoryIcon,
  SettingsFilledIcon,
  SettingsIcon,
} from '../../../../components/icons';
import { useAuth } from '../../../auth/hooks/useAuth';
import KitchenSideBar from './kitchen-side-bar/KitchenSideBar';

const TABS = [
  {
    id: 'orders',
    path: '/kitchen',
    label: 'Pedidos',
    icon: <BillIcon />,
    activeIcon: <BillFilledIcon />,
  },
  {
    id: 'history',
    path: '/kitchen/historial',
    label: 'Historial',
    icon: <HistoryIcon />,
    activeIcon: <HistoryFilledIcon />,
  },
  {
    id: 'settings',
    path: '/kitchen/configuracao',
    label: 'Configuração',
    icon: <SettingsIcon />,
    activeIcon: <SettingsFilledIcon />,
  },
] as const;

export function KitchenLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { staff } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const activeTabId = TABS.find((tab) => tab.path === location.pathname)?.id ?? TABS[0].id;

  return (
    <div className="flex h-screen bg-background">
      <KitchenSideBar
        tabs={TABS.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
          activeIcon: tab.activeIcon,
          onClick: () => navigate(tab.path),
        }))}
        activeTabId={activeTabId}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen((prev) => !prev)}
        profile={{
          name: staff?.name ?? '',
          role: staff?.role ?? 'chef',
          onClick: () => {},
        }}
      />

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
