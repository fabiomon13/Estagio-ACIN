import type { SwitchProps } from './Switch.types';
import { wrapperStyles, rootStyles, trackStyles, thumbStyles, labelStyles } from './Switch.styles';

export default function Switch({ label, className = '', ...props }: SwitchProps) {
  return (
    <label className={wrapperStyles}>
      <span className={rootStyles}>
        <input type="checkbox" role="switch" className={`peer sr-only ${className}`} {...props} />
        <span className={trackStyles} />
        <span className={thumbStyles} />
      </span>

      {label && <span className={labelStyles}>{label}</span>}
    </label>
  );
}
