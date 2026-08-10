import type { StaffRole } from '../../../features/auth/hooks/AuthContext';

export type ProfileMenuTriggerProps = {
  name: string;
  role: StaffRole;
  profileImageUrl?: string;
  onClick: () => void;
};
