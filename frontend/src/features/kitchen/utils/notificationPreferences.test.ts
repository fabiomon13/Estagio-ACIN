import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
} from './notificationPreferences';

describe('notificationPreferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns all-enabled defaults when nothing is stored', () => {
    expect(loadNotificationPreferences()).toEqual({
      notificationsEnabled: true,
      soundEnabled: true,
      enabledTypes: { 'new-order': true, 'ready-too-long': true },
    });
  });

  it('round-trips a saved value', () => {
    saveNotificationPreferences({
      notificationsEnabled: false,
      soundEnabled: true,
      enabledTypes: { 'new-order': true, 'ready-too-long': false },
    });

    expect(loadNotificationPreferences()).toEqual({
      notificationsEnabled: false,
      soundEnabled: true,
      enabledTypes: { 'new-order': true, 'ready-too-long': false },
    });
  });

  it('falls back to defaults when the stored value is corrupted JSON', () => {
    localStorage.setItem('kitchen.notificationPreferences', '{not valid json');

    expect(loadNotificationPreferences()).toEqual({
      notificationsEnabled: true,
      soundEnabled: true,
      enabledTypes: { 'new-order': true, 'ready-too-long': true },
    });
  });

  it('fills in missing fields from a partial stored object', () => {
    localStorage.setItem(
      'kitchen.notificationPreferences',
      JSON.stringify({ soundEnabled: false }),
    );

    expect(loadNotificationPreferences()).toEqual({
      notificationsEnabled: true,
      soundEnabled: false,
      enabledTypes: { 'new-order': true, 'ready-too-long': true },
    });
  });
});
