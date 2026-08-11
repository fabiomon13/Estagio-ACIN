import { ApiError } from '../../../services/api/client';

export function getAdminCreateStaffError(error: unknown): string {
  return error instanceof ApiError ? error.detail : 'Erro ao criar conta.';
}
