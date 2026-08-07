import { BuffetView } from '../../components/buffet/BuffetView';
import { MenuView } from '../../components/menu/MenuView';
import { OrdersView } from '../../components/orders/OrdersView';
import { CLIENT_VIEWS, type ClientView } from '../../clientTypes';
import type { useClientBootstrap } from '../../hooks/useClientBootstrap';
import type { useClientCart } from '../../hooks/useClientCart';
import type { useClientOrders } from '../../hooks/useClientOrders';
import type { useClientSwipe } from '../../hooks/swipe/useClientSwipe';
import type { Buffet } from '../../services/menuApi';

const CLIENT_VIEWS_WITHOUT_BUFFET: readonly ClientView[] = ['menu', 'orders'];
const doNothing = (): void => undefined;

async function doNothingAsync(): Promise<void> {
  return undefined;
}

type ClientViewStageProps = {
  swipe: ReturnType<typeof useClientSwipe>;
  data: ReturnType<typeof useClientBootstrap>['data'];
  cart: ReturnType<typeof useClientCart>;
  orders: ReturnType<typeof useClientOrders>['orders'];
  selectedBuffet: Buffet | null;
  isBuffetSelectionLocked: boolean;
  refreshError: string | null;
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
  refreshError,
  onChooseBuffet,
  onCancelOrderItem,
}: ClientViewStageProps) {
  const views = isBuffetSelectionLocked ? CLIENT_VIEWS_WITHOUT_BUFFET : CLIENT_VIEWS;
  const activeIndex = views.indexOf(swipe.activeView);
  const pendingIndex = swipe.pendingView === null ? -1 : views.indexOf(swipe.pendingView);

  const addDetails = (itemId: number, quantity: number, notes: string) => {
    cart.addQuantity(itemId, quantity);
    cart.setItemNotes(itemId, notes);
  };

  function getTransform(view: ClientView, index: number): string {
    if (pendingIndex !== -1) {
      if (view === swipe.pendingView) return 'translate3d(0, 0, 0)';

      if (view === swipe.activeView) {
        const direction = pendingIndex > activeIndex ? -100 : 100;
        return `translate3d(${direction}%, 0, 0)`;
      }
    }

    if (view === swipe.activeView && swipe.viewDragOffset === 0) {
      return 'none';
    }

    const relativePosition = (index - activeIndex) * 100;
    return `translate3d(calc(${relativePosition}% + ${swipe.viewDragOffset}px), 0, 0)`;
  }

  function getViewportTransform(view: ClientView, index: number): string {
    if (pendingIndex !== -1) {
      if (view === swipe.pendingView) return 'translate3d(0, 0, 0)';

      if (view === swipe.activeView) {
        const direction = pendingIndex > activeIndex ? -100 : 100;
        return `translate3d(${direction}vw, 0, 0)`;
      }
    }

    if (view === swipe.activeView && swipe.viewDragOffset === 0) {
      return 'none';
    }

    const relativePosition = (index - activeIndex) * 100;
    return `translate3d(calc(${relativePosition}vw + ${swipe.viewDragOffset}px), 0, 0)`;
  }

  return (
    <div className="client-view-stage">
      {views.map((view, index) => {
        const isActive = view === swipe.activeView;
        const isSwipeTarget = view === swipe.swipeTargetView;
        const transform = getTransform(view, index);

        return (
          <section
            key={view}
            className={[
              'client-view',
              isActive ? 'is-active' : 'is-inactive',
              swipe.isDraggingView ? 'is-dragging' : '',
              swipe.pendingView !== null ? 'is-settling' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              top: !isActive && isSwipeTarget ? `${swipe.targetViewTopOffset}px` : undefined,
              transform,
            }}
            aria-hidden={!isActive}
            inert={!isActive}
            onTransitionEnd={isActive ? swipe.handleViewTransitionEnd : undefined}
          >
            {view === 'menu' && (
              <MenuView
                stations={data.menuStations}
                selectedAllergenTagIds={data.selectedAllergenTagIds}
                cart={cart.cart}
                onAdd={isActive ? cart.addToCart : doNothing}
                onAddDetails={isActive ? addDetails : doNothing}
                onRemove={isActive ? cart.removeFromCart : doNothing}
                isPreview={!isActive}
              />
            )}

            {view === 'buffet' && (
              <BuffetView
                buffet={selectedBuffet}
                stations={data.buffetStations}
                selectedAllergenTagIds={data.selectedAllergenTagIds}
                cart={cart.cart}
                isSelected={data.selectedBuffetId === selectedBuffet?.id}
                canSelectBuffet={!isBuffetSelectionLocked}
                canCancelSelection={orders.length === 0}
                onAdd={isActive ? cart.addToCart : doNothing}
                onAddDetails={isActive ? addDetails : doNothing}
                onRemove={isActive ? cart.removeFromCart : doNothing}
                onChoose={isActive ? onChooseBuffet : doNothingAsync}
                isPreview={!isActive}
                showSelectAction={isActive || isSwipeTarget || swipe.pendingView === view}
                selectActionTransform={getViewportTransform(view, index)}
                isSelectActionDragging={swipe.isDraggingView}
              />
            )}

            {view === 'orders' && (
              <OrdersView
                orders={orders}
                onCancel={isActive ? onCancelOrderItem : doNothingAsync}
                refreshMessage={isActive ? refreshError : undefined}
              />
            )}
          </section>
        );
      })}
    </div>
  );
}
