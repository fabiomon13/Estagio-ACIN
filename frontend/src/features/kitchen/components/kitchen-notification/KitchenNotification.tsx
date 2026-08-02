import { CloseIcon } from '../../../../components/icons';
import type { KitchenNotificationProps } from './KitchenNotification.types';
import {
  baseStyles,
  variantBorderStyles,
  variantIconStyles,
  messageStyles,
  closeButtonStyles,
} from './KitchenNotification.styles';

export default function KitchenNotification({
  variant,
  message,
  icon,
  onDismiss,
}: KitchenNotificationProps) {
  return (
    <div role="status" className={`${baseStyles} ${variantBorderStyles[variant]}`}>
      <span className={variantIconStyles[variant]}>{icon}</span>

      <p className={messageStyles}>{message}</p>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className={closeButtonStyles}
        >
          <CloseIcon size={16} />
        </button>
      )}
    </div>
  );
}
