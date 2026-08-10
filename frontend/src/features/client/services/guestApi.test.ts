// frontend/src/features/client/services/guestApi.test.ts

import { beforeEach, describe, expect, it, vi } from 'vitest';
// mock used to simulate guest API responses and errors
const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api/client', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../services/api/client')>();
  return { ...original, apiFetch };
});
import { ApiError } from '../../../services/api/client';
import {
  ensureGuest,
  getCurrentGuest,
  updateGuestAllergyPreferences,
  updateGuestBuffet,
} from './guestApi';

// describe the test suite for guest registration and preferences
describe('guestApi', () => {
  // reset the request mock before every test
  beforeEach(() => apiFetch.mockReset());

  // test case to check if the current guest is loaded with a device token
  it('obtém o cliente atual', () => {
    getCurrentGuest('mesa', 'token');
    expect(apiFetch).toHaveBeenCalledWith(
      '/client/tables/mesa/guests/me',
      expect.objectContaining({ headers: { 'X-Device-Token': 'token' } }),
    );
  });

  // test case to check buffet and allergy preference payloads
  it('atualiza buffet e alergias', () => {
    updateGuestBuffet('mesa', 'token', 2);
    updateGuestAllergyPreferences('mesa', 'token', [3, 1]);
    expect(apiFetch.mock.calls[0][1].body).toBe(JSON.stringify({ buffet_id: 2 }));
    expect(apiFetch.mock.calls[1][1].body).toBe(JSON.stringify({ allergy_tag_ids: [3, 1] }));
  });

  // test case to check if a missing guest is created after a 401 response
  it('cria o cliente quando a consulta devolve 401', async () => {
    const guest = {
      id: 1,
      session_id: 2,
      buffet_id: null,
      allergy_tag_ids: [],
      allergy_preferences_completed_at: null,
    };
    apiFetch.mockRejectedValueOnce(new ApiError(401, 'Unauthorized')).mockResolvedValueOnce(guest);
    await expect(ensureGuest('mesa-nova', 'token-novo')).resolves.toEqual(guest);
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });
});
