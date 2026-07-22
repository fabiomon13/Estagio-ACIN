import { useId } from 'react';
import type { SearchInputProps } from './SearchInput.types';
import {
  wrapperStyles,
  baseStyles,
  sizeStyles,
  iconWrapperStyles,
  clearButtonStyles,
  labelStyles,
} from './SearchInput.styles';
import { SearchIcon, CloseIcon } from '../../icons';

export default function SearchInput({
  label,
  size = 'md',
  fullWidth = true,
  className = '',
  id,
  value,
  onChange,
  onClear,
  ...props
}: SearchInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hasValue = typeof value === 'string' && value.length > 0;
  const classes = `${baseStyles} ${sizeStyles[size]} ${className}`;

  return (
    <div className={fullWidth ? 'w-full' : 'inline-block'}>
      {label && (
        <label htmlFor={inputId} className={labelStyles}>
          {label}
        </label>
      )}

      <div className={wrapperStyles}>
        <span className={iconWrapperStyles}>
          <SearchIcon size={16} />
        </span>

        <input
          id={inputId}
          type="search"
          className={classes}
          value={value}
          onChange={onChange}
          {...props}
        />

        {hasValue && onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className={clearButtonStyles}
          >
            <CloseIcon size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
