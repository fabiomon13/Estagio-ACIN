// frontend/src/features/client/utils/deviceToken.ts

import { createUuid } from '../../../utils/createUuid';

const STORAGE_KEY = 'device_token';

let memoryToken: string | null = null;

export function getDeviceToken(): string {
  if (memoryToken) {
    return memoryToken;
  }

  try {
    const storedToken =
      typeof window === 'undefined' ? null : window.localStorage.getItem(STORAGE_KEY);

    if (storedToken) {
      memoryToken = storedToken;
      return storedToken;
    }
  } catch {
    // Continue with an in-memory token.
  }

  const token = createUuid();

  memoryToken = token;

  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // The token remains stable in memory for this session.
  }

  return token;
}
