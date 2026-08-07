import { BuffetView } from '../buffet/BuffetView';
import { MenuView } from '../menu/MenuView';
import { OrdersView } from '../orders/OrdersView';
import type { ClientView, StationSection } from '../../clientTypes';
import type { Buffet } from '../../services/menuApi';
import type { ClientOrder } from '../../services/orderApi';

type SwipePreviewProps = {
  view: ClientView;
  dragOffset: number;
  topOffset: number;
  isDragging: boolean;
  isSettling: boolean;
  menuStations: readonly StationSection[];
  buffet: Buffet | null;
  buffetStations: readonly StationSection[];
  orders: readonly ClientOrder[];
  cart: Readonly<Record<number, number>>;
  isBuffetSelected: boolean;
  canCancelBuffet: boolean;
  selectedAllergenTagIds: ReadonlySet<number>;
};

const doNothing = (): void => undefined;

async function doNothingAsync(): Promise<void> {
  return undefined;
}

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
  selectedAllergenTagIds,
}: SwipePreviewProps) {
  const transform =
    dragOffset < 0
      ? `translate3d(calc(100% + ${dragOffset}px), 0, 0)`
      : `translate3d(calc(-100% + ${dragOffset}px), 0, 0)`;

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
        top: `${topOffset}px`,
        transform,
      }}
      aria-hidden="true"
      inert
    >
      {view === 'orders' ? (
        <OrdersView orders={orders} onCancel={doNothingAsync} />
      ) : view === 'buffet' ? (
        <BuffetView
          buffet={buffet}
          stations={buffetStations}
          navigationStations={buffetStations}
          selectedAllergenTagIds={selectedAllergenTagIds}
          cart={cart}
          isSelected={isBuffetSelected}
          canCancelSelection={canCancelBuffet}
          onAdd={doNothing}
          onAddDetails={doNothing}
          onRemove={doNothing}
          onChoose={doNothingAsync}
          isPreview
        />
      ) : (
        <MenuView
          stations={menuStations}
          navigationStations={menuStations}
          selectedAllergenTagIds={selectedAllergenTagIds}
          cart={cart}
          onAdd={doNothing}
          onAddDetails={doNothing}
          onRemove={doNothing}
          isPreview
        />
      )}
    </div>
  );
}
