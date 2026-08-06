import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { useToast } from '../../../components/ui/toast/useToast';
import { ApiError } from '../../../services/api/client';
import { createUuid } from '../../../utils/createUuid';
import { BuffetView } from '../components/BuffetView';
import { AllergyPreferencesModal } from '../components/AllergyPreferencesModal';
import { ClientHeader } from '../components/ClientHeader';
import { ClientMessage } from '../components/ClientMessage';
import { MenuView } from '../components/MenuView';
import { OrdersView } from '../components/OrdersView';
import { SelectionSheet } from '../components/SelectionSheet';
import { SessionSetup } from '../components/SessionSetup';
import { SwipePreview } from '../components/SwipePreview';
import { CLIENT_VIEWS } from '../clientTypes';
import { useClientBootstrap } from '../hooks/useClientBootstrap';
import { useClientCart } from '../hooks/useClientCart';
import { useClientOrders } from '../hooks/useClientOrders';
import { useClientServiceRequests } from '../hooks/useClientServiceRequests';
import { useClientSession } from '../hooks/useClientSession';
import { useClientSwipe } from '../hooks/useClientSwipe';
import { updateGuestAllergyPreferences, updateGuestBuffet } from '../services/guestApi';
import { createSession } from '../services/menuApi';
import { cancelOrderItem, createOrder } from '../services/orderApi';
import { getDeviceToken } from '../utils/deviceToken';

import './ClientPage.css';

