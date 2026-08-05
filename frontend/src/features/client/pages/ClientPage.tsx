import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { useToast } from '../../../components/ui/toast/useToast';
import { ApiError } from '../../../services/api/client';
import { BuffetView } from '../components/BuffetView';
import { ClientHeader } from '../components/ClientHeader';
import { ClientMessage } from '../components/ClientMessage';
import { MenuView } from '../components/MenuView';
import { OrdersView } from '../components/OrdersView';
import { SelectionSheet } from '../components/SelectionSheet';
import { SessionSetup } from '../components/SessionSetup';
import { SwipePreview } from '../components/SwipePreview';
import { useClientBootstrap } from '../hooks/useClientBootstrap';
import { useClientCart } from '../hooks/useClientCart';
import { useClientOrders } from '../hooks/useClientOrders';
import { useClientServiceRequests } from '../hooks/useClientServiceRequests';
import { useClientSession } from '../hooks/useClientSession';
import { useClientSwipe } from '../hooks/useClientSwipe';
import { updateGuestBuffet } from '../services/guestApi';
import { createSession } from '../services/menuApi';
import { cancelOrderItem, createOrder } from '../services/orderApi';
import { getDeviceToken } from '../utils/deviceToken';

import './ClientPage.css';

export function ClientPage() {
  const { tableCode } = useParams<{ tableCode: string }>();
  const { showToast } = useToast();
  const session = useClientSession();
  const cart = useClientCart();
  const swipe = useClientSwipe();
  const { orders, setOrders, hydrateOrders, prependOrder, pollingError } = useClientOrders(
    tableCode,
    swipe.activeView,
  );
  const { status, error, reload, data } = useClientBootstrap({
    tableCode,
    setTable: session.setTable,
    setGuestCount: session.setGuestCount,
    setSessionState: session.setSessionState,
    onOrdersLoaded: hydrateOrders,
  });
  const serviceRequests = useClientServiceRequests({
    tableCode,
    enabled: status === 'ready' && session.sessionState === 'ready',
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [shouldRenderCart, setShouldRenderCart] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [floatingOrder, setFloatingOrder] = useState({
    isVisible: cart.cartCount > 0,
    count: cart.cartCount,
  });
  const pendingOrderRequestId = useRef<string | null>(null);

  const isFloatingOrderLeaving = cart.cartCount === 0;

  useEffect(() => {
    if (cart.cartCount > 0) {
      const appearanceTimer = window.setTimeout(
        () => setFloatingOrder({ isVisible: true, count: cart.cartCount }),
        0,
      );
      return () => window.clearTimeout(appearanceTimer);
    }

    if (!floatingOrder.isVisible) return;

    const removalTimer = window.setTimeout(() => {
      setFloatingOrder((current) => ({ ...current, isVisible: false }));
    }, 180);

    return () => window.clearTimeout(removalTimer);
  }, [cart.cartCount, floatingOrder.isVisible]);

  const selectedBuffet = useMemo(
    () =>
      data.buffets.find((buffet) => buffet.id === data.selectedBuffetId) ?? data.buffets[0] ?? null,
    [data.buffets, data.selectedBuffetId],
  );
  const cartItems = useMemo(
    () => data.menuItems.filter((item) => (cart.cart[item.id] ?? 0) > 0),
    [cart.cart, data.menuItems],
  );
  const chargedBuffetItemIds = useMemo(
    () => (data.selectedBuffetId === null ? new Set<number>() : new Set(data.buffetItemIds)),
    [data.buffetItemIds, data.selectedBuffetId],
  );
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  useEffect(() => {
    if (isCartOpen) {
      const appearanceTimer = window.setTimeout(() => setShouldRenderCart(true), 0);
      return () => window.clearTimeout(appearanceTimer);
    }

    if (!shouldRenderCart) return;

    const removalTimer = window.setTimeout(() => setShouldRenderCart(false), 260);
    return () => window.clearTimeout(removalTimer);
  }, [isCartOpen, shouldRenderCart]);

  async function handleCreateSession() {
    if (!tableCode || session.isCreatingSession) return;
    session.setIsCreatingSession(true);
    try {
      await createSession(tableCode, session.guestCount);
      session.setSessionState('waiting');
      reload();
    } catch (requestError) {
      showToast({
        title: 'The session could not be created',
        description: getErrorMessage(requestError),
        variant: 'danger',
      });
    } finally {
      session.setIsCreatingSession(false);
    }
  }

  async function handleSubmitOrder() {
    if (!tableCode || isSubmittingOrder || cart.cartCount === 0) return;
    setIsSubmittingOrder(true);
    try {
      const clientRequestId = pendingOrderRequestId.current ?? crypto.randomUUID();
      pendingOrderRequestId.current = clientRequestId;
      const order = await createOrder(tableCode, getDeviceToken(), {
        clientRequestId,
        items: Object.entries(cart.cart).map(([itemId, quantity]) => ({
          itemId: Number(itemId),
          quantity,
          notes: cart.notes[Number(itemId)] ?? null,
        })),
      });
      prependOrder(order);
      pendingOrderRequestId.current = null;
      cart.clearCart();
      setIsCartOpen(false);
      swipe.changeView('orders');
      showToast({
        title: 'Round sent',
        description: 'The order was sent to the kitchen.',
        variant: 'success',
      });
    } catch (requestError) {
      showToast({
        title: 'The round could not be sent',
        description: getErrorMessage(requestError),
        variant: 'danger',
      });
    } finally {
      setIsSubmittingOrder(false);
    }
  }

  async function handleCancelOrderItem(orderId: number, itemId: number) {
    if (!tableCode) return;
    try {
      const updatedItem = await cancelOrderItem(tableCode, orderId, itemId, getDeviceToken());
      setOrders((current) =>
        current.map((order) =>
          order.id !== orderId
            ? order
            : {
                ...order,
                items: order.items.map((item) => (item.id === itemId ? updatedItem : item)),
              },
        ),
      );
    } catch (requestError) {
      showToast({
        title: 'The item could not be cancelled',
        description: getErrorMessage(requestError),
        variant: 'danger',
      });
    }
  }

  async function handleChooseBuffet(buffetId: number | null) {
    if (!tableCode) return;
    try {
      const updatedGuest = await updateGuestBuffet(tableCode, getDeviceToken(), buffetId);
      if (updatedGuest.buffet_id === null) {
        cart.removeItems(data.buffetItemIds);
      }
      data.setSelectedBuffetId(updatedGuest.buffet_id);
      showToast({
        title: buffetId === null ? 'Buffet cancelled' : 'Buffet selected',
        description:
          buffetId === null
            ? 'Your buffet selection was removed.'
            : 'Your buffet selection was confirmed.',
        variant: 'success',
      });
    } catch (requestError) {
      showToast({
        title: 'The buffet could not be selected',
        description: getErrorMessage(requestError),
        variant: 'danger',
      });
      throw requestError;
    }
  }

  if (!tableCode) return <ClientMessage message="Table code is missing." isError />;
  if (status === 'loading') return <ClientMessage message="Preparing the menu…" />;
  if (status === 'error')
    return (
      <ClientMessage
        message={error ?? 'The menu could not be loaded.'}
        actionLabel="Try again"
        onAction={reload}
        isError
      />
    );

  if (session.sessionState === 'setup' && session.table) {
    return (
      <SessionSetup
        table={session.table}
        guestCount={session.guestCount}
        isSubmitting={session.isCreatingSession}
        onDecrease={() => session.setGuestCount((count) => Math.max(1, count - 1))}
        onIncrease={() =>
          session.setGuestCount((count) =>
            Math.min(session.table?.max_capacity ?? count, count + 1),
          )
        }
        onSubmit={handleCreateSession}
      />
    );
  }

  if (session.sessionState === 'waiting' && session.table) {
    return (
      <ClientMessage message={`Table ${session.table.table_number}: waiting for staff approval.`} />
    );
  }

  return (
    <>
      <ClientHeader
        tableNumber={session.table?.table_number}
        activeView={swipe.activeView}
        isDragging={swipe.isDraggingView}
        indicatorPosition={swipe.indicatorPosition}
        pendingServiceRequest={serviceRequests.pendingRequest}
        activeServiceRequests={serviceRequests.activeRequests}
        serviceRequestMessage={serviceRequests.pollingError}
        onChangeView={swipe.changeView}
        onServiceRequest={serviceRequests.toggleRequest}
      />
      <main
        className="client-shell min-h-screen bg-[#080b10] pb-24 text-content"
        onPointerDown={swipe.handlePointerDown}
        onPointerMove={swipe.handlePointerMove}
        onPointerUp={swipe.handlePointerUp}
        onPointerCancel={swipe.handlePointerCancel}
      >
        <div className="client-view-stage">
          <div
            key={swipe.activeView}
            className={`client-view${swipe.isDraggingView ? ' is-dragging' : ''}`}
            style={{
              transform:
                swipe.viewDragOffset === 0
                  ? undefined
                  : `translate3d(${swipe.viewDragOffset}px, 0, 0)`,
            }}
          >
            {swipe.activeView === 'menu' && (
              <MenuView
                stations={data.menuStations}
                cart={cart.cart}
                onAdd={cart.addToCart}
                onAddDetails={(itemId, quantity, notes) => {
                  cart.addQuantity(itemId, quantity);
                  cart.setItemNotes(itemId, notes);
                }}
                onRemove={cart.removeFromCart}
              />
            )}
            {swipe.activeView === 'buffet' && (
              <BuffetView
                buffet={selectedBuffet}
                stations={data.buffetStations}
                cart={cart.cart}
                isSelected={data.selectedBuffetId === selectedBuffet?.id}
                canCancelSelection={orders.length === 0}
                onAdd={cart.addToCart}
                onAddDetails={(itemId, quantity, notes) => {
                  cart.addQuantity(itemId, quantity);
                  cart.setItemNotes(itemId, notes);
                }}
                onRemove={cart.removeFromCart}
                onChoose={handleChooseBuffet}
              />
            )}
            {swipe.activeView === 'orders' && (
              <OrdersView
                orders={orders}
                onCancel={handleCancelOrderItem}
                refreshMessage={pollingError}
              />
            )}
          </div>
          {swipe.swipeTargetView && (
            <SwipePreview
              view={swipe.swipeTargetView}
              dragOffset={swipe.viewDragOffset}
              topOffset={swipe.previewTopOffset}
              isDragging={swipe.isDraggingView}
              isSettling={swipe.pendingView !== null}
              menuStations={data.menuStations}
              buffet={selectedBuffet}
              buffetStations={data.buffetStations}
              orders={orders}
              cart={cart.cart}
              isBuffetSelected={data.selectedBuffetId === selectedBuffet?.id}
              canCancelBuffet={orders.length === 0}
            />
          )}
        </div>
        {floatingOrder.isVisible && (
          <button
            type="button"
            className={`client-floating-order ${isFloatingOrderLeaving ? 'is-leaving' : ''}`}
            disabled={isFloatingOrderLeaving}
            onClick={() => setIsCartOpen(true)}
          >
            <span>View order</span>
            <strong>
              {floatingOrder.count} {floatingOrder.count === 1 ? 'item added' : 'items added'}
            </strong>
          </button>
        )}
        {shouldRenderCart && (
          <SelectionSheet
            items={cartItems}
            cart={cart.cart}
            buffetItemIds={chargedBuffetItemIds}
            isSubmitting={isSubmittingOrder}
            isClosing={!isCartOpen}
            onAdd={cart.addToCart}
            onRemove={cart.removeFromCart}
            onDelete={cart.removeCartItem}
            onClose={closeCart}
            onSubmit={handleSubmitOrder}
          />
        )}
      </main>
    </>
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.detail : 'Please try again.';
}
