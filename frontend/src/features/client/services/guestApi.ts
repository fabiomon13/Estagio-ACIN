import { ApiError, apiFetch } from '../../../services/api/client';

export type Guest = {
  id: number;
  session_id: number;
  buffet_id: number | null;
};

function deviceTokenHeaders(deviceToken: string): HeadersInit {
  return { 'X-Device-Token': deviceToken };
}

export function getCurrentGuest(tableCode: string, deviceToken: string): Promise<Guest> {
  return apiFetch<Guest>(`/client/tables/${encodeURIComponent(tableCode)}/guests/me`, {
    headers: deviceTokenHeaders(deviceToken),
  });
}

export function createGuest(tableCode: string, deviceToken: string): Promise<Guest> {
  return apiFetch<Guest>(`/client/tables/${encodeURIComponent(tableCode)}/guests`, {
    method: 'POST',
    headers: {
      ...deviceTokenHeaders(deviceToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      buffet_id: null,
      device_token: deviceToken,
    }),
  });
}

export function updateGuestBuffet(
  tableCode: string,
  deviceToken: string,
  buffetId: number | null,
): Promise<Guest> {
  return apiFetch<Guest>(`/client/tables/${encodeURIComponent(tableCode)}/guests/me/buffet`, {
    method: 'PATCH',
    headers: {
      ...deviceTokenHeaders(deviceToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ buffet_id: buffetId }),
  });
}

const pendingGuestRequests = new Map<string, Promise<Guest>>();

export function ensureGuest(tableCode: string, deviceToken: string): Promise<Guest> {
  const key = `${tableCode}:${deviceToken}`;
  const existingRequest = pendingGuestRequests.get(key);

  if (existingRequest) {
    return existingRequest;
  }

  const request = (async () => {
    try {
      return await getCurrentGuest(tableCode, deviceToken);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error;
      }
    }

    try {
      return await createGuest(tableCode, deviceToken);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 409) {
        throw error;
      }

      try {
        return await getCurrentGuest(tableCode, deviceToken);
      } catch {
        throw error;
      }
    }
  })();

  pendingGuestRequests.set(key, request);
  request.catch(() => pendingGuestRequests.delete(key));

  return request;
}
