export type KitchenNotificationType = 'new-order' | 'ready-too-long';

export type NotificationPreferences = {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  enabledTypes: Record<KitchenNotificationType, boolean>;
};
