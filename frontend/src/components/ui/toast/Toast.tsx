import type { AnimationEvent } from 'react';
import type { ToastProps } from './Toast.types';
import {
  baseStyles,
  variantStyles,
  enterStyles,
  exitStyles,
  contentStyles,
  titleStyles,
  descriptionStyles,
  closeButtonStyles,
} from './Toast.styles';
import { CloseIcon } from '../../icons';

export default function Toast({
  id,
  title,
  description,
  variant = 'default',
  closing,
  onDismiss,
  onExited,
}: ToastProps) {
  const classes = `${baseStyles} ${variantStyles[variant]} ${closing ? exitStyles : enterStyles}`;

  const handleAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;

    if (closing) {
      onExited(id);
    }
  };

  return (
    <div role="status" aria-live="polite" className={classes} onAnimationEnd={handleAnimationEnd}>
      <div className={contentStyles}>
        {title && <p className={titleStyles}>{title}</p>}
        {description && <div className={descriptionStyles}>{description}</div>}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss"
        className={closeButtonStyles}
      >
        <CloseIcon size={16} />
      </button>
    </div>
  );
}
