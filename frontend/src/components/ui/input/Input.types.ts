import type { InputHTMLAttributes, ReactNode } from 'react';

export type InputSize = 'md' | 'lg';

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label?: string;
  error?: string;
  helperText?: string;
  size?: InputSize;
  fullWidth?: boolean;
  endAdornment?: ReactNode;
};
