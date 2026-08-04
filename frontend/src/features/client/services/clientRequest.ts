import { ApiError } from '../../../services/api/client';

export function buildClientTablePath(tableCode: string): string {
  return `/client/tables/${encodeURIComponent(tableCode)}`;
}

export function createDeviceHeaders(deviceToken: string, includeJson = false): HeadersInit {
  return {
    'X-Device-Token': deviceToken,
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
  };
}

export function isApiStatus(error: unknown, status: number): error is ApiError {
  return error instanceof ApiError && error.status === status;
}
