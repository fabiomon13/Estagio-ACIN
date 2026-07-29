export type SideBarTabProps = {
  label: string;
  isActive: boolean;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  showLabel?: boolean;
  onClick: () => void;
};
