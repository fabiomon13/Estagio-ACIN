import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import { useParams } from 'react-router-dom';

import LogoIcon from '../../../components/icons/Logo';
import PlusIcon from '../../../components/icons/PlusIcon';
import { useToast } from '../../../components/ui/toast/useToast';
import { ApiError } from '../../../services/api/client';
import { ensureGuest, updateGuestBuffet } from '../services/guestApi';
import {
  createSession,
  getBuffetItems,
  getBuffets,
  getCategories,
  getActiveSession,
  getMenu,
  getTable,
  type Category,
  type Buffet,
  type MenuItem,
  type Table,
} from '../services/menuApi';
import { getDeviceToken } from '../utils/deviceToken';
import {
  cancelServiceRequest,
  createServiceRequest,
  getServiceRequests,
  type ServiceRequestType,
} from '../services/serviceRequestApi';
import { cancelOrderItem, createOrder, getOrders, type ClientOrder } from '../services/orderApi';
import './ClientPage.css';

const categoryNames: Record<string, string> = {
  'alcoholic-drinks': 'Alcoholic drinks',
  desserts: 'Desserts',
  nigiri: 'Nigiri',
  ramen: 'Ramen',
  sashimi: 'Sashimi',
  'soft-drinks-water': 'Soft drinks & water',
  tempura: 'Tempura',
};

const stationKeysByCategory: Record<string, string> = {
  'alcoholic-drinks': 'bar',
  'soft-drinks-water': 'bar',
  desserts: 'cold-pantry',
  tempura: 'fryer',
  ramen: 'hot-wok',
  nigiri: 'sushi-bar',
  sashimi: 'sushi-bar',
};

const stationNamesByCategory: Record<string, string> = {
  'alcoholic-drinks': 'Drinks',
  'soft-drinks-water': 'Drinks',
  desserts: 'Cold kitchen',
  tempura: 'Fried dishes',
  ramen: 'Hot dishes',
  nigiri: 'Sushi',
  sashimi: 'Sushi',
};

const tagNames: Record<string, string> = {
  vegetariano: 'Vegetarian',
  vegan: 'Vegan',
  'sem-gluten': 'Gluten-free',
  'sem-lactose': 'Lactose-free',
  'alergenio-gluten': 'Gluten',
  'alergenio-crustaceos': 'Crustaceans',
  'alergenio-ovos': 'Eggs',
  'alergenio-peixe': 'Fish',
  'alergenio-amendoins': 'Peanuts',
  'alergenio-soja': 'Soy',
  'alergenio-leite': 'Milk',
  'alergenio-frutos-de-casca-rija': 'Tree nuts',
  'alergenio-aipo': 'Celery',
  'alergenio-mostarda': 'Mustard',
  'alergenio-sesamo': 'Sesame',
  'alergenio-sulfitos': 'Sulphites',
  'alergenio-tremoco': 'Lupin',
  'alergenio-moluscos': 'Molluscs',
};

const productEmoji: Record<string, string> = {
  'alcoholic-drinks': '🍷',
  desserts: '🍰',
  nigiri: '🍣',
  ramen: '🍜',
  sashimi: '🐟',
  'soft-drinks-water': '🥤',
  tempura: '🍤',
};

function formatPrice(value: string): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value));
}

