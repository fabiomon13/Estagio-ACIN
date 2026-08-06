import type { ClientView, StationSection } from '../clientTypes';
import type { Buffet } from '../services/menuApi';
import type { ClientOrder } from '../services/orderApi';
import { BuffetView } from './BuffetView';
import { MenuView } from './MenuView';
import { OrdersView } from './OrdersView';

type SwipePreviewProps = {
  view: ClientView;
  dragOffset: number;
  isDragging: boolean;
  isSettling: boolean;
  menuStations: StationSection[];
  buffet: Buffet | null;
  buffetStations: StationSection[];
  orders: ClientOrder[];
  cart: Record<number, number>;
  isBuffetSelected: boolean;
  canCancelBuffet: boolean;
  selectedAllergenTagIds: ReadonlySet<number>;
};

export function SwipePreview({
  view,
  dragOffset,
  isDragging,
  isSettling,
  menuStations,
  buffet,
  buffetStations,
  orders,
  cart,
  isBuffetSelected,
  canCancelBuffet,
  selectedAllergenTagIds,
}: SwipePreviewProps) {
  return (
    <div
      className={[
        'client-view',
        'client-view-adjacent',
        isDragging ? 'is-dragging' : '',
        isSettling ? 'is-settling' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        transform:
          dragOffset < 0
            ? `translate3d(calc(100% + ${dragOffset}px), 0, 0)`
            : `translate3d(calc(-100% + ${dragOffset}px), 0, 0)`,
      }}
      aria-hidden="true"
      inert
    >
      {view === 'orders' ? (
        <OrdersView orders={orders} onCancel={async () => undefined} />
      ) : view === 'buffet' ? (
        <BuffetView
          buffet={buffet}
          stations={buffetStations}
          selectedAllergenTagIds={selectedAllergenTagIds}
          navigationStations={buffetStations}
          cart={cart}
          onAdd={() => undefined}
          onAddDetails={() => undefined}
          onRemove={() => undefined}
          onChoose={async () => undefined}
          isSelected={isBuffetSelected}
          canCancelSelection={canCancelBuffet}
          isPreview
        />
      ) : (
        <MenuView
          stations={menuStations}
          selectedAllergenTagIds={selectedAllergenTagIds}
          navigationStations={menuStations}
          cart={cart}
          onAdd={() => undefined}
          onAddDetails={() => undefined}
          onRemove={() => undefined}
          isPreview
        />
      )}
    </div>
  );
}