const CLIENT_VIEWS_WITHOUT_BUFFET = ['menu', 'orders'] as const;

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
  const [isNoBuffetConfirmationOpen, setIsNoBuffetConfirmationOpen] = useState(false);
  const [isAllergyModalOpen, setIsAllergyModalOpen] = useState(false);
  const [shouldRenderAllergyModal, setShouldRenderAllergyModal] = useState(false);
  const [isSavingAllergies, setIsSavingAllergies] = useState(false);
  const [serviceRequestConfirmation, setServiceRequestConfirmation] = useState<
    'assistance' | 'payment_request' | null
  >(null);
  const [floatingOrder, setFloatingOrder] = useState({
    isVisible: cart.cartCount > 0,
    count: cart.cartCount,
  });
  const pendingOrderRequestId = useRef<string | null>(null);

  const needsAllergySetup =
    data.guest !== null && data.guest.allergy_preferences_completed_at === null;
  const isAllergyModalVisible = isAllergyModalOpen || needsAllergySetup;

  useEffect(() => {
    if (isAllergyModalVisible) {
      const appearanceTimer = window.setTimeout(() => setShouldRenderAllergyModal(true), 0);
      return () => window.clearTimeout(appearanceTimer);
    }

    if (!shouldRenderAllergyModal) return;

    const removalTimer = window.setTimeout(() => setShouldRenderAllergyModal(false), 260);
    return () => window.clearTimeout(removalTimer);
  }, [isAllergyModalVisible, shouldRenderAllergyModal]);

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
  const hasActiveOrder = useMemo(
    () =>
      orders.some((order) =>
        order.items.some(
          (item) => !['served', 'cancelled', 'returned'].includes(item.status.alias),
        ),
      ),
    [orders],
  );
  const isBuffetSelectionLocked = useMemo(
    () =>
      data.selectedBuffetId === null &&
      orders.some((order) =>
        order.items.some((item) => ['preparing', 'ready', 'served'].includes(item.status.alias)),
      ),
    [data.selectedBuffetId, orders],
  );
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const { activeView, changeView, updateAvailableViews } = swipe;

  useEffect(() => {
    updateAvailableViews(isBuffetSelectionLocked ? CLIENT_VIEWS_WITHOUT_BUFFET : CLIENT_VIEWS);
    if (isBuffetSelectionLocked && activeView === 'buffet') {
      changeView('menu');
    }
  }, [activeView, changeView, isBuffetSelectionLocked, updateAvailableViews]);

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
        title: 'Não foi possível criar a sessão',
        description: getErrorMessage(requestError),
        variant: 'danger',
      });
    } finally {
      session.setIsCreatingSession(false);
    }
  }

  function handleSubmitOrder() {
    if (hasActiveOrder) {
      showToast({
        title: 'Aguarde, por favor',
        description: 'Pode enviar outra ronda depois de o pedido atual ser servido.',
        variant: 'danger',
      });
      return;
    }

    if (orders.length === 0 && data.selectedBuffetId === null) {
      setIsNoBuffetConfirmationOpen(true);
      return;
    }

    void submitOrder();
  }

  async function submitOrder() {
    if (!tableCode || isSubmittingOrder || cart.cartCount === 0 || hasActiveOrder) return;
    setIsSubmittingOrder(true);
    try {
      const clientRequestId = pendingOrderRequestId.current ?? createUuid();
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
        title: 'Ronda enviada',
        description: 'O pedido foi enviado para a cozinha.',
        variant: 'success',
      });
    } catch (requestError) {
      showToast({
        title: 'Não foi possível enviar a ronda',
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
        title: 'Não foi possível cancelar o artigo',
        description: getErrorMessage(requestError),
        variant: 'danger',
      });
    }
  }

  async function handleChooseBuffet(buffetId: number | null) {
    if (!tableCode) return;
    if (buffetId !== null && isBuffetSelectionLocked) {
      showToast({
        title: 'Buffet indisponível',
        description: 'O primeiro pedido sem buffet já começou a ser preparado.',
        variant: 'danger',
      });
      return;
    }
    try {
      const updatedGuest = await updateGuestBuffet(tableCode, getDeviceToken(), buffetId);
      if (updatedGuest.buffet_id === null) {
        cart.removeItems(data.buffetItemIds);
      }
      data.setSelectedBuffetId(updatedGuest.buffet_id);
      showToast({
        title: buffetId === null ? 'Buffet cancelado' : 'Buffet selecionado',
        description:
          buffetId === null
            ? 'A seleção do buffet foi removida.'
            : 'A seleção do buffet foi confirmada.',
        variant: 'success',
      });
    } catch (requestError) {
      showToast({
        title: 'Não foi possível selecionar o buffet',
        description: getErrorMessage(requestError),
        variant: 'danger',
      });
      throw requestError;
    }
  }

  async function handleSaveAllergies(tagIds: number[]) {
    if (!tableCode || isSavingAllergies) return;
    setIsSavingAllergies(true);
    try {
      const updatedGuest = await updateGuestAllergyPreferences(tableCode, getDeviceToken(), tagIds);
      data.setGuest(updatedGuest);
      setIsAllergyModalOpen(false);
      showToast({
        title: 'Preferências de alergias guardadas',
        description: 'Os pratos com os alergénios selecionados apresentam um aviso amarelo.',
        variant: 'success',
      });
    } catch (requestError) {
      showToast({
        title: 'Não foi possível guardar as preferências',
        description: getErrorMessage(requestError),
        variant: 'danger',
      });
    } finally {
      setIsSavingAllergies(false);
    }
  }

  function handleServiceRequest(type: 'assistance' | 'payment_request') {
    if (serviceRequests.activeRequests[type] !== undefined) {
      void serviceRequests.toggleRequest(type);
      return;
    }

    setServiceRequestConfirmation(type);
  }

  function confirmServiceRequest() {
    if (serviceRequestConfirmation === null) return;

    const type = serviceRequestConfirmation;
    setServiceRequestConfirmation(null);
    void serviceRequests.toggleRequest(type);
  }

  if (!tableCode) return <ClientMessage message="Falta o código da mesa." isError />;
  if (status === 'loading') return <ClientMessage message="A preparar o menu…" />;
  if (status === 'error')
    return (
      <ClientMessage
        message={error ?? 'Não foi possível carregar o menu.'}
        actionLabel="Tentar novamente"
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
      <ClientMessage
        message={`Mesa ${session.table.table_number}: a aguardar aprovação de um funcionário.`}
      />
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
        showBuffet={!isBuffetSelectionLocked}
        onChangeView={(view) => {
          if (view !== 'buffet' || !isBuffetSelectionLocked) swipe.changeView(view);
        }}
        onServiceRequest={handleServiceRequest}
        onEditAllergies={() => setIsAllergyModalOpen(true)}
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
                selectedAllergenTagIds={data.selectedAllergenTagIds}
                cart={cart.cart}
                onAdd={cart.addToCart}
                onAddDetails={(itemId, quantity, notes) => {
                  cart.addQuantity(itemId, quantity);
                  cart.setItemNotes(itemId, notes);
                }}
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
          {swipe.swipeTargetView &&
            !(swipe.swipeTargetView === 'buffet' && isBuffetSelectionLocked) && (
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
            <span>Ver pedido</span>
            <strong>
              {floatingOrder.count}{' '}
              {floatingOrder.count === 1 ? 'artigo adicionado' : 'artigos adicionados'}
            </strong>
          </button>
        )}
        {shouldRenderCart && (
          <SelectionSheet
            items={cartItems}
            cart={cart.cart}
            buffetItemIds={chargedBuffetItemIds}
            selectedAllergenTagIds={data.selectedAllergenTagIds}
            isSubmitting={isSubmittingOrder}
            hasActiveOrder={hasActiveOrder}
            isClosing={!isCartOpen}
            onAdd={cart.addToCart}
            onRemove={cart.removeFromCart}
            onDelete={cart.removeCartItem}
            onClose={closeCart}
            onSubmit={handleSubmitOrder}
          />
        )}
        {isNoBuffetConfirmationOpen && (
          <div
            className="client-buffet-modal-backdrop"
            role="presentation"
            onClick={() => {
              if (!isSubmittingOrder) setIsNoBuffetConfirmationOpen(false);
            }}
          >
            <section
              className="client-buffet-modal"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="no-buffet-confirmation-title"
              aria-describedby="no-buffet-confirmation-description"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="no-buffet-confirmation-title">Continuar sem buffet?</h2>
              <p id="no-buffet-confirmation-description">
                Depois de enviar a primeira ronda, deixará de poder selecionar um buffet nesta
                sessão. Pretende continuar?
              </p>
              <div className="client-buffet-modal-actions">
                <button
                  type="button"
                  className="is-secondary"
                  disabled={isSubmittingOrder}
                  onClick={() => setIsNoBuffetConfirmationOpen(false)}
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={isSubmittingOrder}
                  onClick={() => {
                    setIsNoBuffetConfirmationOpen(false);
                    void submitOrder();
                  }}
                >
                  {isSubmittingOrder ? 'A enviar…' : 'Enviar ronda'}
                </button>
              </div>
            </section>
          </div>
        )}
        {serviceRequestConfirmation && (
          <div
            className="client-buffet-modal-backdrop"
            role="presentation"
            onClick={() => setServiceRequestConfirmation(null)}
          >
            <section
              className="client-buffet-modal"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="service-request-confirmation-title"
              aria-describedby="service-request-confirmation-description"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="service-request-confirmation-title">
                {serviceRequestConfirmation === 'assistance'
                  ? 'Chamar um funcionário?'
                  : 'Pedir a conta?'}
              </h2>
              <p id="service-request-confirmation-description">
                {serviceRequestConfirmation === 'assistance'
                  ? 'O funcionário responsável pela sua mesa será notificado e irá prestar assistência.'
                  : 'O funcionário responsável pela sua mesa será notificado de que pretende pagar.'}
              </p>
              <div className="client-buffet-modal-actions">
                <button
                  type="button"
                  className="is-secondary"
                  onClick={() => setServiceRequestConfirmation(null)}
                >
                  Cancelar
                </button>
                <button type="button" onClick={confirmServiceRequest}>
                  Confirmar
                </button>
              </div>
            </section>
          </div>
        )}
        {shouldRenderAllergyModal && data.guest && (
          <AllergyPreferencesModal
            tags={data.allergenTags}
            selectedTagIds={data.guest.allergy_tag_ids}
            isInitialSetup={needsAllergySetup}
            isSaving={isSavingAllergies}
            isClosing={!isAllergyModalVisible}
            onClose={() => {
              if (!needsAllergySetup && !isSavingAllergies) setIsAllergyModalOpen(false);
            }}
            onSave={(tagIds) => void handleSaveAllergies(tagIds)}
          />
        )}
      </main>
    </>
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.detail : 'Tente novamente.';
}
