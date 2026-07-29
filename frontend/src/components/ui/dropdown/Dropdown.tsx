import { useId, useRef, useState } from 'react';
import ChevronIcon from '../../icons/ChevronIcon';
import { useClickOutside } from '../../../hooks/useClickOutside';
import type { DropdownProps } from './Dropdown.types';
import {
  chevronOpenStyles,
  chevronStyles,
  errorTextStyles,
  helperTextStyles,
  labelStyles,
  leftContentStyles,
  optionBaseStyles,
  optionLabelStyles,
  optionLeftContentStyles,
  optionSelectedStyles,
  panelStyles,
  placeholderStyles,
  triggerBaseStyles,
  triggerErrorStyles,
  triggerSizeStyles,
  valueStyles,
  wrapperStyles,
} from './Dropdown.styles';

export default function Dropdown({
  label,
  value,
  onChange,
  options,
  placeholder = 'Selecionar...',
  leftContent,
  size = 'md',
  fullWidth = true,
  disabled = false,
  error,
  helperText,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();

  useClickOutside(wrapperRef, () => setIsOpen(false), isOpen);

  const selectedOption = options.find((option) => option.value === value);

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const triggerClasses = [
    triggerBaseStyles,
    triggerSizeStyles[size],
    error ? triggerErrorStyles : '',
  ].join(' ');

  return (
    <div ref={wrapperRef} className={fullWidth ? 'w-full' : 'inline-block'}>
      {label && (
        <label id={`${generatedId}-label`} className={labelStyles}>
          {label}
        </label>
      )}

      <div className={wrapperStyles}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          onKeyDown={handleTriggerKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={label ? `${generatedId}-label` : undefined}
          className={triggerClasses}
        >
          {leftContent && <span className={leftContentStyles}>{leftContent}</span>}

          {selectedOption ? (
            <span className={valueStyles}>{selectedOption.label}</span>
          ) : (
            <span className={placeholderStyles}>{placeholder}</span>
          )}

          <ChevronIcon
            size={16}
            className={[chevronStyles, isOpen ? chevronOpenStyles : ''].join(' ')}
          />
        </button>

        {isOpen && (
          <ul
            role="listbox"
            aria-labelledby={label ? `${generatedId}-label` : undefined}
            className={panelStyles}
          >
            {options.map((option) => (
              <li key={option.value} role="option" aria-selected={option.value === value}>
                <button
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={[
                    optionBaseStyles,
                    option.value === value ? optionSelectedStyles : '',
                  ].join(' ')}
                >
                  {option.leftContent && (
                    <span className={optionLeftContentStyles}>{option.leftContent}</span>
                  )}
                  <span className={optionLabelStyles}>{option.label}</span>
                </button>
              </li>
            ))}
          </ul>
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
