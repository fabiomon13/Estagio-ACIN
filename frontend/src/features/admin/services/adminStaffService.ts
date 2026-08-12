import { apiFetch } from '../../../services/api/client';
import type { AuthStaff } from '../../auth/hooks/AuthContext';

export function getStaffList(): Promise<AuthStaff[]> {
  return apiFetch<AuthStaff[]>('/staff');
}
