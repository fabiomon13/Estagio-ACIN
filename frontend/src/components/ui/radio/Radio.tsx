import type { RadioProps } from './Radio.types';
import { wrapperStyles, rootStyles, circleStyles, dotStyles, labelStyles } from './Radio.styles';

export default function Radio({ label, className = '', ...props }: RadioProps) {
  return (
    <label className={wrapperStyles}>
      <span className={rootStyles}>
        <input type="radio" className={`peer sr-only ${className}`} {...props} />
        <span className={circleStyles} />
        <span className={dotStyles} />
      </span>

      {label && <span className={labelStyles}>{label}</span>}
    </label>
  );
}
