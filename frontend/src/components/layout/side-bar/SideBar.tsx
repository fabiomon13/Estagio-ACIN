import { AvatarIcon, ChevronIcon, CompactLogo } from '../../icons';
import LogoIcon from '../../icons/Logo';
import ProfileMenuTrigger from '../../ui/profile-menu-trigger/ProfileMenuTrigger';
import SideBarTab from './side-bar-tab/SideBarTab';
import type { SideBarProps } from './SideBar.types';
import {
  asideBaseStyles,
  asideCollapsedWidthStyles,
  asideExpandedWidthStyles,
  asideMobileClosedStyles,
  asideMobileOpenStyles,
  avatarIconStyles,
  avatarImageStyles,
  backdropBaseStyles,
  backdropClosedStyles,
  backdropOpenStyles,
  collapsedProfileButtonStyles,
  compactLogoStyles,
  headerCollapsedStyles,
  headerExpandedStyles,
  headerStyles,
  logoStyles,
  mobileTriggerStyles,
  navStyles,
  profileWrapperStyles,
  toggleButtonStyles,
} from './SideBar.styles';

export default function SideBar({ tabs, activeTabId, profile, isOpen, onToggle }: SideBarProps) {
  return (
    <>
      {/* Mobile-only: opens the sidebar as an overlay. Hidden on desktop,
          where the sidebar is always visible (just narrower when collapsed). */}
      {!isOpen && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Abrir menu"
          className={mobileTriggerStyles}
        >
          <ChevronIcon size={20} className="-rotate-90" />
        </button>
      )}

      {/* Mobile-only backdrop -- closes the sidebar on click, like the profile modal. */}
      <div
        aria-hidden="true"
        onClick={onToggle}
        className={[backdropBaseStyles, isOpen ? backdropOpenStyles : backdropClosedStyles].join(
          ' ',
        )}
      />

      <aside
        className={[
          asideBaseStyles,
          isOpen ? asideExpandedWidthStyles : asideCollapsedWidthStyles,
          isOpen ? asideMobileOpenStyles : asideMobileClosedStyles,
        ].join(' ')}
      >
        <div
          className={[headerStyles, isOpen ? headerExpandedStyles : headerCollapsedStyles].join(
            ' ',
          )}
        >
          {isOpen ? (
            <LogoIcon className={logoStyles} />
          ) : (
            <button
              type="button"
              onClick={onToggle}
              aria-label={isOpen ? 'Recolher menu' : 'Expandir menu'}
              className="cursor-pointer"
            >
              <CompactLogo size={30} className={compactLogoStyles} />
            </button>
          )}

          {isOpen && (
            <button
              type="button"
              onClick={onToggle}
              aria-label={isOpen ? 'Recolher menu' : 'Expandir menu'}
              className={toggleButtonStyles}
            >
              <ChevronIcon className={isOpen ? 'rotate-90' : '-rotate-90'} />
            </button>
          )}
        </div>

        <nav className={navStyles}>
          {tabs.map((tab) => (
            <SideBarTab
              key={tab.id}
              label={tab.label}
              icon={tab.icon}
              activeIcon={tab.activeIcon}
              isActive={tab.id === activeTabId}
              showLabel={isOpen}
              onClick={tab.onClick}
            />
          ))}
        </nav>

        <div className={profileWrapperStyles}>
          {isOpen ? (
            <ProfileMenuTrigger
              name={profile.name}
              onClick={profile.onClick}
              role={profile.role}
              profileImageUrl={profile.profileImageUrl}
            />
          ) : (
            <button
              type="button"
              onClick={profile.onClick}
              aria-label={profile.name}
              className={collapsedProfileButtonStyles}
            >
              {profile.profileImageUrl ? (
                <img
                  src={profile.profileImageUrl}
                  alt={`Fotografia de ${profile.name}`}
                  className={avatarImageStyles}
                />
              ) : (
                <AvatarIcon className={avatarIconStyles} />
              )}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
