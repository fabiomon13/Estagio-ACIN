import type { IconProps } from './Icon.types';

export default function AvatarIcon({ size = 20, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path
        d="M50 2.5C23.808 2.5 2.5 23.808 2.5 50S23.808 97.5 50 97.5 97.5 76.192 97.5 50 76.192 2.5 50 2.5m28.834 76.114c-3.642-7.49-11.32-12.66-20.206-12.66H41.372c-8.885 0-16.564 5.17-20.206 12.66C13.871 71.263 9.356 61.15 9.356 50 9.356 27.589 27.589 9.356 50 9.356S90.644 27.589 90.644 50c0 11.15-4.515 21.263-11.81 28.614"
        fill="currentColor"
      />
      <circle cx="50" cy="40.869" r="18.263" fill="currentColor" />
    </svg>
  );
}
