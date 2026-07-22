import type { AlertProps } from './Alert.types';
import {
  baseStyles,
  variantStyles,
  contentStyles,
  titleStyles,
  descriptionStyles,
  closeButtonStyles,
} from './Alert.styles';
import { CloseIcon } from '../../icons';

export default function Alert({
  children,
  title,
  variant = 'default',
  onClose,
  className = '',
  ...props
}: AlertProps) {
  const classes = `${baseStyles} ${variantStyles[variant]} ${className}`;

  return (
    <div role="alert" className={classes} {...props}>
      <div className={contentStyles}>
        {title && <p className={titleStyles}>{title}</p>}
        <div className={descriptionStyles}>{children}</div>
      </div>

      {onClose && (
        <button type="button" onClick={onClose} aria-label="Dismiss" className={closeButtonStyles}>
          <CloseIcon size={16} />
        </button>
      )}
    </div>
  );
}
