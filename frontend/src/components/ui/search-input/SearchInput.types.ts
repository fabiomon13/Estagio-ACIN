import type { InputHTMLAttributes } from 'react';

export type SearchInputSize = 'md' | 'lg';

export type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> & {
  label?: string;
  size?: SearchInputSize;
  fullWidth?: boolean;
  onClear?: () => void;
};
