import { useContext } from 'react';
import { KitchenNotificationContext } from './KitchenNotificationContext';

export function useKitchenNotifications() {
  const context = useContext(KitchenNotificationContext);

  if (!context) {
    throw new Error('useKitchenNotifications must be used within a KitchenNotificationProvider');
  }

  return context;
}
