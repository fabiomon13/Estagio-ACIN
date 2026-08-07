import type { ClientView } from '../../clientTypes';

type ClientNavigationProps = {
  activeView: ClientView;
  isDragging: boolean;
  indicatorPosition: number;
  showBuffet: boolean;
  onChange: (view: ClientView) => void;
};

type NavigationItem = Readonly<{
  view: ClientView;
  icon: string;
  label: string;
}>;

const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    view: 'menu',
    icon: '⌘',
    label: 'Menu',
  },
  {
    view: 'buffet',
    icon: '↻',
    label: 'Buffet',
  },
  {
    view: 'orders',
    icon: '≡',
    label: 'Pedidos',
  },
];

export function ClientNavigation({
  activeView,
  isDragging,
  indicatorPosition,
  showBuffet,
  onChange,
}: ClientNavigationProps) {
  const visibleItems = showBuffet
    ? NAVIGATION_ITEMS
    : NAVIGATION_ITEMS.filter(({ view }) => view !== 'buffet');

  const maximumPosition = Math.max(visibleItems.length - 1, 0);

  const boundedIndicatorPosition = Math.min(Math.max(indicatorPosition, 0), maximumPosition);

  return (
    <nav
      className={['client-main-nav', showBuffet ? '' : 'has-two-items'].filter(Boolean).join(' ')}
      aria-label="Navegação do cliente"
    >
      {visibleItems.map(({ view, icon, label }) => {
        const isActive = activeView === view;

        return (
          <button
            key={view}
            type="button"
            className={['client-main-nav-item', isActive ? 'is-active' : '']
              .filter(Boolean)
              .join(' ')}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onChange(view)}
          >
            <span aria-hidden="true">{icon}</span>
            {label}
          </button>
        );
      })}

      <span
        className={['client-main-nav-indicator', isDragging ? 'is-dragging' : '']
          .filter(Boolean)
          .join(' ')}
        aria-hidden="true"
        style={{
          transform: `translate3d(${boundedIndicatorPosition * 100}%, 0, 0)`,
        }}
      />
    </nav>
  );
}
