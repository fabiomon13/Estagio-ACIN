// frontend/src/features/client/utils/deviceToken.ts

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

  const token = createSecureToken();

  memoryToken = token;

  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // The token remains stable in memory for this session.
  }

  return token;
}

function createSecureToken(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  if (typeof globalThis.crypto?.getRandomValues !== 'function') {
    throw new Error('Secure random number generation is unavailable.');
  }

  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
    .slice(6, 8)
    .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
}
