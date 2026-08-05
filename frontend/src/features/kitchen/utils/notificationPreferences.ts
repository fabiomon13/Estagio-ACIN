import type { NotificationPreferences } from '../types/notification.types';

const STORAGE_KEY = 'kitchen.notificationPreferences';

const DEFAULT_PREFERENCES: NotificationPreferences = {
  notificationsEnabled: true,
  soundEnabled: true,
  enabledTypes: {
    'new-order': true,
    'ready-too-long': true,
  },
};

export function loadNotificationPreferences(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;

    const parsed = JSON.parse(raw);

    return {
      notificationsEnabled: parsed.notificationsEnabled ?? DEFAULT_PREFERENCES.notificationsEnabled,
      soundEnabled: parsed.soundEnabled ?? DEFAULT_PREFERENCES.soundEnabled,
      enabledTypes: {
        'new-order': parsed.enabledTypes?.['new-order'] ?? true,
        'ready-too-long': parsed.enabledTypes?.['ready-too-long'] ?? true,
      },
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function saveNotificationPreferences(preferences: NotificationPreferences): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}
