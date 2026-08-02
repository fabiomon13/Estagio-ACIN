import type { ReactNode } from 'react';

export type DropdownOption = {
  value: string;
  label: string;
  // Icon, badge, shortcut hint -- anything -- rendered to the left of
  // this option's label, inside the option row.
  leftContent?: ReactNode;
};

export type DropdownSize = 'md' | 'lg';

export type DropdownProps = {
  label?: string;
  value: string | null;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  // Icon, badge, avatar -- anything -- rendered to the left of the
  // selected label/placeholder, inside the trigger.
  leftContent?: ReactNode;
  size?: DropdownSize;
  fullWidth?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
};