export function ClientPage() {
  const { showToast } = useToast();
  const { tableCode } = useParams<{ tableCode: string }>();
  const [table, setTable] = useState<Table | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [buffets, setBuffets] = useState<Buffet[]>([]);
  const [buffetItems, setBuffetItems] = useState<MenuItem[]>([]);
  const [selectedBuffetId, setSelectedBuffetId] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<'menu' | 'buffet' | 'orders'>('menu');
  const [pendingView, setPendingView] = useState<'menu' | 'buffet' | 'orders' | null>(null);
  const [viewDragOffset, setViewDragOffset] = useState(0);
  const [isDraggingView, setIsDraggingView] = useState(false);
  const [expandedStation, setExpandedStation] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionState, setSessionState] = useState<'setup' | 'waiting' | 'ready'>('ready');
  const [guestCount, setGuestCount] = useState(2);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [pendingServiceRequest, setPendingServiceRequest] = useState<ServiceRequestType | null>(
    null,
  );
  const [activeServiceRequests, setActiveServiceRequests] = useState<
    Partial<Record<ServiceRequestType, number>>
  >({});
  const categoryScrollLocked = useRef(false);
  const categoryScrollUnlockTimer = useRef<number | null>(null);
  const swipeStart = useRef<{ x: number; y: number; ignore: boolean } | null>(null);

  useEffect(() => {
    if (!tableCode) {
      return;
    }

    let isActive = true;

    getTable(tableCode)
      .then(async (currentTable) => {
        if (!isActive) return;
        setTable(currentTable);
        setGuestCount(Math.min(2, currentTable.max_capacity));

        try {
          const session = await getActiveSession(tableCode);

          if (!session.is_approved || session.waiter_id === null) {
            setSessionState('waiting');
            return;
          }
        } catch (requestError) {
          if (requestError instanceof ApiError && requestError.status === 404) {
            setSessionState('setup');
            return;
          }

          throw requestError;
        }

        const [guest, menuCategories, menu, availableBuffets] = await Promise.all([
          ensureGuest(tableCode, getDeviceToken()),
          getCategories(),
          getMenu(),
          getBuffets(),
        ]);

        if (!isActive) return;
        setSessionState('ready');
        setCategories(menuCategories);
        setMenuItems(menu.items);
        setSelectedBuffetId(guest.buffet_id);
        setBuffets(availableBuffets);
        if (availableBuffets[0]) {
          setBuffetItems(await getBuffetItems(availableBuffets[0].id));
        }
        setSelectedCategory(null);
      })
      .catch((requestError: unknown) => {
        if (!isActive) return;
        setError(
          requestError instanceof ApiError ? requestError.detail : 'The menu could not be loaded.',
        );
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [tableCode]);

  useEffect(() => {
    if (activeView !== 'orders' || !tableCode) return;

    let isActive = true;
    const loadOrders = () => {
      getOrders(tableCode, getDeviceToken())
        .then((nextOrders) => {
          if (isActive) setOrders(nextOrders);
        })
        .catch(() => undefined);
    };

    loadOrders();
    const timer = window.setInterval(loadOrders, 5000);

    return () => {
      isActive = false;
      window.clearInterval(timer);
    };
  }, [activeView, tableCode]);

  useEffect(() => {
    if (sessionState !== 'ready' || !tableCode || isLoading) return;

    let isActive = true;

    const loadServiceRequests = () => {
      getServiceRequests(tableCode, getDeviceToken())
        .then((requests) => {
          if (!isActive) return;

          const activeRequests: Partial<Record<ServiceRequestType, number>> = {};
          for (const request of requests) {
            if (request.resolved_at === null && request.status.alias === 'pending') {
              activeRequests[request.request_type.alias] = request.id;
            }
          }
          setActiveServiceRequests(activeRequests);
        })
        .catch(() => undefined);
    };

    loadServiceRequests();
    const timer = window.setInterval(loadServiceRequests, 5000);

    return () => {
      isActive = false;
      window.clearInterval(timer);
    };
  }, [isLoading, sessionState, tableCode]);

  useEffect(() => {
    if (sessionState !== 'waiting' || !tableCode) return;

    let isActive = true;
    let isChecking = false;

    const checkApproval = async () => {
      if (isChecking) return;
      isChecking = true;

      try {
        const session = await getActiveSession(tableCode);
        if (!session.is_approved || session.waiter_id === null || !isActive) return;

        const [guest, menuCategories, menu, availableBuffets] = await Promise.all([
          ensureGuest(tableCode, getDeviceToken()),
          getCategories(),
          getMenu(),
          getBuffets(),
        ]);

        if (!isActive) return;
        setCategories(menuCategories);
        setMenuItems(menu.items);
        setSelectedBuffetId(guest.buffet_id);
        setBuffets(availableBuffets);
        setSelectedCategory(null);

        if (availableBuffets[0]) {
          setBuffetItems(await getBuffetItems(availableBuffets[0].id));
        }

        if (isActive) setSessionState('ready');
      } catch {
        // Keep waiting and retry: temporary API failures should not block the client.
      } finally {
        isChecking = false;
      }
    };

    void checkApproval();
    const timer = window.setInterval(checkApproval, 2500);

    return () => {
      isActive = false;
      window.clearInterval(timer);
    };
  }, [sessionState, tableCode]);

  const categorySections = useMemo(() => {
    const buffetItemIds = new Set(buffetItems.map((item) => item.id));
    const visibleMenuItems =
      selectedBuffetId === null
        ? menuItems
        : menuItems.filter((item) => !buffetItemIds.has(item.id));

    return categories
      .map((category) => ({
        category,
        items: visibleMenuItems.filter((item) => item.category_id === category.id),
      }))
      .filter(({ items }) => items.length > 0);
  }, [buffetItems, categories, menuItems, selectedBuffetId]);
  const stationSections = useMemo(
    () =>
      categorySections
        .reduce<
          Array<{
            key: string;
            name: string;
            categories: typeof categorySections;
          }>
        >((groups, section) => {
          const key = stationKeysByCategory[section.category.alias] ?? section.category.alias;
          const existingGroup = groups.find((group) => group.key === key);

          if (existingGroup) {
            existingGroup.categories.push(section);
          } else {
            groups.push({
              key,
              name: stationNamesByCategory[section.category.alias] ?? section.category.name,
              categories: [section],
            });
          }

          return groups;
        }, [])
        .map((group) => {
          if (group.key === 'bar') {
            const categoryPosition: Record<string, number> = {
              'soft-drinks-water': 0,
              'alcoholic-drinks': 1,
            };

            group.categories.sort(
              (first, second) =>
                (categoryPosition[first.category.alias] ?? 0) -
                (categoryPosition[second.category.alias] ?? 0),
            );
          }

          return group;
        })
        .sort((first, second) => {
          const position: Record<string, number> = {
            bar: 1,
            'cold-pantry': 2,
          };

          return (position[first.key] ?? 0) - (position[second.key] ?? 0);
        }),
    [categorySections],
  );
  const cartCount = Object.values(cart).reduce((total, quantity) => total + quantity, 0);
  const cartItems = menuItems.filter((item) => (cart[item.id] ?? 0) > 0);
  const buffet = buffets[0] ?? null;
  const buffetCategorySections = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          items: buffetItems.filter((item) => item.category_id === category.id),
        }))
        .filter(({ items }) => items.length > 0),
    [buffetItems, categories],
  );

  useEffect(() => {
    if (categorySections.length === 0 || stationSections.length === 0) return;

    let animationFrame = 0;

    const updateCategoryFromScroll = () => {
      animationFrame = 0;

      if (categoryScrollLocked.current) return;

      const distanceFromBottom =
        document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);

      if (distanceFromBottom <= 2) {
        const lastStation = stationSections[stationSections.length - 1];
        const lastCategory = lastStation.categories[lastStation.categories.length - 1].category;
        setSelectedCategory((current) => (current === lastCategory.id ? current : lastCategory.id));
        return;
      }

      const viewportCenter = window.innerHeight / 2;
      let activeCategoryId = stationSections[0].categories[0].category.id;
      let closestDistance = Number.POSITIVE_INFINITY;

      for (const { category } of categorySections) {
        const section = document.getElementById(`menu-category-${category.id}`);
        const sectionRect = section?.getBoundingClientRect();

        if (!sectionRect) continue;

        const distance =
          viewportCenter < sectionRect.top
            ? sectionRect.top - viewportCenter
            : viewportCenter > sectionRect.bottom
              ? viewportCenter - sectionRect.bottom
              : 0;

        if (distance < closestDistance) {
          activeCategoryId = category.id;
          closestDistance = distance;
        }
      }

      setSelectedCategory((current) => (current === activeCategoryId ? current : activeCategoryId));
    };

    const handleScroll = () => {
      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(updateCategoryFromScroll);
      }
    };

    updateCategoryFromScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      if (categoryScrollUnlockTimer.current !== null) {
        window.clearTimeout(categoryScrollUnlockTimer.current);
      }
    };
  }, [categorySections, stationSections]);

  useEffect(() => {
    if (selectedCategory === null) return;

    const activeStation = stationSections.find((station) =>
      station.categories.some(({ category }) => category.id === selectedCategory),
    );

    setExpandedStation(
      activeStation && activeStation.categories.length > 1 ? activeStation.key : null,
    );
  }, [selectedCategory, stationSections]);

  useEffect(() => {
    if (selectedCategory === null) return;

    const categoryButton = document.querySelector<HTMLElement>(
      `[data-category-id="${selectedCategory}"]`,
    );

    if (categoryButton) {
      categoryButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      return;
    }

    const selectedStation = stationSections.find((station) =>
      station.categories.some(({ category }) => category.id === selectedCategory),
    );
    document
      .querySelector<HTMLElement>(`[data-station-key="${selectedStation?.key}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [expandedStation, selectedCategory, stationSections]);

  function addToCart(itemId: number) {
    setCart((current) => ({ ...current, [itemId]: (current[itemId] ?? 0) + 1 }));
  }

  function removeFromCart(itemId: number) {
    setCart((current) => {
      const nextQuantity = (current[itemId] ?? 0) - 1;

      if (nextQuantity <= 0) {
        const nextCart = { ...current };
        delete nextCart[itemId];
        return nextCart;
      }

      return { ...current, [itemId]: nextQuantity };
    });
  }

  function removeCartItem(itemId: number) {
    setCart((current) => {
      const nextCart = { ...current };
      delete nextCart[itemId];
      return nextCart;
    });
  }

  async function submitOrder() {
    if (!tableCode || isSubmittingOrder || cartCount === 0) return;

    setIsSubmittingOrder(true);
    try {
      const order = await createOrder(
        tableCode,
        getDeviceToken(),
        Object.entries(cart).map(([itemId, quantity]) => ({
          item_id: Number(itemId),
          quantity,
          notes: null,
        })),
      );
      setOrders((current) => [order, ...current]);
      setCart({});
      setIsCartOpen(false);
      changeView('orders');
      showToast({
        title: 'Round sent',
        description: 'The order was sent to the kitchen.',
        variant: 'success',
      });
    } catch (requestError) {
      showToast({
        title: 'The round could not be sent',
        description: requestError instanceof ApiError ? requestError.detail : 'Please try again.',
        variant: 'danger',
      });
    } finally {
      setIsSubmittingOrder(false);
    }
  }

  function scrollToCategory(categoryId: number) {
    categoryScrollLocked.current = true;
    setSelectedCategory(categoryId);

    const targetStation = stationSections.find((station) =>
      station.categories.some(({ category }) => category.id === categoryId),
    );
    setExpandedStation(
      targetStation && targetStation.categories.length > 1 ? targetStation.key : null,
    );

    if (categoryScrollUnlockTimer.current !== null) {
      window.clearTimeout(categoryScrollUnlockTimer.current);
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const targetSection = document.getElementById(`menu-category-${categoryId}`);
        if (!targetSection) return;

        const stickyOffset = 178;
        const targetTop = targetSection.getBoundingClientRect().top + window.scrollY - stickyOffset;
        window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
      });
    });

    categoryScrollUnlockTimer.current = window.setTimeout(() => {
      categoryScrollLocked.current = false;
      categoryScrollUnlockTimer.current = null;
    }, 1000);
  }

  function toggleStation(stationKey: string) {
    const station = stationSections.find((section) => section.key === stationKey);
    if (!station) return;

    scrollToCategory(station.categories[0].category.id);
  }

  async function handleCreateSession() {
    if (!tableCode) return;

    setIsCreatingSession(true);
    setError(null);

    try {
      await createSession(tableCode, guestCount);
      setSessionState('waiting');
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.detail
          : 'The session could not be created.',
      );
    } finally {
      setIsCreatingSession(false);
    }
  }

  async function handleServiceRequest(type: ServiceRequestType) {
    if (!tableCode || pendingServiceRequest) return;

    setPendingServiceRequest(type);

    try {
      const activeRequestId = activeServiceRequests[type];

      if (activeRequestId !== undefined) {
        await cancelServiceRequest(tableCode, getDeviceToken(), activeRequestId);
        setActiveServiceRequests((current) => {
          const next = { ...current };
          delete next[type];
          return next;
        });
        showToast({
          title: type === 'payment_request' ? 'Bill request cancelled' : 'Assistance cancelled',
          description: 'The request was cancelled.',
          variant: 'default',
        });
      } else {
        const request = await createServiceRequest(tableCode, getDeviceToken(), type);
        setActiveServiceRequests((current) => ({ ...current, [type]: request.id }));
        showToast({
          title: type === 'payment_request' ? 'Bill requested' : 'Staff called',
          description: 'The request was sent to the staff.',
          variant: 'success',
        });
      }
    } catch (requestError) {
      showToast({
        title: 'The request could not be sent',
        description: requestError instanceof ApiError ? requestError.detail : 'Please try again.',
        variant: 'danger',
      });
    } finally {
      setPendingServiceRequest(null);
    }
  }

  function changeView(view: 'menu' | 'buffet' | 'orders') {
    if (view === activeView || pendingView !== null) return;
    const viewOrder = ['menu', 'buffet', 'orders'];
    const movesLeft = viewOrder.indexOf(view) > viewOrder.indexOf(activeView);
    const direction = movesLeft ? -1 : 1;

    setPendingView(view);
    setViewDragOffset(direction);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setViewDragOffset(direction * window.innerWidth));
    });

    window.setTimeout(() => {
      setActiveView(view);
      setPendingView(null);
      setViewDragOffset(0);
    }, 200);
  }

  function finishSwipe(view: 'menu' | 'buffet' | 'orders') {
    const viewOrder = ['menu', 'buffet', 'orders'];
    const direction = viewOrder.indexOf(view) > viewOrder.indexOf(activeView) ? -1 : 1;

    setPendingView(view);
    setViewDragOffset(direction * window.innerWidth);

    window.setTimeout(() => {
      setActiveView(view);
      setPendingView(null);
      setViewDragOffset(0);
    }, 200);
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    const touch = event.touches[0];
    const target = event.target instanceof Element ? event.target : null;

    swipeStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      ignore: Boolean(
        target?.closest('.client-category-row, .client-buffet-categories, .client-selection-sheet'),
      ),
    };
  }

  function handleTouchMove(event: TouchEvent<HTMLElement>) {
    const start = swipeStart.current;
    if (!start || start.ignore) return;

    const touch = event.touches[0];
    const horizontalDistance = touch.clientX - start.x;
    const verticalDistance = touch.clientY - start.y;

    if (Math.abs(horizontalDistance) <= Math.abs(verticalDistance)) return;
    if (activeView === 'menu' && horizontalDistance > 0) return;
    if (activeView === 'orders' && horizontalDistance < 0) return;

    event.preventDefault();
    setIsDraggingView(true);
    setViewDragOffset(horizontalDistance);
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    setIsDraggingView(false);
    if (!start || start.ignore) {
      setViewDragOffset(0);
      return;
    }

    const touch = event.changedTouches[0];
    const horizontalDistance = touch.clientX - start.x;
    const verticalDistance = touch.clientY - start.y;

    if (
      Math.abs(horizontalDistance) < 60 ||
      Math.abs(horizontalDistance) <= Math.abs(verticalDistance)
    ) {
      setViewDragOffset(0);
      return;
    }

    if (horizontalDistance < 0 && activeView === 'menu') finishSwipe('buffet');
    if (horizontalDistance < 0 && activeView === 'buffet') finishSwipe('orders');
    if (horizontalDistance > 0 && activeView === 'orders') finishSwipe('buffet');
    if (horizontalDistance > 0 && activeView === 'buffet') finishSwipe('menu');
  }

  async function handleCancelOrderItem(orderId: number, itemId: number) {
    if (!tableCode) return;

    try {
      const updatedItem = await cancelOrderItem(tableCode, orderId, itemId, getDeviceToken());
      setOrders((current) =>
        current.map((order) =>
          order.id === orderId
            ? {
                ...order,
                items: order.items.map((item) => (item.id === itemId ? updatedItem : item)),
              }
            : order,
        ),
      );
    } catch (requestError) {
      showToast({
        title: 'The item could not be cancelled',
        description: requestError instanceof ApiError ? requestError.detail : 'Please try again.',
        variant: 'danger',
      });
    }
  }

  async function handleChooseBuffet(buffetId: number | null) {
    if (!tableCode) return;

    try {
      await updateGuestBuffet(tableCode, getDeviceToken(), buffetId);
      setSelectedBuffetId(buffetId);
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
        description: requestError instanceof ApiError ? requestError.detail : 'Please try again.',
        variant: 'danger',
      });
      throw requestError;
    }
  }

  if (!tableCode) {
    return <ClientMessage message="Table code is missing." isError />;
  }

  if (isLoading) {
    return <ClientMessage message="Preparing the menu…" />;
  }

  if (error) {
    return <ClientMessage message={error} isError />;
  }

  if (sessionState === 'setup' && table) {
    return (
      <SessionSetup
        table={table}
        guestCount={guestCount}
        isSubmitting={isCreatingSession}
        onDecrease={() => setGuestCount((count) => Math.max(1, count - 1))}
        onIncrease={() => setGuestCount((count) => Math.min(table.max_capacity, count + 1))}
        onSubmit={handleCreateSession}
      />
    );
  }

  if (sessionState === 'waiting' && table) {
    return <ClientMessage message={`Table ${table.table_number}: waiting for staff approval.`} />;
  }

  const swipeTargetView =
    pendingView ??
    (viewDragOffset < 0
      ? activeView === 'menu'
        ? 'buffet'
        : activeView === 'buffet'
          ? 'orders'
          : null
      : viewDragOffset > 0
        ? activeView === 'orders'
          ? 'buffet'
          : activeView === 'buffet'
            ? 'menu'
            : null
        : null);
  const activeViewIndex = ['menu', 'buffet', 'orders'].indexOf(activeView);
  const pendingViewIndex = pendingView
    ? ['menu', 'buffet', 'orders'].indexOf(pendingView)
    : activeViewIndex;
  const transitionProgress = Math.min(Math.abs(viewDragOffset) / Math.max(window.innerWidth, 1), 1);
  const navIndicatorPosition = pendingView
    ? activeViewIndex + (pendingViewIndex - activeViewIndex) * transitionProgress
    : activeViewIndex - viewDragOffset / Math.max(window.innerWidth, 1);

  return (
    <>
      <header className="client-header">
        <div className="client-header-inner mx-auto flex max-w-lg items-center justify-between">
          <LogoIcon className="client-logo w-28" />
          <div className="client-header-actions flex items-center gap-3">
            <div className="client-table-indicator text-right">
              <p className="client-table-label text-[9px] uppercase tracking-[0.18em] text-content-subtle">
                Table
              </p>
              <p className="client-table-number font-display text-lg font-bold leading-none">
                {table?.table_number}
              </p>
            </div>
            <div className="client-header-service-actions">
              <button
                type="button"
                className={`client-header-service-button ${
                  activeServiceRequests.payment_request !== undefined ? 'is-payment-active' : ''
                }`}
                aria-label="Request the bill"
                title="Request the bill"
                disabled={pendingServiceRequest !== null}
                onClick={() => handleServiceRequest('payment_request')}
              >
                <span aria-hidden="true">💳</span>
              </button>
              <button
                type="button"
                className={`client-header-service-button ${
                  activeServiceRequests.assistance !== undefined ? 'is-assistance-active' : ''
                }`}
                aria-label="Call staff"
                title="Call staff"
                disabled={pendingServiceRequest !== null}
                onClick={() => handleServiceRequest('assistance')}
              >
                <span aria-hidden="true">?</span>
              </button>
            </div>
          </div>
        </div>
        <nav className="client-main-nav" aria-label="Customer navigation">
          <button
            type="button"
            className={`client-main-nav-item ${activeView === 'menu' ? 'is-active' : ''}`}
            aria-current={activeView === 'menu' ? 'page' : undefined}
            onClick={() => changeView('menu')}
          >
            <span aria-hidden="true">⌘</span>
            Menu
          </button>
          <button
            type="button"
            className={`client-main-nav-item ${activeView === 'buffet' ? 'is-active' : ''}`}
            aria-current={activeView === 'buffet' ? 'page' : undefined}
            onClick={() => changeView('buffet')}
          >
            <span aria-hidden="true">↻</span>
            Buffet
          </button>
          <button
            type="button"
            className={`client-main-nav-item ${activeView === 'orders' ? 'is-active' : ''}`}
            aria-current={activeView === 'orders' ? 'page' : undefined}
            onClick={() => changeView('orders')}
          >
            <span aria-hidden="true">?</span>
            Orders
          </button>
          <span
            className="client-main-nav-indicator"
            aria-hidden="true"
            style={{
              left: `${navIndicatorPosition * (100 / 3)}%`,
              transition: isDraggingView ? 'none' : undefined,
            }}
          />
        </nav>
      </header>

      <main
        className="client-shell min-h-screen bg-[#080b10] pb-24 text-content"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="client-view-stage">
          <div
            key={activeView}
            className="client-view"
            style={{
              transform: viewDragOffset !== 0 ? `translateX(${viewDragOffset}px)` : undefined,
              transition: isDraggingView ? 'none' : undefined,
            }}
          >
            {activeView === 'orders' ? (
              <OrdersView orders={orders} onCancel={handleCancelOrderItem} />
            ) : activeView === 'buffet' ? (
              <BuffetView
                buffet={buffet}
                sections={buffetCategorySections}
                cart={cart}
                onAdd={addToCart}
                onRemove={removeFromCart}
                onChoose={handleChooseBuffet}
                isSelected={selectedBuffetId === buffet?.id}
              />
            ) : (
              <>
                <div className="client-menu-controls">
                  <section className="client-menu-heading mx-auto max-w-lg px-4">
                    <h1>Menu</h1>
                  </section>

                  <nav className="client-category-nav px-4" aria-label="Menu categories">
                    <div className="client-category-row scrollbar-none mx-auto flex max-w-lg gap-2 overflow-x-auto">
                      {stationSections.map((station) =>
                        station.categories.length > 1 ? (
                          <div
                            key={station.key}
                            className={`client-category-group flex flex-none gap-1 ${
                              expandedStation === station.key ? 'is-expanded' : ''
                            }`}
                          >
                            <button
                              type="button"
                              data-station-key={station.key}
                              className={`client-category-button client-station-button ${
                                station.categories.some(
                                  ({ category }) => category.id === selectedCategory,
                                )
                                  ? 'is-active'
                                  : ''
                              }`}
                              aria-expanded={expandedStation === station.key}
                              onClick={() => toggleStation(station.key)}
                            >
                              {station.name}
                            </button>

                            <div
                              className={`client-group-categories ${
                                expandedStation === station.key ? 'is-visible' : ''
                              }`}
                              aria-hidden={expandedStation !== station.key}
                            >
                              {station.categories.map(({ category }) => (
                                <CategoryButton
                                  key={category.id}
                                  categoryId={category.id}
                                  label={categoryNames[category.alias] ?? category.name}
                                  selected={selectedCategory === category.id}
                                  onClick={() => scrollToCategory(category.id)}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <CategoryButton
                            key={station.categories[0].category.id}
                            categoryId={station.categories[0].category.id}
                            label={
                              categoryNames[station.categories[0].category.alias] ??
                              station.categories[0].category.name
                            }
                            selected={selectedCategory === station.categories[0].category.id}
                            onClick={() => scrollToCategory(station.categories[0].category.id)}
                          />
                        ),
                      )}
                    </div>
                  </nav>
                </div>

                <div className="client-menu-sections mx-auto max-w-lg px-4 pb-8">
                  {stationSections.map((station) => (
                    <section
                      key={station.key}
                      id={`menu-station-${station.key}`}
                      className="client-station-section"
                    >
                      {station.categories.length > 1 && (
                        <h2 className="client-station-heading">{station.name}</h2>
                      )}

                      {station.categories.map(({ category, items }) => (
                        <section
                          key={category.id}
                          id={`menu-category-${category.id}`}
                          className="client-menu-section"
                        >
                          {station.categories.length === 1 ? (
                            <div className="mb-4">
                              <h2 className="client-station-heading">
                                {categoryNames[category.alias] ?? category.name}
                              </h2>
                            </div>
                          ) : (
                            <div className="mb-4 flex items-center gap-3">
                              <h3 className="font-display text-lg font-bold">
                                {categoryNames[category.alias] ?? category.name}
                              </h3>
                              <span className="h-px flex-1 bg-border" />
                            </div>
                          )}

                          <div className="client-menu-grid grid gap-3">
                            {items.map((item) => (
                              <ProductCard
                                key={item.id}
                                item={item}
                                quantity={cart[item.id] ?? 0}
                                onAdd={() => addToCart(item.id)}
                                onRemove={() => removeFromCart(item.id)}
                              />
                            ))}
                          </div>
                        </section>
                      ))}
                    </section>
                  ))}
                </div>
              </>
            )}
          </div>

          {swipeTargetView && (
            <div
              className="client-view client-view-adjacent"
              style={{
                transform:
                  viewDragOffset < 0
                    ? `translateX(calc(100% + ${viewDragOffset}px))`
                    : `translateX(calc(-100% + ${viewDragOffset}px))`,
                transition: pendingView ? 'transform 180ms ease-out' : 'none',
              }}
              aria-hidden="true"
            >
              {swipeTargetView === 'orders' ? (
                <OrdersView orders={orders} onCancel={handleCancelOrderItem} />
              ) : swipeTargetView === 'buffet' ? (
                <BuffetSwipePreview
                  buffet={buffet}
                  sections={buffetCategorySections}
                  cart={cart}
                  isSelected={selectedBuffetId === buffet?.id}
                />
              ) : (
                <MenuSwipePreview stations={stationSections} cart={cart} />
              )}
            </div>
          )}
        </div>

        {cartCount > 0 && (
          <button
            type="button"
            className="client-floating-order"
            onClick={() => setIsCartOpen(true)}
          >
            <span>View order</span>
            <strong>
              {cartCount} {cartCount === 1 ? 'item added' : 'items added'}
            </strong>
          </button>
        )}

        {isCartOpen && (
          <SelectionSheet
            items={cartItems}
            cart={cart}
            buffetItemIds={
              selectedBuffetId === null
                ? new Set<number>()
                : new Set(buffetItems.map((item) => item.id))
            }
            isSubmitting={isSubmittingOrder}
            onAdd={addToCart}
            onRemove={removeFromCart}
            onDelete={removeCartItem}
            onClose={() => setIsCartOpen(false)}
            onSubmit={submitOrder}
          />
        )}
      </main>
    </>
  );
}

type BuffetViewProps = {
  buffet: Buffet | null;
  sections: Array<{ category: Category; items: MenuItem[] }>;
  cart: Record<number, number>;
  onAdd: (itemId: number) => void;
  onRemove: (itemId: number) => void;
  onChoose: (buffetId: number | null) => Promise<void>;
  isSelected: boolean;
  isPreview?: boolean;
};

type SelectionSheetProps = {
  items: MenuItem[];
  cart: Record<number, number>;
  buffetItemIds: Set<number>;
  isSubmitting: boolean;
  onAdd: (itemId: number) => void;
  onRemove: (itemId: number) => void;
  onDelete: (itemId: number) => void;
  onClose: () => void;
  onSubmit: () => void;
};

function MenuSwipePreview({
  stations,
  cart,
}: {
  stations: Array<{
    key: string;
    name: string;
    categories: Array<{ category: Category; items: MenuItem[] }>;
  }>;
  cart: Record<number, number>;
}) {
  return (
    <div className="client-swipe-menu-preview mx-auto max-w-lg px-4 pb-8">
      <section className="client-menu-heading">
        <h1>Menu</h1>
      </section>
      <div className="client-category-row scrollbar-none mt-3 flex gap-2 overflow-hidden">
        {stations.map((station) => (
          <span key={station.key} className="client-category-button">
            {station.categories.length > 1
              ? station.name
              : (categoryNames[station.categories[0].category.alias] ??
                station.categories[0].category.name)}
          </span>
        ))}
      </div>

      <div className="client-menu-sections">
        {stations.map((station) => (
          <section key={station.key} className="client-station-section">
            {station.categories.length > 1 && (
              <h2 className="client-station-heading">{station.name}</h2>
            )}
            {station.categories.map(({ category, items }) => (
              <section key={category.id} className="client-menu-section">
                <div className="mb-4 flex items-center gap-3">
                  <h3 className="font-display text-lg font-bold">
                    {categoryNames[category.alias] ?? category.name}
                  </h3>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="client-menu-grid grid gap-3">
                  {items.map((item) => (
                    <ProductCard
                      key={item.id}
                      item={item}
                      quantity={cart[item.id] ?? 0}
                      onAdd={() => undefined}
                      onRemove={() => undefined}
                    />
                  ))}
                </div>
              </section>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

function BuffetSwipePreview({
  buffet,
  sections,
  cart,
  isSelected,
}: {
  buffet: Buffet | null;
  sections: Array<{ category: Category; items: MenuItem[] }>;
  cart: Record<number, number>;
  isSelected: boolean;
}) {
  return (
    <BuffetView
      buffet={buffet}
      sections={sections}
      cart={cart}
      onAdd={() => undefined}
      onRemove={() => undefined}
      onChoose={async () => undefined}
      isSelected={isSelected}
      isPreview
    />
  );
}

function SelectionSheet({
  items,
  cart,
  buffetItemIds,
  isSubmitting,
  onAdd,
  onRemove,
  onDelete,
  onClose,
  onSubmit,
}: SelectionSheetProps) {
  const sheetTouchStart = useRef<number | null>(null);
  const [sheetDragOffset, setSheetDragOffset] = useState(0);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, []);

  const total = items.reduce(
    (sum, item) =>
      sum + (buffetItemIds.has(item.id) ? 0 : Number(item.base_price) * (cart[item.id] ?? 0)),
    0,
  );

  return (
    <div className="client-selection-backdrop" role="presentation" onClick={onClose}>
      <section
        className="client-selection-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="selection-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          transform: sheetDragOffset > 0 ? `translateY(${sheetDragOffset}px)` : undefined,
          transition: isDraggingSheet ? 'none' : undefined,
        }}
        onTouchStart={(event) => {
          const target = event.target instanceof Element ? event.target : null;
          const canDrag = !target?.closest('.client-selection-items');
          sheetTouchStart.current = canDrag ? event.touches[0].clientY : null;
          setIsDraggingSheet(canDrag);
        }}
        onTouchMove={(event) => {
          const startY = sheetTouchStart.current;
          if (startY === null) return;

          event.preventDefault();
          const distance = Math.max(0, event.touches[0].clientY - startY);
          setSheetDragOffset(distance);
        }}
        onTouchEnd={(event) => {
          const startY = sheetTouchStart.current;
          sheetTouchStart.current = null;
          setIsDraggingSheet(false);

          if (startY !== null && event.changedTouches[0].clientY - startY > 100) {
            setSheetDragOffset(window.innerHeight);
            window.setTimeout(onClose, 180);
          } else {
            setSheetDragOffset(0);
          }
        }}
      >
        <div className="client-selection-handle" aria-hidden="true" />
        <header className="client-selection-heading">
          <h2 id="selection-title">Your selection</h2>
          <p>Current round</p>
        </header>

        <div className="client-selection-items">
          {items.map((item) => (
            <article key={item.id} className="client-selection-item">
              <div className="client-selection-thumbnail">
                {item.photo_url ? (
                  <img src={item.photo_url} alt="" />
                ) : (
                  <span aria-hidden="true">{productEmoji[item.category.alias] ?? '🍴'}</span>
                )}
              </div>
              <strong>{item.name}</strong>
              <div className="client-selection-quantity">
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={`Remove ${item.name}`}
                >
                  −
                </button>
                <output>{cart[item.id]}</output>
                <button
                  type="button"
                  className="is-add"
                  onClick={() => onAdd(item.id)}
                  aria-label={`Add ${item.name}`}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className="client-selection-delete"
                onClick={() => onDelete(item.id)}
                aria-label={`Delete ${item.name} from the selection`}
              >
                <svg
                  aria-hidden="true"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" />
                </svg>
              </button>
            </article>
          ))}
        </div>

        <div className="client-selection-total">
          <span>Round total</span>
          <strong>{formatPrice(String(total))}</strong>
        </div>

        <button
          type="button"
          className="client-selection-submit"
          disabled={isSubmitting || items.length === 0}
          onClick={onSubmit}
        >
          {isSubmitting ? 'Sending…' : 'Send round'}
        </button>
      </section>
    </div>
  );
}

const orderProgress = ['pending', 'preparing', 'ready', 'served'] as const;
const orderProgressLabels = ['Received', 'Preparing', 'Ready', 'Served'];

function OrdersView({
  orders,
  onCancel,
}: {
  orders: ClientOrder[];
  onCancel: (orderId: number, itemId: number) => void;
}) {
  const [ordersTab, setOrdersTab] = useState<'active' | 'history'>('active');
  const visibleOrders = orders.filter((order) => {
    const isFinished = order.items.every((item) =>
      ['served', 'cancelled', 'returned'].includes(item.status.alias),
    );
    return ordersTab === 'history' ? isFinished : !isFinished;
  });

  return (
    <div className="client-orders mx-auto max-w-lg px-4 pb-10">
      <div className="client-orders-tabs">
        <button
          type="button"
          className={ordersTab === 'active' ? 'is-active' : ''}
          onClick={() => setOrdersTab('active')}
        >
          In progress
        </button>
        <button
          type="button"
          className={ordersTab === 'history' ? 'is-active' : ''}
          onClick={() => setOrdersTab('history')}
        >
          History
        </button>
      </div>

      {visibleOrders.length === 0 ? (
        <p className="client-orders-empty">
          {ordersTab === 'active' ? 'There are no orders in progress.' : 'There is no history yet.'}
        </p>
      ) : (
        visibleOrders.map((order) => (
          <section key={order.id} className="client-order-round">
            <h1>Round {order.round_number}</h1>
            <div className="client-order-items">
              {order.items.map((item) => (
                <OrderProgressCard
                  key={item.id}
                  item={item}
                  onCancel={() => onCancel(order.id, item.id)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function OrderProgressCard({
  item,
  onCancel,
}: {
  item: ClientOrder['items'][number];
  onCancel: () => void;
}) {
  const statusIndex = orderProgress.indexOf(item.status.alias as (typeof orderProgress)[number]);
  const isCancelled = item.status.alias === 'cancelled';

  return (
    <article className={`client-order-card ${isCancelled ? 'is-cancelled' : ''}`}>
      <header>
        <strong>
          {item.menu_item.name}
          {item.quantity > 1 ? ` × ${item.quantity}` : ''}
        </strong>
        {item.status.alias === 'pending' && (
          <button type="button" onClick={onCancel} aria-label={`Cancel ${item.menu_item.name}`}>
            ×
          </button>
        )}
      </header>

      {isCancelled ? (
        <p className="client-order-cancelled">Cancelled</p>
      ) : (
        <div className="client-order-progress">
          <div className="client-order-progress-line" aria-hidden="true">
            {orderProgress.map((status, index) => (
              <span
                key={status}
                className={index <= statusIndex ? `is-complete status-${status}` : ''}
              />
            ))}
          </div>
          <div className="client-order-progress-labels">
            {orderProgressLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function BuffetView({
  buffet,
  sections,
  cart,
  onAdd,
  onRemove,
  onChoose,
  isSelected,
  isPreview = false,
}: BuffetViewProps) {
  const [expandedBuffetStation, setExpandedBuffetStation] = useState<string | null>(null);
  const [selectedBuffetCategory, setSelectedBuffetCategory] = useState<number | null>(null);
  const [isConfirmingBuffet, setIsConfirmingBuffet] = useState(false);
  const [isChoosingBuffet, setIsChoosingBuffet] = useState(false);
  const buffetStations = useMemo(
    () =>
      sections
        .reduce<
          Array<{
            key: string;
            name: string;
            categories: typeof sections;
          }>
        >((groups, section) => {
          const key = stationKeysByCategory[section.category.alias] ?? section.category.alias;
          const existing = groups.find((group) => group.key === key);

          if (existing) {
            existing.categories.push(section);
          } else {
            groups.push({
              key,
              name: stationNamesByCategory[section.category.alias] ?? section.category.name,
              categories: [section],
            });
          }
          return groups;
        }, [])
        .map((group) => {
          if (group.key === 'bar') {
            group.categories.sort((first, second) =>
              first.category.alias === 'soft-drinks-water'
                ? -1
                : second.category.alias === 'soft-drinks-water'
                  ? 1
                  : 0,
            );
          }
          return group;
        })
        .sort((first, second) => {
          const position: Record<string, number> = { bar: 1, 'cold-pantry': 2 };
          return (position[first.key] ?? 0) - (position[second.key] ?? 0);
        }),
    [sections],
  );

  useEffect(() => {
    if (selectedBuffetCategory === null && buffetStations[0]) {
      setSelectedBuffetCategory(buffetStations[0].categories[0].category.id);
      return;
    }

    const activeStation = buffetStations.find((station) =>
      station.categories.some(({ category }) => category.id === selectedBuffetCategory),
    );
    setExpandedBuffetStation(
      activeStation && activeStation.categories.length > 1 ? activeStation.key : null,
    );
  }, [buffetStations, selectedBuffetCategory]);

  useEffect(() => {
    if (isPreview || sections.length === 0 || buffetStations.length === 0) return;

    let animationFrame = 0;

    const updateBuffetCategoryFromScroll = () => {
      animationFrame = 0;

      const distanceFromBottom =
        document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
      if (distanceFromBottom <= 2) {
        const lastStation = buffetStations[buffetStations.length - 1];
        const lastCategory = lastStation.categories[lastStation.categories.length - 1].category;
        setSelectedBuffetCategory(lastCategory.id);
        return;
      }

      const viewportCenter = window.innerHeight / 2;
      let closestCategoryId = buffetStations[0].categories[0].category.id;
      let closestDistance = Number.POSITIVE_INFINITY;

      for (const { category } of sections) {
        const rect = document
          .getElementById(`buffet-category-${category.id}`)
          ?.getBoundingClientRect();
        if (!rect) continue;

        const distance =
          viewportCenter < rect.top
            ? rect.top - viewportCenter
            : viewportCenter > rect.bottom
              ? viewportCenter - rect.bottom
              : 0;

        if (distance < closestDistance) {
          closestCategoryId = category.id;
          closestDistance = distance;
        }
      }

      setSelectedBuffetCategory((current) =>
        current === closestCategoryId ? current : closestCategoryId,
      );
    };

    const handleBuffetScroll = () => {
      if (!animationFrame) {
        animationFrame = window.requestAnimationFrame(updateBuffetCategoryFromScroll);
      }
    };

    updateBuffetCategoryFromScroll();
    window.addEventListener('scroll', handleBuffetScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleBuffetScroll);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [buffetStations, isPreview, sections]);

  useEffect(() => {
    if (isPreview || selectedBuffetCategory === null) return;

    document
      .querySelector<HTMLElement>(`[data-category-id="${selectedBuffetCategory}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [expandedBuffetStation, isPreview, selectedBuffetCategory]);

  function scrollToBuffetCategory(categoryId: number) {
    setSelectedBuffetCategory(categoryId);
    document
      .getElementById(`buffet-category-${categoryId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function confirmBuffet() {
    if (!buffet || isChoosingBuffet) return;

    setIsChoosingBuffet(true);
    try {
      await onChoose(buffet.id);
      setIsConfirmingBuffet(false);
    } catch {
      // The parent displays the API error in a toast.
    } finally {
      setIsChoosingBuffet(false);
    }
  }

  async function cancelSelectedBuffet() {
    if (isChoosingBuffet) return;

    setIsChoosingBuffet(true);
    try {
      await onChoose(null);
    } catch {
      // The parent displays the API error in a toast.
    } finally {
      setIsChoosingBuffet(false);
    }
  }

  if (!buffet) {
    return (
      <p className="mx-auto max-w-lg px-4 py-8 text-sm text-content-muted">Buffet unavailable.</p>
    );
  }

  return (
    <div className="client-buffet mx-auto max-w-lg px-4 pb-28">
      <header className="client-buffet-heading">
        <h1>Buffet</h1>
        <p>{formatPrice(buffet.price)} per person</p>
      </header>

      {!isSelected && (
        <div className="client-buffet-notice is-primary">
          <strong>Not included</strong>
          <p>
            Drinks, extras and products available in the Menu section. These products will be
            charged separately at the end.
          </p>
        </div>
      )}
      <div className="client-buffet-notice">
        <p>
          All dishes shown in this section are included. Drinks, extras and Menu products are
          charged separately.
        </p>
      </div>

      {isSelected && (
        <div className="client-selected-buffet">
          <div>
            <span>Buffet selected</span>
          </div>
          <button
            type="button"
            disabled={isChoosingBuffet}
            aria-label="Cancel buffet selection"
            onClick={cancelSelectedBuffet}
          >
            {isChoosingBuffet ? (
              '…'
            ) : (
              <svg
                aria-hidden="true"
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v5M14 11v5" />
              </svg>
            )}
          </button>
        </div>
      )}

      <nav
        className="client-category-nav client-buffet-category-nav"
        aria-label="Buffet categories"
      >
        <div className="client-category-row scrollbar-none mx-auto flex max-w-lg gap-2 overflow-x-auto">
          {buffetStations.map((station) =>
            station.categories.length > 1 ? (
              <div
                key={station.key}
                className={`client-category-group flex flex-none gap-1 ${
                  expandedBuffetStation === station.key ? 'is-expanded' : ''
                }`}
              >
                <button
                  type="button"
                  className={`client-category-button client-station-button ${
                    station.categories.some(
                      ({ category }) => category.id === selectedBuffetCategory,
                    )
                      ? 'is-active'
                      : ''
                  }`}
                  aria-expanded={expandedBuffetStation === station.key}
                  onClick={() =>
                    setExpandedBuffetStation((current) =>
                      current === station.key ? null : station.key,
                    )
                  }
                >
                  {station.name}
                </button>
                <div
                  className={`client-group-categories ${
                    expandedBuffetStation === station.key ? 'is-visible' : ''
                  }`}
                  aria-hidden={expandedBuffetStation !== station.key}
                >
                  {station.categories.map(({ category }) => (
                    <CategoryButton
                      key={category.id}
                      categoryId={category.id}
                      label={categoryNames[category.alias] ?? category.name}
                      selected={selectedBuffetCategory === category.id}
                      onClick={() => scrollToBuffetCategory(category.id)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <CategoryButton
                key={station.categories[0].category.id}
                categoryId={station.categories[0].category.id}
                label={
                  categoryNames[station.categories[0].category.alias] ??
                  station.categories[0].category.name
                }
                selected={selectedBuffetCategory === station.categories[0].category.id}
                onClick={() => scrollToBuffetCategory(station.categories[0].category.id)}
              />
            ),
          )}
        </div>
      </nav>

      <div className="client-buffet-sections">
        {buffetStations.map((station) => (
          <section key={station.key} className="client-station-section">
            {station.categories.length > 1 && (
              <h2 className="client-station-heading">{station.name}</h2>
            )}

            {station.categories.map(({ category, items }) => (
              <section
                key={category.id}
                id={`buffet-category-${category.id}`}
                className="client-buffet-section"
              >
                {station.categories.length === 1 ? (
                  <div className="mb-4">
                    <h2 className="client-station-heading">
                      {categoryNames[category.alias] ?? category.name}
                    </h2>
                  </div>
                ) : (
                  <div className="mb-4 flex items-center gap-3">
                    <h3 className="font-display text-lg font-bold">
                      {categoryNames[category.alias] ?? category.name}
                    </h3>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                )}

                <div className="client-menu-grid grid gap-3">
                  {items.map((item) => (
                    <ProductCard
                      key={item.id}
                      item={item}
                      quantity={cart[item.id] ?? 0}
                      onAdd={() => onAdd(item.id)}
                      onRemove={() => onRemove(item.id)}
                      showActions={isSelected}
                    />
                  ))}
                </div>
              </section>
            ))}
          </section>
        ))}
      </div>

      {!isSelected && (
        <button
          type="button"
          className="client-buffet-choose"
          onClick={() => setIsConfirmingBuffet(true)}
        >
          Select buffet
        </button>
      )}

      {isConfirmingBuffet && (
        <div className="client-buffet-modal-backdrop" role="presentation">
          <section
            className="client-buffet-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="buffet-confirmation-title"
          >
            <h2 id="buffet-confirmation-title">Confirm buffet selection?</h2>
            <p>
              You can cancel your buffet selection until you send your first order to the kitchen.
              After the first order is sent, this option can no longer be changed.
            </p>
            <div className="client-buffet-modal-actions">
              <button
                type="button"
                className="is-secondary"
                disabled={isChoosingBuffet}
                onClick={() => setIsConfirmingBuffet(false)}
              >
                Cancel
              </button>
              <button type="button" disabled={isChoosingBuffet} onClick={confirmBuffet}>
                {isChoosingBuffet ? 'Confirming…' : 'Confirm'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

type ProductCardProps = {
  item: MenuItem;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
  showActions?: boolean;
};

function ProductCard({ item, quantity, onAdd, onRemove, showActions = true }: ProductCardProps) {
  return (
    <article className="client-product-card overflow-hidden rounded-2xl border border-border bg-surface shadow-lg shadow-black/20">
      <div className="client-product-visual relative h-32 overflow-hidden bg-gradient-to-br from-surface-elevated via-primary-soft to-surface-raised">
        {item.photo_url ? (
          <img
            src={item.photo_url}
            alt=""
            className="client-product-image size-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="client-product-placeholder grid size-full place-items-center text-5xl"
            aria-hidden="true"
          >
            {productEmoji[item.category.alias] ?? '🍴️'}
          </div>
        )}
        <span className="client-product-price absolute bottom-2 right-2 rounded-full bg-black/85 px-2 py-1 text-xs font-bold text-white">
          {formatPrice(item.base_price)}
        </span>
      </div>

      <div
        className={`client-product-content flex flex-col p-3 ${showActions ? '' : 'is-read-only'}`}
      >
        <h3 className="font-display text-base font-bold leading-tight">{item.name}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-content-muted">
          {item.description ?? 'Description unavailable'}
        </p>
        <div className="mt-2 flex min-h-5 flex-wrap gap-1">
          {item.tags.slice(0, 2).map((tag) => (
            <span
              key={tag.id}
              title={tag.name}
              className="rounded bg-primary-soft px-1.5 py-0.5 text-[9px] font-semibold text-primary"
            >
              {tagNames[tag.alias] ?? tag.name.replace('Allergen: ', '')}
            </span>
          ))}
        </div>
        {showActions &&
          (quantity > 0 ? (
            <div className="client-quantity-control mt-auto flex items-center justify-between">
              <button
                type="button"
                onClick={onRemove}
                className="grid size-10 place-items-center rounded-xl bg-surface-raised text-lg font-bold text-white transition active:opacity-75"
                aria-label={`Remove one unit of ${item.name}`}
              >
                −
              </button>
              <output className="text-base font-bold" aria-label={`${quantity} units`}>
                {quantity}
              </output>
              <button
                type="button"
                onClick={onAdd}
                className="grid size-10 place-items-center rounded-xl bg-primary text-lg font-bold text-white transition active:bg-primary-active"
                aria-label={`Add one more unit of ${item.name}`}
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onAdd}
              className="client-add-button mt-auto flex w-full items-center justify-center gap-1 rounded-xl bg-primary px-3 py-2.5 text-sm font-bold text-white transition active:bg-primary-active"
            >
              <PlusIcon size={17} /> Add
            </button>
          ))}
      </div>
    </article>
  );
}

type CategoryButtonProps = {
  categoryId: number;
  label: string;
  selected: boolean;
  onClick: () => void;
};

function CategoryButton({ categoryId, label, selected, onClick }: CategoryButtonProps) {
  return (
    <button
      type="button"
      data-category-id={categoryId}
      onClick={onClick}
      className={`client-category-button ${selected ? 'is-active' : ''}`}
    >
      {label}
    </button>
  );
}

function ClientMessage({ message, isError = false }: { message: string; isError?: boolean }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#080b10] px-6 text-center">
      <div>
        <LogoIcon className="mx-auto w-48" />
        <p className={`mt-5 text-sm ${isError ? 'text-red-300' : 'text-content-muted'}`}>
          {message}
        </p>
      </div>
    </main>
  );
}

type SessionSetupProps = {
  table: Table;
  guestCount: number;
  isSubmitting: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  onSubmit: () => void;
};

function SessionSetup({
  table,
  guestCount,
  isSubmitting,
  onDecrease,
  onIncrease,
  onSubmit,
}: SessionSetupProps) {
  return (
    <main className="session-setup">
      <LogoIcon className="session-setup-logo" />

      <section className="session-setup-content">
        <div>
          <h1>Welcome to your table</h1>
          <p>
            You are at table {table.table_number}. Indicate how many people will be sitting at this
            table.
          </p>
        </div>

        <div className="session-setup-actions">
          <div className="guest-counter">
            <span className="guest-counter-label">
              <span aria-hidden="true">♧</span> Guests
            </span>
            <div className="guest-counter-controls">
              <button
                type="button"
                onClick={onDecrease}
                disabled={guestCount <= 1}
                aria-label="Decrease guests"
              >
                −
              </button>
              <output aria-label={`${guestCount} guests`}>{guestCount}</output>
              <button
                type="button"
                onClick={onIncrease}
                disabled={guestCount >= table.max_capacity}
                aria-label="Increase guests"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            className="session-submit"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating session…' : 'View menu'} <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    </main>
  );
}
