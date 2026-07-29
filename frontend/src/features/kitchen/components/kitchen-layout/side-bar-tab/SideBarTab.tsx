import {
  activeStyles,
  baseStyles,
  collapsedGapStyles,
  collapsedPaddingStyles,
  expandedGapStyles,
  expandedPaddingStyles,
  inactiveStyles,
  labelBaseStyles,
  labelHiddenStyles,
  labelVisibleStyles,
} from './SideBarTab.styles';
import type { SideBarTabProps } from './SideBarTab.types';

export default function SideBarTab({
  onClick,
  label,
  icon,
  activeIcon,
  showLabel = true,
  isActive,
}: SideBarTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      aria-label={showLabel ? undefined : label}
      className={[
        baseStyles,
        showLabel ? expandedPaddingStyles : collapsedPaddingStyles,
        showLabel ? expandedGapStyles : collapsedGapStyles,
        isActive ? activeStyles : inactiveStyles,
      ].join(' ')}
    >
      <span className="shrink-0">{isActive ? (activeIcon ?? icon) : icon}</span>
      <p
        className={[labelBaseStyles, showLabel ? labelVisibleStyles : labelHiddenStyles].join(' ')}
      >
        {label}
      </p>
    </button>
  );
}
