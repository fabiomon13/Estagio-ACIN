import { useEffect, useState } from 'react';
import * as adminStaffService from '../services/adminStaffService';
import type { AuthStaff } from '../../auth/hooks/AuthContext';

export type UseAdminStaffList = {
  staff: AuthStaff[];
  isLoading: boolean;
  error: Error | null;
};

export function useAdminStaffList(): UseAdminStaffList {
  const [staff, setStaff] = useState<AuthStaff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadStaff() {
      setIsLoading(true);
      try {
        const result = await adminStaffService.getStaffList();
        setStaff(result);
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    }
    loadStaff();
  }, []);

  return { staff, isLoading, error };
}
