const STORAGE_KEY = 'device_token';

export function getDeviceToken(): string {
  let token = localStorage.getItem(STORAGE_KEY);

  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, token);
  }

  return token;
}
