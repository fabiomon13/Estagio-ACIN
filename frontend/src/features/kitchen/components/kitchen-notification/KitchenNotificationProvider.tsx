import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { PlusIcon, WarningFilledIcon } from '../../../../components/icons';
import { loadNotificationPreferences } from '../../utils/notificationPreferences';
import { playNotificationSound } from '../../utils/playNotificationSound';
import type { KitchenNotificationType } from '../../types/notification.types';
import { KitchenNotificationContext } from './KitchenNotificationContext';
import KitchenNotification from './KitchenNotification';
import type { KitchenNotificationVariant, NotifyOptions } from './KitchenNotification.types';

const DISMISS_AFTER_MS = 5000;

const VARIANT_BY_TYPE: Record<KitchenNotificationType, KitchenNotificationVariant> = {
  'new-order': 'info',
  'ready-too-long': 'warning',
};

const ICON_BY_TYPE: Record<KitchenNotificationType, ReactNode> = {
  'new-order': <PlusIcon size={16} />,
  'ready-too-long': <WarningFilledIcon size={16} />,
};

type QueuedNotification = {
  id: string;
  type: KitchenNotificationType;
  message: string;
};

export default function KitchenNotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<QueuedNotification[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);

  const notify = useCallback(
    ({ type, message }: NotifyOptions) => {
      const preferences = loadNotificationPreferences();

      if (!preferences.notificationsEnabled || !preferences.enabledTypes[type]) return;

      const id = crypto.randomUUID();
      setNotifications((current) => [...current, { id, type, message }]);
      setTimeout(() => dismiss(id), DISMISS_AFTER_MS);

      if (preferences.soundEnabled) {
        playNotificationSound(type);
      }
    },
    [dismiss],
  );

  return (
    <KitchenNotificationContext.Provider value={{ notify }}>
      {children}

      <div className="pointer-events-none fixed right-5 top-5 z-50 flex w-96 flex-col gap-2">
        {notifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto animate-toast-in">
            <KitchenNotification
              variant={VARIANT_BY_TYPE[notification.type]}
              icon={ICON_BY_TYPE[notification.type]}
              message={notification.message}
              onDismiss={() => dismiss(notification.id)}
            />
          </div>
        ))}
      </div>
    </KitchenNotificationContext.Provider>
  );
}
