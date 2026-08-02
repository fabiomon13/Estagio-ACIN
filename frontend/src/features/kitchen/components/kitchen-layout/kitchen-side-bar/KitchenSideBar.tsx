import { AvatarIcon, ChevronIcon, CompactLogo } from '../../../../../components/icons';
import LogoIcon from '../../../../../components/icons/Logo';
import ProfileMenuTrigger from '../../../../../components/ui/profile-menu-trigger/ProfileMenuTrigger';
import SideBarTab from '../side-bar-tab/SideBarTab';
import type { KitchenSideBarProps } from './KitchenSideBar.types';
import {
  asideBaseStyles,
  asideCollapsedWidthStyles,
  asideExpandedWidthStyles,
  avatarIconStyles,
  avatarImageStyles,
  collapsedProfileButtonStyles,
  compactLogoStyles,
  headerCollapsedStyles,
  headerExpandedStyles,
  headerStyles,
  logoStyles,
  navStyles,
  profileWrapperStyles,
  toggleButtonStyles,
} from './KitchenSideBar.styles';

export default function KitchenSideBar({
  tabs,
  activeTabId,
  profile,
  isOpen,
  onToggle,
}: KitchenSideBarProps) {
  return (
    <aside
      className={[
        asideBaseStyles,
        isOpen ? asideExpandedWidthStyles : asideCollapsedWidthStyles,
      ].join(' ')}
    >
      <div
        className={[headerStyles, isOpen ? headerExpandedStyles : headerCollapsedStyles].join(' ')}
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
  );
}
