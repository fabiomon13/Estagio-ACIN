// frontend/src/features/client/utils/deviceToken.ts

import { createUuid } from '../../../utils/createUuid';

const STORAGE_KEY = 'scan-and-serve.device-token';
const LEGACY_STORAGE_KEY = 'device_token';

let memoryToken: string | null = null;

// Retrieves the device token from memory, local storage, or generates a new one if not found.
export function getDeviceToken(): string {
  // Check if the token is already stored in memory
  if (memoryToken !== null) {
    return memoryToken;
  }

  // Attempt to read the token from local storage
  const storedToken = readStoredToken();

  // If a token is found in local storage, store it in memory and return it
  if (storedToken !== null) {
    memoryToken = storedToken;
    return storedToken;
  }

  // If no token is found, generate a new one, store it in memory and local storage, and return it
  const newToken = createUuid();

  memoryToken = newToken;
  persistToken(newToken);

  return newToken;
}

function readStoredToken(): string | null {
  // If running in a non-browser environment, return null
  if (typeof window === 'undefined') {
    return null;
  }

  // Attempt to read the token from local storage, handling any potential errors
  try {
    const currentToken = normalizeToken(window.localStorage.getItem(STORAGE_KEY));

    if (currentToken !== null) {
      return currentToken;
    }

    const legacyToken = normalizeToken(window.localStorage.getItem(LEGACY_STORAGE_KEY));

    if (legacyToken !== null) {
      persistToken(legacyToken);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);

      return legacyToken;
    }
  } catch {
    // If an error occurs while accessing local storage, return null
  }

  return null;
}

// Persists the device token to local storage, handling any potential errors
function persistToken(token: string): void {
  // If running in a non-browser environment, do not attempt to persist the token
  if (typeof window === 'undefined') {
    return;
  }

  // Attempt to write the token to local storage, handling any potential errors
  try {
    window.localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // If an error occurs while accessing local storage, return null
  }
}

// Normalizes the token by trimming whitespace and returning null for empty strings
function normalizeToken(token: string | null): string | null {
  const normalizedToken = token?.trim();

  return normalizedToken ? normalizedToken : null;
}
