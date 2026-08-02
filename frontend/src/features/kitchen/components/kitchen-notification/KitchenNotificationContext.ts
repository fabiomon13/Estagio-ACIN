import { createContext } from 'react';
import type { KitchenNotificationContextValue } from './KitchenNotification.types';

export const KitchenNotificationContext = createContext<KitchenNotificationContextValue | null>(
  null,
);
