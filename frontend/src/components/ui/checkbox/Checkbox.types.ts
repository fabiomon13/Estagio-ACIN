import type { InputHTMLAttributes } from 'react';

export type CheckboxVariant = 'primary' | 'white';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string;
  variant?: CheckboxVariant;
};
