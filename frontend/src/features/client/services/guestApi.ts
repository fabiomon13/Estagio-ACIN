// frontend/src/features/client/services/guestApi.ts

import { apiFetch } from '../../../services/api/client';
import { buildClientTablePath, createDeviceHeaders, isApiStatus } from './clientRequest';

export type Guest = Readonly<{
  id: number;
  session_id: number;
  buffet_id: number | null;
  allergy_tag_ids: readonly number[];
  allergy_preferences_completed_at: string | null;
}>;

export type GuestId = Guest['id'];
export type BuffetId = NonNullable<Guest['buffet_id']>;

export type GuestRequestOptions = Readonly<{
  signal?: AbortSignal;
}>;

const pendingGuestRequests = new Map<string, Promise<Guest>>();

// Builds the URL path for the guests endpoint based on the provided table code
function buildGuestsPath(tableCode: string): string {
  return `${buildClientTablePath(tableCode)}/guests`;
}

// Builds the URL path for the current guest endpoint based on the provided table code
function buildCurrentGuestPath(tableCode: string): string {
  return `${buildGuestsPath(tableCode)}/me`;
}

// Fetches the current guest for the specified table code and device token, returning a Promise that resolves to the Guest object
export function getCurrentGuest(
  tableCode: string,
  deviceToken: string,
  options: GuestRequestOptions = {},
): Promise<Guest> {
  return apiFetch<Guest>(buildCurrentGuestPath(tableCode), {
    headers: createDeviceHeaders(deviceToken),
    signal: options.signal,
  });
}

// Creates a new guest for the specified table code and device token, returning the created guest object
export function createGuest(
  tableCode: string,
  deviceToken: string,
  options: GuestRequestOptions = {},
): Promise<Guest> {
  // Makes a POST request to the guests endpoint for the specified table code, including the device token in the request headers and body
  return apiFetch<Guest>(buildGuestsPath(tableCode), {
    method: 'POST',
    headers: createDeviceHeaders(deviceToken, {
      includeJson: true,
    }),
    signal: options.signal,
    body: JSON.stringify({
      buffet_id: null,
      device_token: deviceToken,
    }),
  });
}

// Updates the buffet selection for the current guest, sending a PATCH request to the buffet endpoint with the specified buffet ID
export function updateGuestBuffet(
  tableCode: string,
  deviceToken: string,
  buffetId: BuffetId | null,
  options: GuestRequestOptions = {},
): Promise<Guest> {
  return apiFetch<Guest>(`${buildCurrentGuestPath(tableCode)}/buffet`, {
    method: 'PATCH',
    headers: createDeviceHeaders(deviceToken, {
      includeJson: true,
    }),
    signal: options.signal,
    body: JSON.stringify({
      buffet_id: buffetId,
    }),
  });
}

// Updates the allergy preferences for the current guest, sending a PUT request to the allergy-preferences endpoint with the specified allergy tag IDs
export function updateGuestAllergyPreferences(
  tableCode: string,
  deviceToken: string,
  allergyTagIds: readonly number[],
  options: GuestRequestOptions = {},
): Promise<Guest> {
  return apiFetch<Guest>(`${buildCurrentGuestPath(tableCode)}/allergy-preferences`, {
    method: 'PUT',
    headers: createDeviceHeaders(deviceToken, {
      includeJson: true,
    }),
    signal: options.signal,
    body: JSON.stringify({
      allergy_tag_ids: allergyTagIds,
    }),
  });
}

// Ensures that a guest exists for the specified table code and device token, creating one if necessary, and returns a Promise that resolves to the Guest object
export function ensureGuest(tableCode: string, deviceToken: string): Promise<Guest> {
  const requestKey = createGuestRequestKey(tableCode, deviceToken);

  const pendingRequest = pendingGuestRequests.get(requestKey);

  // If there is already a pending request for this table code and device token, return the existing Promise to avoid duplicate requests
  if (pendingRequest) {
    return pendingRequest;
  }

  // If there is no pending request, initiate a new request to ensure the guest exists and track it in the pendingGuestRequests map
  const trackedRequest = ensureGuestExists(tableCode, deviceToken).finally(() => {
    if (pendingGuestRequests.get(requestKey) === trackedRequest) {
      pendingGuestRequests.delete(requestKey);
    }
  });

  pendingGuestRequests.set(requestKey, trackedRequest);

  return trackedRequest;
}

// Attempts to fetch the current guest, and if not found (401), creates a new guest.
// If a conflict occurs (409), it retries fetching the current guest.
async function ensureGuestExists(tableCode: string, deviceToken: string): Promise<Guest> {
  try {
    return await getCurrentGuest(tableCode, deviceToken);
  } catch (error) {
    if (!isApiStatus(error, 401)) {
      throw error;
    }
  }

  try {
    return await createGuest(tableCode, deviceToken);
  } catch (creationError) {
    if (!isApiStatus(creationError, 409)) {
      throw creationError;
    }

    try {
      return await getCurrentGuest(tableCode, deviceToken);
    } catch {
      // Preserve the original creation error if fetching the current guest fails after a conflict
      throw creationError;
    }
  }
}

// Creates a unique key for tracking pending guest requests based on the table code and device token, ensuring that requests are not duplicated
function createGuestRequestKey(tableCode: string, deviceToken: string): string {
  return JSON.stringify([tableCode.trim(), deviceToken.trim()]);
}
