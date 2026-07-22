import { useId } from 'react';
import type { TextareaProps } from './Textarea.types';
import {
  baseStyles,
  errorStyles,
  labelStyles,
  helperTextStyles,
  errorTextStyles,
} from './Textarea.styles';

export default function Textarea({
  label,
  error,
  helperText,
  fullWidth = true,
  className = '',
  id,
  rows = 4,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  const classes = `${baseStyles} ${error ? errorStyles : ''} ${className}`;

  return (
    <div className={fullWidth ? 'w-full' : 'inline-block'}>
      {label && (
        <label htmlFor={textareaId} className={labelStyles}>
          {label}
        </label>
      )}

      <textarea id={textareaId} rows={rows} className={classes} {...props} />

      {error ? (
        <p className={errorTextStyles}>{error}</p>
      ) : helperText ? (
        <p className={helperTextStyles}>{helperText}</p>
      ) : null}
    </div>
  );
}
