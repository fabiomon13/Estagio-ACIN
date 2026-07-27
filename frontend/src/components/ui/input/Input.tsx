import { useId } from 'react';
import type { InputProps } from './Input.types';
import {
  baseStyles,
  errorStyles,
  sizeStyles,
  labelStyles,
  helperTextStyles,
  errorTextStyles,
} from './Input.styles';

export default function Input({
  label,
  error,
  helperText,
  size = 'md',
  fullWidth = true,
  className = '',
  id,
  endAdornment,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  // px-4 (both sides) and pr-11 (right only) both set padding-right — mixing them
  // is order-dependent in the compiled CSS, so when there's an adornment we skip
  // sizeStyles entirely and set left/right padding as two non-conflicting utilities.
  const sizePadding = endAdornment
    ? size === 'lg'
      ? 'h-12 pl-4 pr-11 text-base'
      : 'h-10 pl-4 pr-11 text-sm'
    : sizeStyles[size];

  const classes = `
    ${baseStyles}
    ${sizePadding}
    ${error ? errorStyles : ''}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `;

  return (
    <div className={fullWidth ? 'w-full' : 'inline-block'}>
      {label && (
        <label htmlFor={inputId} className={labelStyles}>
          {label}
        </label>
      )}

      <div className="relative">
        <input id={inputId} className={classes} {...props} />
        {endAdornment && (
          <div className="absolute top-1/2 right-3 -translate-y-1/2">{endAdornment}</div>
        )}
      </div>

      {error ? (
        <p className={errorTextStyles}>{error}</p>
      ) : helperText ? (
        <p className={helperTextStyles}>{helperText}</p>
      ) : null}
    </div>
  );
}
