import type { StaffRole } from '../../../features/auth/hooks/useAuth';

export type ProfileMenuTriggerProps = {
  name: string;
  role: StaffRole;
  profileImageUrl?: string;
  onClick: () => void;
};
