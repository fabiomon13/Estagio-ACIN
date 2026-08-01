import type { ReactNode } from 'react';

export type KitchenNotificationVariant = 'info' | 'warning' | 'danger';

export type KitchenNotificationProps = {
  variant: KitchenNotificationVariant;
  message: string;
  icon: ReactNode;
  onDismiss?: () => void;
};
