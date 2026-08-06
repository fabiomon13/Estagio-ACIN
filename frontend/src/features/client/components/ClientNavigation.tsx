import type { ClientView } from '../clientTypes';

type ClientNavigationProps = {
  activeView: ClientView;
  isDragging: boolean;
  indicatorPosition: number;
  showBuffet: boolean;
  onChange: (view: ClientView) => void;
};

const navigationItems: ReadonlyArray<{ view: ClientView; icon: string; label: string }> = [
  { view: 'menu', icon: '⌘', label: 'Menu' },
  { view: 'buffet', icon: '↻', label: 'Buffet' },
  { view: 'orders', icon: '≡', label: 'Pedidos' },
];

export function ClientNavigation({
  activeView,
  isDragging,
  indicatorPosition,
  showBuffet,
  onChange,
}: ClientNavigationProps) {
  const visibleNavigationItems = showBuffet
    ? navigationItems
    : navigationItems.filter(({ view }) => view !== 'buffet');
  const boundedIndicatorPosition = Math.min(
    Math.max(indicatorPosition, 0),
    visibleNavigationItems.length - 1,
  );

  return (
    <nav
      className={`client-main-nav${showBuffet ? '' : ' has-two-items'}`}
      aria-label="Navegação do cliente"
    >
      {visibleNavigationItems.map(({ view, icon, label }) => (
        <button
          key={view}
          type="button"
          className={`client-main-nav-item ${activeView === view ? 'is-active' : ''}`}
          aria-current={activeView === view ? 'page' : undefined}
          onClick={() => onChange(view)}
        >
          <span aria-hidden="true">{icon}</span>
          {label}
        </button>
      ))}
      <span
        className={`client-main-nav-indicator${isDragging ? ' is-dragging' : ''}`}
        aria-hidden="true"
        style={{ transform: `translate3d(${boundedIndicatorPosition * 100}%, 0, 0)` }}
      />
    </nav>
  );
}
