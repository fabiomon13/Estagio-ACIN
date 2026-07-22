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
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const classes = `
    ${baseStyles}
    ${sizeStyles[size]}
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

      <input id={inputId} className={classes} {...props} />

      {error ? (
        <p className={errorTextStyles}>{error}</p>
      ) : helperText ? (
        <p className={helperTextStyles}>{helperText}</p>
      ) : null}
    </div>
  );
}
