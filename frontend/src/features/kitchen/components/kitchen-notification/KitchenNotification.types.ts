import type { ReactNode } from 'react';
import type { KitchenNotificationType } from '../../types/notification.types';

export type KitchenNotificationVariant = 'info' | 'warning' | 'danger';

export type KitchenNotificationProps = {
  variant: KitchenNotificationVariant;
  message: string;
  icon: ReactNode;
  onDismiss?: () => void;
};

export type NotifyOptions = {
  type: KitchenNotificationType;
  message: string;
};

export type KitchenNotificationContextValue = {
  notify: (options: NotifyOptions) => void;
};
