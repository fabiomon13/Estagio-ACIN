import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import LogoIcon from '../../../components/icons/Logo';
import PlusIcon from '../../../components/icons/PlusIcon';
import { useToast } from '../../../components/ui/toast/useToast';
import { ApiError } from '../../../services/api/client';
import { ensureGuest } from '../services/guestApi';
import {
  createSession,
  getCategories,
  getActiveSession,
  getMenu,
  getTable,
  type Category,
  type MenuItem,
  type Table,
} from '../services/menuApi';
import { getDeviceToken } from '../utils/deviceToken';
import { createServiceRequest, type ServiceRequestType } from '../services/serviceRequestApi';
import './ClientPage.css';

const categoryNames: Record<string, string> = {
  'alcoholic-drinks': 'Bebidas',
  desserts: 'Sobremesas',
  nigiri: 'Nigiri',
  ramen: 'Ramen',
  sashimi: 'Sashimi',
  'soft-drinks-water': 'Águas e refrigerantes',
  tempura: 'Tempura',
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
  return new Intl.NumberFormat('pt-PT', {
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
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionState, setSessionState] = useState<'setup' | 'waiting' | 'ready'>('ready');
  const [guestCount, setGuestCount] = useState(2);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [pendingServiceRequest, setPendingServiceRequest] = useState<ServiceRequestType | null>(
    null,
  );
  const categoryScrollLocked = useRef(false);
  const categoryScrollUnlockTimer = useRef<number | null>(null);

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

        const [, menuCategories, menu] = await Promise.all([
          ensureGuest(tableCode, getDeviceToken()),
          getCategories(),
          getMenu(),
        ]);

        if (!isActive) return;
        setSessionState('ready');
        setCategories(menuCategories);
        setMenuItems(menu.items);
        setSelectedCategory(menuCategories[0]?.id ?? null);
      })
      .catch((requestError: unknown) => {
        if (!isActive) return;
        setError(
          requestError instanceof ApiError
            ? requestError.detail
            : 'Não foi possível carregar o menu.',
        );
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [tableCode]);

  const categorySections = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          items: menuItems.filter((item) => item.category_id === category.id),
        }))
        .filter(({ items }) => items.length > 0),
    [categories, menuItems],
  );
  const cartCount = Object.values(cart).reduce((total, quantity) => total + quantity, 0);

  useEffect(() => {
    if (categorySections.length === 0) return;

    let animationFrame = 0;

    const updateCategoryFromScroll = () => {
      animationFrame = 0;

      if (categoryScrollLocked.current) return;

      const activationPoint = 190;
      let activeCategoryId = categorySections[0].category.id;

      for (const { category } of categorySections) {
        const section = document.getElementById(`menu-category-${category.id}`);

        if (section && section.getBoundingClientRect().top <= activationPoint) {
          activeCategoryId = category.id;
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
  }, [categorySections]);

  useEffect(() => {
    if (selectedCategory === null) return;

    document
      .querySelector<HTMLElement>(`[data-category-id="${selectedCategory}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedCategory]);

  function addToCart(itemId: number) {
    setCart((current) => ({ ...current, [itemId]: (current[itemId] ?? 0) + 1 }));
  }

  function scrollToCategory(categoryId: number) {
    categoryScrollLocked.current = true;
    setSelectedCategory(categoryId);

    if (categoryScrollUnlockTimer.current !== null) {
      window.clearTimeout(categoryScrollUnlockTimer.current);
    }

    document
      .getElementById(`menu-category-${categoryId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    categoryScrollUnlockTimer.current = window.setTimeout(() => {
      categoryScrollLocked.current = false;
      categoryScrollUnlockTimer.current = null;
    }, 500);
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
        requestError instanceof ApiError ? requestError.detail : 'Não foi possível criar a sessão.',
      );
    } finally {
      setIsCreatingSession(false);
    }
  }

  async function handleServiceRequest(type: ServiceRequestType) {
    if (!tableCode || pendingServiceRequest) return;

    setPendingServiceRequest(type);

    try {
      await createServiceRequest(tableCode, getDeviceToken(), type);
      showToast({
        title: type === 'payment_request' ? 'Conta solicitada' : 'Equipa chamada',
        description: 'O pedido foi enviado para a equipa.',
        variant: 'success',
      });
    } catch (requestError) {
      showToast({
        title: 'Não foi possível enviar o pedido',
        description: requestError instanceof ApiError ? requestError.detail : 'Tente novamente.',
        variant: 'danger',
      });
    } finally {
      setPendingServiceRequest(null);
    }
  }

  if (!tableCode) {
    return <ClientMessage message="Código da mesa em falta." isError />;
  }

  if (isLoading) {
    return <ClientMessage message="A preparar o menu…" />;
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
    return (
      <ClientMessage message={`Mesa ${table.table_number}: aguarda a aprovação de um empregado.`} />
    );
  }

  return (
    <main className="client-shell min-h-screen bg-[#080b10] pb-24 text-content">
      <header className="client-header sticky top-0 z-30 bg-[#0b0f14]/95 px-4 py-4 backdrop-blur">
        <div className="client-header-inner mx-auto flex max-w-lg items-center justify-between">
          <LogoIcon className="client-logo w-28" />
          <div className="client-header-actions flex items-center gap-3">
            <div className="client-table-indicator text-right">
              <p className="client-table-label text-[9px] uppercase tracking-[0.18em] text-content-subtle">
                Mesa
              </p>
              <p className="client-table-number font-display text-lg font-bold leading-none">
                {table?.table_number}
              </p>
            </div>
            <div className="client-header-service-actions">
              <button
                type="button"
                className="client-header-service-button"
                aria-label="Pedir conta"
                title="Pedir conta"
                disabled={pendingServiceRequest !== null}
                onClick={() => handleServiceRequest('payment_request')}
              >
                <span aria-hidden="true">💳</span>
              </button>
              <button
                type="button"
                className="client-header-service-button"
                aria-label="Chamar equipa"
                title="Chamar equipa"
                disabled={pendingServiceRequest !== null}
                onClick={() => handleServiceRequest('assistance')}
              >
                <span aria-hidden="true">?</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="client-main-nav" aria-label="Navegação do cliente">
        <button type="button" className="client-main-nav-item is-active" aria-current="page">
          <span aria-hidden="true">⌘</span>
          Menu
        </button>
        <button type="button" className="client-main-nav-item">
          <span aria-hidden="true">↻</span>
          Buffet
        </button>
        <button type="button" className="client-main-nav-item">
          <span aria-hidden="true">?</span>
          Orders
        </button>
      </nav>

      <section className="client-menu-heading mx-auto max-w-lg px-4">
        <h1>Menu</h1>
      </section>

      <nav className="client-category-nav px-4" aria-label="Categorias do menu">
        <div className="client-category-row scrollbar-none mx-auto flex max-w-lg gap-2 overflow-x-auto">
          {categories.map((category) => (
            <CategoryButton
              key={category.id}
              categoryId={category.id}
              label={categoryNames[category.alias] ?? category.name}
              selected={selectedCategory === category.id}
              onClick={() => scrollToCategory(category.id)}
            />
          ))}
        </div>
      </nav>

      <div className="client-menu-sections mx-auto max-w-lg px-4 pb-8">
        {categorySections.map(({ category, items }) => (
          <section
            key={category.id}
            id={`menu-category-${category.id}`}
            className="client-menu-section"
          >
            <div className="mb-4 flex items-center gap-3">
              <h2 className="font-display text-xl font-bold">
                {categoryNames[category.alias] ?? category.name}
              </h2>
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs text-content-subtle">{items.length}</span>
            </div>

            <div className="client-menu-grid grid grid-cols-2 gap-3">
              {items.map((item) => (
                <ProductCard key={item.id} item={item} onAdd={() => addToCart(item.id)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {cartCount > 0 && (
        <button type="button" className="client-floating-order">
          <span>Ver pedido</span>
          <strong>
            {cartCount} {cartCount === 1 ? 'produto adicionado' : 'produtos adicionados'}
          </strong>
        </button>
      )}
    </main>
  );
}

function ProductCard({ item, onAdd }: { item: MenuItem; onAdd: () => void }) {
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

      <div className="client-product-content flex min-h-40 flex-col p-3">
        <h3 className="font-display text-base font-bold leading-tight">{item.name}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-content-muted">
          {item.description ?? 'Descrição indisponível'}
        </p>
        <div className="mt-2 flex min-h-5 flex-wrap gap-1">
          {item.tags.slice(0, 2).map((tag) => (
            <span
              key={tag.id}
              title={tag.name}
              className="rounded bg-primary-soft px-1.5 py-0.5 text-[9px] font-semibold text-primary"
            >
              {tag.name.replace('Alergénio: ', '')}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="client-add-button mt-auto flex w-full items-center justify-center gap-1 rounded-xl bg-primary px-3 py-2.5 text-sm font-bold text-white transition active:bg-primary-active"
        >
          <PlusIcon size={17} /> Adicionar
        </button>
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
          <h1>Bem-vindo à sua mesa</h1>
          <p>
            Está na mesa {table.table_number}. Indique quantas pessoas se vão sentar nesta mesa.
          </p>
        </div>

        <div className="session-setup-actions">
          <div className="guest-counter">
            <span className="guest-counter-label">
              <span aria-hidden="true">♧</span> Convidados
            </span>
            <div className="guest-counter-controls">
              <button
                type="button"
                onClick={onDecrease}
                disabled={guestCount <= 1}
                aria-label="Diminuir convidados"
              >
                −
              </button>
              <output aria-label={`${guestCount} convidados`}>{guestCount}</output>
              <button
                type="button"
                onClick={onIncrease}
                disabled={guestCount >= table.max_capacity}
                aria-label="Aumentar convidados"
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
            {isSubmitting ? 'A criar sessão…' : 'Ver menu'} <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    </main>
  );
}
