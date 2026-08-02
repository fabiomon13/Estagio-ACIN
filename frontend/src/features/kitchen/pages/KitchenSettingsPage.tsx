import { useEffect, useState } from 'react';
import Switch from '../../../components/ui/switch/Switch';
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
} from '../utils/notificationPreferences';
import type { NotificationPreferences } from '../types/notification.types';

export function KitchenSettingsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(() =>
    loadNotificationPreferences(),
  );

  useEffect(() => {
    saveNotificationPreferences(preferences);
  }, [preferences]);

  return (
    <div className="flex flex-col gap-4 p-5">
      <h1 className="text-content text-2xl">Configuração</h1>

      <Switch
        label="Notificações"
        checked={preferences.notificationsEnabled}
        onChange={(event) =>
          setPreferences((current) => ({
            ...current,
            notificationsEnabled: event.target.checked,
          }))
        }
      />

      <Switch
        label="Som"
        checked={preferences.soundEnabled}
        disabled={!preferences.notificationsEnabled}
        onChange={(event) =>
          setPreferences((current) => ({ ...current, soundEnabled: event.target.checked }))
        }
      />

      <Switch
        label="Novo pedido"
        checked={preferences.enabledTypes['new-order']}
        disabled={!preferences.notificationsEnabled}
        onChange={(event) =>
          setPreferences((current) => ({
            ...current,
            enabledTypes: { ...current.enabledTypes, 'new-order': event.target.checked },
          }))
        }
      />

      <Switch
        label="Item pronto à espera"
        checked={preferences.enabledTypes['ready-too-long']}
        disabled={!preferences.notificationsEnabled}
        onChange={(event) =>
          setPreferences((current) => ({
            ...current,
            enabledTypes: { ...current.enabledTypes, 'ready-too-long': event.target.checked },
          }))
        }
      />
    </div>
  );
}
