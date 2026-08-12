import { useCallback, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BillFilledIcon,
  BillIcon,
  HistoryFilledIcon,
  HistoryIcon,
  UsersFilledIcon,
  UsersIcon,
} from '../../../components/icons';
import SideBar from '../../../components/layout/side-bar/SideBar';
import { useAuth } from '../../auth/hooks/AuthContext';
import { StaffProfileModal } from '../../auth/components/StaffProfileModal';

const TABS = [
  {
    id: 'staff',
    path: '/admin',
    label: 'Criar Staff',
    icon: <UsersIcon />,
    activeIcon: <UsersFilledIcon />,
  },
  {
    id: 'sessions',
    path: '/admin/mesas',
    label: 'Mesas',
    icon: <BillIcon />,
    activeIcon: <BillFilledIcon />,
  },
  {
    id: 'payments',
    path: '/admin/pagamentos',
    label: 'Histórico',
    icon: <HistoryIcon />,
    activeIcon: <HistoryFilledIcon />,
  },
] as const;

export function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { staff } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const activeTabId = TABS.find((tab) => tab.path === location.pathname)?.id ?? TABS[0].id;

  const closeProfileModal = useCallback(() => setIsProfileModalOpen(false), []);

  return (
    <div className="flex h-screen bg-background">
      <SideBar
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
          role: staff?.role ?? 'admin',
          profileImageUrl: staff?.photo_url ?? undefined,
          onClick: () => setIsProfileModalOpen(true),
        }}
      />

      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        <Outlet />
      </main>

      <StaffProfileModal isOpen={isProfileModalOpen} onClose={closeProfileModal} />
    </div>
  );
}
