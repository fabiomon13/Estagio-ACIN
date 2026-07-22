import type { BadgeProps } from './Badge.types';
import { baseStyles, variantStyles, sizeStyles } from './Badge.styles';

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}: BadgeProps) {
  const classes = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${className}
  `;

  return (
    <span {...props} className={classes}>
      {children}
    </span>
  );
}
