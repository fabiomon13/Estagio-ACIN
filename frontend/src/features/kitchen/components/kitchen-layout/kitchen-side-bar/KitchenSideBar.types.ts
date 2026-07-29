import type { ProfileMenuTriggerProps } from '../../../../../components/ui/profile-menu-trigger/ProfileMenuTrigger.types';

type SideBarTabs = {
  id: string;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  onClick: () => void;
};

export type KitchenSideBarProps = {
  tabs: SideBarTabs[];
  activeTabId: string;
  isOpen: boolean;
  onToggle: () => void;
  profile: ProfileMenuTriggerProps;
};
