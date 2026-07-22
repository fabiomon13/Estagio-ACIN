import type { CheckboxProps } from './Checkbox.types';
import {
  wrapperStyles,
  rootStyles,
  boxStyles,
  variantStyles,
  iconStyles,
  iconColorStyles,
  labelStyles,
} from './Checkbox.styles';
import { CheckIcon } from '../../icons';

export default function Checkbox({
  label,
  variant = 'primary',
  className = '',
  ...props
}: CheckboxProps) {
  return (
    <label className={wrapperStyles}>
      <span className={rootStyles}>
        <input type="checkbox" className={`peer sr-only ${className}`} {...props} />
        <span className={`${boxStyles} ${variantStyles[variant]}`} />
        <span className={`${iconStyles} ${iconColorStyles[variant]}`}>
          <CheckIcon size={14} />
        </span>
      </span>

      {label && <span className={labelStyles}>{label}</span>}
    </label>
  );
}
