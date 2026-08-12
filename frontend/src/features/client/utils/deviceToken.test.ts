// frontend/src/features/client/utils/deviceToken.test.ts

import { beforeEach, describe, expect, it, vi } from 'vitest';

// storage key used by the production device-token helper
const STORAGE_KEY = 'scan-and-serve.device-token';

// describe the test suite for persistent anonymous device identity
describe('getDeviceToken', () => {
  // reset module memory and browser storage before every test
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
  });

  // test case to check if an existing token is reused
  it('reutiliza o token guardado', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'token-existente');
    const { getDeviceToken } = await import('./deviceToken');

    expect(getDeviceToken()).toBe('token-existente');
  });

  // test case to check if a missing token is generated and stored
  it('cria e guarda um token quando ainda não existe', async () => {
    const { getDeviceToken } = await import('./deviceToken');
    const token = getDeviceToken();

    expect(token.length).toBeGreaterThan(0);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(token);
    expect(getDeviceToken()).toBe(token);
  });

  // test case to check migration from the legacy storage key
  it('migra o token legado', async () => {
    window.localStorage.setItem('device_token', 'token-legado');
    const { getDeviceToken } = await import('./deviceToken');

    expect(getDeviceToken()).toBe('token-legado');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('token-legado');
    expect(window.localStorage.getItem('device_token')).toBeNull();
  });
});
