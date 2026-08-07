// frontend/src/features/client/services/clientRequest.ts

import { ApiError } from '../../../services/api/client';

const CLIENT_TABLES_PATH = '/client/tables';
const DEVICE_TOKEN_HEADER = 'X-Device-Token';

type DeviceHeaderOptions = Readonly<{
  includeJson?: boolean;
}>;

// Builds the URL path for a client table based on the provided table code
export function buildClientTablePath(tableCode: string): string {
  const normalizedTableCode = requireValue(tableCode, 'O código da mesa é obrigatório');

  return `${CLIENT_TABLES_PATH}/${encodeURIComponent(normalizedTableCode)}`;
}

// Creates headers for API requests that include the device token and optional JSON content type
export function createDeviceHeaders(
  deviceToken: string,
  options: DeviceHeaderOptions = {},
): HeadersInit {
  // Normalize the device token and ensure it is not empty, throwing an error if it is
  const normalizedDeviceToken = requireValue(deviceToken, 'O token do dispositivo é obrigatório');

  // Initialize headers with the device token
  const headers: Record<string, string> = {
    [DEVICE_TOKEN_HEADER]: normalizedDeviceToken,
  };

  // If the includeJson option is set, add the Content-Type header for JSON
  if (options.includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

// Checks if an error is an instance of ApiError and matches the specified status code
export function isApiStatus(error: unknown, status: number): error is ApiError {
  return error instanceof ApiError && error.status === status;
}

// Validates that a value is a non-empty string, throwing an error with the provided message if it is not
function requireValue(value: string, errorMessage: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(errorMessage);
  }

  return normalizedValue;
}
