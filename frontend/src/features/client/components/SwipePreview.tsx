import type { ClientView, StationSection } from '../clientTypes';
import type { Buffet } from '../services/menuApi';
import type { ClientOrder } from '../services/orderApi';
import { BuffetView } from './BuffetView';
import { MenuView } from './MenuView';
import { OrdersView } from './OrdersView';

type SwipePreviewProps = {
  view: ClientView;
  dragOffset: number;
  topOffset: number;
  isDragging: boolean;
  isSettling: boolean;
  menuStations: StationSection[];
  buffet: Buffet | null;
  buffetStations: StationSection[];
  orders: ClientOrder[];
  cart: Record<number, number>;
  isBuffetSelected: boolean;
  canCancelBuffet: boolean;
};

export function SwipePreview({
  view,
  dragOffset,
  topOffset,
  isDragging,
  isSettling,
  menuStations,
  buffet,
  buffetStations,
  orders,
  cart,
  isBuffetSelected,
  canCancelBuffet,
}: SwipePreviewProps) {
  const previewMenuStations = limitStations(menuStations);
  const previewBuffetStations = limitStations(buffetStations);

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
            ? `translate3d(calc(100% + ${dragOffset}px), ${topOffset}px, 0)`
            : `translate3d(calc(-100% + ${dragOffset}px), ${topOffset}px, 0)`,
      }}
      aria-hidden="true"
      inert
    >
      {view === 'orders' ? (
        <OrdersView orders={orders} onCancel={async () => undefined} />
      ) : view === 'buffet' ? (
        <BuffetView
          buffet={buffet}
          stations={previewBuffetStations}
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
          stations={previewMenuStations}
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

function limitStations(stations: readonly StationSection[]): StationSection[] {
  return stations.slice(0, 2).map((station) => ({
    ...station,
    categories: station.categories.slice(0, 2).map((section) => ({
      ...section,
      items: section.items.slice(0, 4),
    })),
  }));
}
