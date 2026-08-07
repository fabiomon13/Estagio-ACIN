import { BuffetView } from '../../components/buffet/BuffetView';
import { MenuView } from '../../components/menu/MenuView';
import { OrdersView } from '../../components/orders/OrdersView';
import { SwipePreview } from '../../components/shared/SwipePreview';
import type { useClientBootstrap } from '../../hooks/useClientBootstrap';
import type { useClientCart } from '../../hooks/useClientCart';
import type { useClientOrders } from '../../hooks/useClientOrders';
import type { useClientSwipe } from '../../hooks/swipe/useClientSwipe';
import type { Buffet } from '../../services/menuApi';

type ClientViewStageProps = {
  swipe: ReturnType<typeof useClientSwipe>;
  data: ReturnType<typeof useClientBootstrap>['data'];
  cart: ReturnType<typeof useClientCart>;
  orders: ReturnType<typeof useClientOrders>['orders'];
  selectedBuffet: Buffet | null;
  isBuffetSelectionLocked: boolean;
  pollingError: string | null;
  onChooseBuffet: (buffetId: number | null) => Promise<void>;
  onCancelOrderItem: (orderId: number, itemId: number) => Promise<void>;
};

export function ClientViewStage({
  swipe,
  data,
  cart,
  orders,
  selectedBuffet,
  isBuffetSelectionLocked,
  pollingError,
  onChooseBuffet,
  onCancelOrderItem,
}: ClientViewStageProps) {
  const addDetails = (itemId: number, quantity: number, notes: string) => {
    cart.addQuantity(itemId, quantity);
    cart.setItemNotes(itemId, notes);
  };

  return (
    <div className="client-view-stage">
      <div
        key={swipe.activeView}
        className={`client-view${swipe.isDraggingView ? ' is-dragging' : ''}${
          swipe.pendingView !== null ? ' is-settling' : ''
        }`}
        onTransitionEnd={swipe.handleViewTransitionEnd}
        style={{
          transform:
            swipe.viewDragOffset === 0 ? undefined : `translate3d(${swipe.viewDragOffset}px, 0, 0)`,
        }}
      >
        {swipe.activeView === 'menu' && (
          <MenuView
            stations={data.menuStations}
            selectedAllergenTagIds={data.selectedAllergenTagIds}
            cart={cart.cart}
            onAdd={cart.addToCart}
            onAddDetails={addDetails}
            onRemove={cart.removeFromCart}
          />
        )}

        {swipe.activeView === 'buffet' && !isBuffetSelectionLocked && (
          <BuffetView
            buffet={selectedBuffet}
            stations={data.buffetStations}
            selectedAllergenTagIds={data.selectedAllergenTagIds}
            cart={cart.cart}
            isSelected={data.selectedBuffetId === selectedBuffet?.id}
            canSelectBuffet={!isBuffetSelectionLocked}
            canCancelSelection={orders.length === 0}
            onAdd={cart.addToCart}
            onAddDetails={addDetails}
            onRemove={cart.removeFromCart}
            onChoose={onChooseBuffet}
          />
        )}

        {swipe.activeView === 'orders' && (
          <OrdersView orders={orders} onCancel={onCancelOrderItem} refreshMessage={pollingError} />
        )}
      </div>

      {swipe.swipeTargetView &&
        !(swipe.swipeTargetView === 'buffet' && isBuffetSelectionLocked) && (
          <SwipePreview
            view={swipe.swipeTargetView}
            dragOffset={swipe.viewDragOffset}
            topOffset={swipe.targetViewTopOffset}
            isDragging={swipe.isDraggingView}
            isSettling={swipe.pendingView !== null}
            menuStations={data.menuStations}
            buffet={selectedBuffet}
            buffetStations={data.buffetStations}
            orders={orders}
            cart={cart.cart}
            isBuffetSelected={data.selectedBuffetId === selectedBuffet?.id}
            canCancelBuffet={orders.length === 0}
            selectedAllergenTagIds={data.selectedAllergenTagIds}
          />
        )}
    </div>
  );
}
