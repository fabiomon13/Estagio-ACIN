import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { useToast } from '../../../components/ui/toast/useToast';
import { ApiError } from '../../../services/api/client';
import { createUuid } from '../../../utils/createUuid';
import { SelectionSheet } from '../components/selection/SelectionSheet';
import { AllergyPreferencesModal } from '../components/shared/AllergyPreferencesModal';
import { ClientHeader } from '../components/shared/ClientHeader';
import { ClientMessage } from '../components/shared/ClientMessage';
import { SessionSetup } from '../components/shared/SessionSetup';
import { CLIENT_VIEWS } from '../clientTypes';
import { useClientBootstrap } from '../hooks/useClientBootstrap';
import { useClientCart } from '../hooks/useClientCart';
import { useClientOrders } from '../hooks/useClientOrders';
import { useClientRealtime } from '../hooks/useClientRealtime';
import { useClientServiceRequests } from '../hooks/useClientServiceRequests';
import { useClientSession } from '../hooks/useClientSession';
import { useClientSwipe } from '../hooks/swipe/useClientSwipe';
import { updateGuestAllergyPreferences, updateGuestBuffet } from '../services/guestApi';
import { createSession } from '../services/menuApi';
import { cancelOrderItem, createOrder } from '../services/orderApi';
import { getDeviceToken } from '../utils/deviceToken';
import { ClientConfirmationModal } from './components/ClientConfirmationModal';
import { ClientViewStage } from './components/ClientViewStage';

import './ClientPage.css';

const CLIENT_VIEWS_WITHOUT_BUFFET = ['menu', 'orders'] as const;

export function ClientPage() {
  const { tableCode } = useParams<{ tableCode: string }>();
  const { showToast } = useToast();
  const session = useClientSession();
  const cart = useClientCart();
  const swipe = useClientSwipe();
  const clientOrders = useClientOrders(tableCode);
  const { orders, setOrders, hydrateOrders, prependOrder, refreshError } = clientOrders;
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
  const realtimeEnabled = status === 'ready' && session.sessionState === 'ready';
  const realtimeStatus = useClientRealtime({
    tableCode,
    enabled: realtimeEnabled,
    onOrdersChanged: clientOrders.refetch,
    onServiceRequestsChanged: serviceRequests.refetch,
    onSessionChanged: reload,
    onMenuChanged: reload,
    onReconnect: () => {
      void serviceRequests.refetch();
      reload();
    },
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [shouldRenderCart, setShouldRenderCart] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isNoBuffetConfirmationOpen, setIsNoBuffetConfirmationOpen] = useState(false);
  const [shouldRenderNoBuffetConfirmation, setShouldRenderNoBuffetConfirmation] = useState(false);
  const [isAllergyModalOpen, setIsAllergyModalOpen] = useState(false);
  const [shouldRenderAllergyModal, setShouldRenderAllergyModal] = useState(false);
  const [isSavingAllergies, setIsSavingAllergies] = useState(false);
  const [serviceRequestConfirmation, setServiceRequestConfirmation] = useState<
    'assistance' | 'payment_request' | null
  >(null);
  const [renderedServiceRequestConfirmation, setRenderedServiceRequestConfirmation] = useState<
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

  useEffect(() => {
    if (isNoBuffetConfirmationOpen) {
      const appearanceTimer = window.setTimeout(() => setShouldRenderNoBuffetConfirmation(true), 0);
      return () => window.clearTimeout(appearanceTimer);
    }

    if (!shouldRenderNoBuffetConfirmation) return;

    const removalTimer = window.setTimeout(() => setShouldRenderNoBuffetConfirmation(false), 240);
    return () => window.clearTimeout(removalTimer);
  }, [isNoBuffetConfirmationOpen, shouldRenderNoBuffetConfirmation]);

  useEffect(() => {
    if (serviceRequestConfirmation !== null) {
      const confirmation = serviceRequestConfirmation;
      const appearanceTimer = window.setTimeout(
        () => setRenderedServiceRequestConfirmation(confirmation),
        0,
      );
      return () => window.clearTimeout(appearanceTimer);
    }

    if (renderedServiceRequestConfirmation === null) return;

    const removalTimer = window.setTimeout(() => setRenderedServiceRequestConfirmation(null), 240);
    return () => window.clearTimeout(removalTimer);
  }, [renderedServiceRequestConfirmation, serviceRequestConfirmation]);

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

  async function handleSaveAllergies(tagIds: readonly number[]) {
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
        serviceRequestMessage={serviceRequests.refreshError}
        showBuffet={!isBuffetSelectionLocked}
        onChangeView={(view) => {
          if (view !== 'buffet' || !isBuffetSelectionLocked) swipe.changeView(view);
        }}
        onServiceRequest={handleServiceRequest}
        onEditAllergies={() => setIsAllergyModalOpen(true)}
      />
      <main
        className="client-shell bg-[#080b10] pb-24 text-content"
        onPointerDown={swipe.handlePointerDown}
        onPointerMove={swipe.handlePointerMove}
        onPointerUp={swipe.handlePointerUp}
        onPointerCancel={swipe.handlePointerCancel}
        onLostPointerCapture={swipe.handleLostPointerCapture}
      >
        {realtimeStatus === 'reconnecting' && (
          <p className="sr-only" role="status">
            A restabelecer a ligação em tempo real.
          </p>
        )}
        <ClientViewStage
          swipe={swipe}
          data={data}
          cart={cart}
          orders={orders}
          selectedBuffet={selectedBuffet}
          isBuffetSelectionLocked={isBuffetSelectionLocked}
          refreshError={refreshError}
          onChooseBuffet={handleChooseBuffet}
          onCancelOrderItem={handleCancelOrderItem}
        />
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
        {shouldRenderNoBuffetConfirmation && (
          <ClientConfirmationModal
            title="Continuar sem buffet?"
            description="Depois de enviar a primeira ronda, deixará de poder selecionar um buffet nesta sessão. Pretende continuar?"
            cancelLabel="Voltar"
            confirmLabel="Enviar ronda"
            isOpen={isNoBuffetConfirmationOpen}
            isBusy={isSubmittingOrder}
            onCancel={() => setIsNoBuffetConfirmationOpen(false)}
            onConfirm={() => {
              setIsNoBuffetConfirmationOpen(false);
              void submitOrder();
            }}
          />
        )}
        {renderedServiceRequestConfirmation && (
          <ClientConfirmationModal
            title={
              renderedServiceRequestConfirmation === 'assistance'
                ? 'Chamar um funcionário?'
                : 'Pedir a conta?'
            }
            description={
              renderedServiceRequestConfirmation === 'assistance'
                ? 'O funcionário responsável pela sua mesa será notificado e irá prestar assistência.'
                : 'O funcionário responsável pela sua mesa será notificado de que pretende pagar.'
            }
            confirmLabel="Confirmar"
            isOpen={serviceRequestConfirmation !== null}
            onCancel={() => setServiceRequestConfirmation(null)}
            onConfirm={confirmServiceRequest}
          />
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
