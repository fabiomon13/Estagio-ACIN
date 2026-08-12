// Mobile: always a fixed, full-height left panel that slides in/out --
// never a flex sibling that pushes page content sideways. Desktop (sm+)
// reverts to sitting in normal flow, same as before.
export const asideBaseStyles = [
  'fixed inset-y-0 left-0 z-50 flex h-screen w-74 shrink-0 flex-col',
  'rounded-r-4xl bg-surface px-5 py-6',
  'transition-all duration-300 ease-in-out',
  'sm:static sm:z-auto',
].join(' ');

// Desktop-only width toggle -- on mobile the aside is always w-74 (styled
// above) and visibility/position is what changes instead, via asideMobile*.
export const asideExpandedWidthStyles = 'sm:w-74';
export const asideCollapsedWidthStyles = 'sm:w-20';

// Mobile: slide fully off-screen and stop intercepting clicks when closed.
// Desktop: always in place, ignoring isOpen -- collapsed just means
// narrower (handled by the width styles above), never hidden.
export const asideMobileOpenStyles = 'translate-x-0 sm:translate-x-0';
export const asideMobileClosedStyles =
  '-translate-x-full pointer-events-none sm:translate-x-0 sm:pointer-events-auto';

export const backdropBaseStyles = [
  'fixed inset-0 z-40 bg-black/60 sm:hidden',
  'transition-opacity duration-300 ease-in-out',
].join(' ');
export const backdropOpenStyles = 'opacity-100';
export const backdropClosedStyles = 'opacity-0 pointer-events-none';

export const mobileTriggerStyles = [
  'fixed top-4 left-4 z-30 flex size-10 items-center justify-center',
  'rounded-full border border-border bg-surface-raised text-content-muted',
  'sm:hidden',
].join(' ');

export const headerStyles = 'flex items-center';
export const headerExpandedStyles = 'justify-between';
export const headerCollapsedStyles = 'flex-col gap-4';

export const logoStyles = 'w-38';
export const compactLogoStyles = 'text-primary';

export const toggleButtonStyles = [
  'cursor-pointer rounded-full p-2',
  'transition-colors duration-200',
  'hover:bg-surface-hover',
].join(' ');

export const navStyles = 'mt-24 flex flex-col gap-4';

export const profileWrapperStyles = 'mt-auto';

export const collapsedProfileButtonStyles = 'flex w-full justify-center cursor-pointer';

export const avatarImageStyles = 'size-10 rounded-md object-cover';

export const avatarIconStyles = 'size-10 text-content-subtle';
