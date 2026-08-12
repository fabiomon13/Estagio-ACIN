import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { formatPrice, getCategoryConfig } from '../../clientConfig';
import type { StationSection } from '../../clientTypes';
import { ProductCardItem } from '../menu/ProductCardItem';
import type { Buffet } from '../../services/menuApi';
import { BuffetCategoryNavigation } from './BuffetCategoryNavigation';
import { BuffetConfirmationModal, type BuffetConfirmationAction } from './BuffetConfirmationModal';

type BuffetViewProps = {
  buffet: Buffet | null;
  stations: readonly StationSection[];
  navigationStations?: readonly StationSection[];
  selectedAllergenTagIds?: ReadonlySet<number>;
  cart: Readonly<Record<number, number>>;
  isSelected: boolean;
  isPreview?: boolean;
  showSelectAction?: boolean;
  selectActionTransform?: string;
  isSelectActionDragging?: boolean;
  canSelectBuffet?: boolean;
  canCancelSelection: boolean;
  onAdd: (itemId: number) => void;
  onAddDetails?: (itemId: number, quantity: number, notes: string) => void;
  onRemove: (itemId: number) => void;
  onChoose: (buffetId: number | null) => Promise<void>;
};

export function BuffetView({
  buffet,
  stations,
  navigationStations = stations,
  selectedAllergenTagIds = new Set(),
  cart,
  isSelected,
  isPreview = false,
  showSelectAction,
  selectActionTransform = 'none',
  isSelectActionDragging = false,
  canSelectBuffet = true,
  canCancelSelection,
  onAdd,
  onAddDetails,
  onRemove,
  onChoose,
}: BuffetViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [confirmationAction, setConfirmationAction] = useState<BuffetConfirmationAction | null>(
    null,
  );

  const [isChoosing, setIsChoosing] = useState(false);

  const [shouldRenderSelectButton, setShouldRenderSelectButton] = useState(false);
  const [isSelectButtonLeaving, setIsSelectButtonLeaving] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const categoryNavigationRef = useRef<HTMLElement>(null);
  const categoryScrollLockedRef = useRef(false);
  const categoryUnlockTimerRef = useRef<number | null>(null);
  const choosingLockRef = useRef(false);

  const categories = useMemo(() => stations.flatMap((station) => station.categories), [stations]);

  const categoryAliases = useMemo(
    () => new Set(categories.map(({ category }) => category.alias)),
    [categories],
  );

  const activeCategory =
    selectedCategory !== null && categoryAliases.has(selectedCategory)
      ? selectedCategory
      : (categories[0]?.category.alias ?? null);

  const hasItems = useMemo(() => categories.some(({ items }) => items.length > 0), [categories]);
  const shouldShowSelectAction = showSelectAction ?? !isPreview;
  const shouldDisplaySelectButton = shouldShowSelectAction && canSelectBuffet && !isSelected;

  const visibleConfirmationAction =
    confirmationAction === 'select' && !canSelectBuffet ? null : confirmationAction;

  useEffect(() => {
    if (shouldDisplaySelectButton) {
      const appearanceTimer = window.setTimeout(() => {
        setIsSelectButtonLeaving(false);
        setShouldRenderSelectButton(true);
      }, 0);

      return () => window.clearTimeout(appearanceTimer);
    }

    const leavingTimer = window.setTimeout(() => setIsSelectButtonLeaving(true), 0);
    const removalTimer = window.setTimeout(() => {
      setShouldRenderSelectButton(false);
      setIsSelectButtonLeaving(false);
    }, 180);

    return () => {
      window.clearTimeout(leavingTimer);
      window.clearTimeout(removalTimer);
    };
  }, [shouldDisplaySelectButton]);

  useEffect(() => {
    if (isPreview || !rootRef.current || categories.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (categoryScrollLockedRef.current) {
          return;
        }

        const closestEntry = entries
          .filter((entry) => entry.isIntersecting)
          .toSorted(
            (first, second) =>
              Math.abs(first.boundingClientRect.top) - Math.abs(second.boundingClientRect.top),
          )[0];

        const categoryAlias = closestEntry?.target.getAttribute('data-buffet-category');

        if (categoryAlias) {
          setSelectedCategory(categoryAlias);
        }
      },
      {
        rootMargin: '-30% 0px -60% 0px',
        threshold: [0, 0.25, 0.5],
      },
    );

    const categoryElements =
      rootRef.current.querySelectorAll<HTMLElement>('[data-buffet-category]');

    categoryElements.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [categories, isPreview]);

  useEffect(() => {
    if (isPreview || activeCategory === null || !categoryNavigationRef.current) {
      return;
    }

    const centeringTimer = window.setTimeout(() => {
      categoryNavigationRef.current
        ?.querySelector<HTMLElement>(`[data-category-alias="${activeCategory}"]`)
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
    }, 160);

    return () => {
      window.clearTimeout(centeringTimer);
    };
  }, [activeCategory, isPreview]);

  useEffect(
    () => () => {
      if (categoryUnlockTimerRef.current !== null) {
        window.clearTimeout(categoryUnlockTimerRef.current);
      }
    },
    [],
  );

  const closeConfirmation = useCallback(() => {
    if (!choosingLockRef.current) {
      setConfirmationAction(null);
    }
  }, []);

  function scrollToCategory(categoryAlias: string) {
    categoryScrollLockedRef.current = true;
    setSelectedCategory(categoryAlias);

    if (categoryUnlockTimerRef.current !== null) {
      window.clearTimeout(categoryUnlockTimerRef.current);
    }

    document.getElementById(`buffet-category-${categoryAlias}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });

    categoryUnlockTimerRef.current = window.setTimeout(() => {
      categoryScrollLockedRef.current = false;
      categoryUnlockTimerRef.current = null;
    }, 800);
  }

  async function chooseBuffet(buffetId: number | null): Promise<void> {
    if (choosingLockRef.current) {
      return;
    }

    choosingLockRef.current = true;
    setIsChoosing(true);

    try {
      await onChoose(buffetId);
      setConfirmationAction(null);
    } catch {
      // O componente pai apresenta o erro ao cliente.
    } finally {
      choosingLockRef.current = false;
      setIsChoosing(false);
    }
  }

  function confirmSelection(): void {
    if (!buffet || visibleConfirmationAction === null) {
      return;
    }

    if (visibleConfirmationAction === 'select' && !canSelectBuffet) {
      return;
    }

    const selectedBuffetId = visibleConfirmationAction === 'cancel' ? null : buffet.id;

    void chooseBuffet(selectedBuffetId);
  }

  if (!buffet) {
    return (
      <p className="mx-auto max-w-lg px-4 py-8 text-sm text-content-muted" role="status">
        Buffet indisponível.
      </p>
    );
  }

  return (
    <div
      ref={rootRef}
      className="client-buffet mx-auto max-w-lg px-4 pb-28"
      data-buffet-view={isPreview ? 'preview' : 'interactive'}
    >
      <header className="client-buffet-heading">
        <h1>{buffet.name}</h1>
        <p>{formatPrice(buffet.price)} por pessoa</p>
      </header>

      {!isSelected && (
        <div className="client-buffet-notice is-primary">
          <strong>Não incluído</strong>
          <p>Bebidas, extras e produtos disponíveis no Menu são cobrados separadamente.</p>
        </div>
      )}

      <div className="client-buffet-notice">
        <p>
          Todos os pratos apresentados nesta secção estão incluídos. Bebidas, extras e produtos do
          Menu são cobrados separadamente.
        </p>
      </div>

      {Number(buffet.waste_charge) > 0 && (
        <div className="client-buffet-notice">
          <strong>Política de desperdício alimentar</strong>
          <p>
            O desperdício alimentar excessivo pode implicar uma cobrança adicional de{' '}
            {formatPrice(buffet.waste_charge)}.
          </p>
        </div>
      )}

      {isSelected && (
        <div className="client-selected-buffet" role="status">
          <strong>Buffet selecionado</strong>

          {canCancelSelection && (
            <button
              type="button"
              disabled={isChoosing}
              aria-label="Cancelar seleção do buffet"
              onClick={() => setConfirmationAction('cancel')}
            >
              {isChoosing ? '…' : '×'}
            </button>
          )}
        </div>
      )}

      <BuffetCategoryNavigation
        stations={navigationStations}
        activeCategory={activeCategory}
        navigationRef={isPreview ? undefined : categoryNavigationRef}
        onSelectCategory={scrollToCategory}
      />

      {hasItems ? (
        <div className="client-buffet-sections">
          {stations.map((station) => (
            <section
              key={station.key}
              className="client-station-section"
              aria-labelledby={
                station.categories.length > 1 ? `buffet-station-${station.key}` : undefined
              }
            >
              {station.categories.length > 1 && (
                <h2 id={`buffet-station-${station.key}`} className="client-station-heading">
                  {station.name}
                </h2>
              )}

              {station.categories.map(({ category, items }) => {
                const categoryLabel = getCategoryConfig(category.alias, category.name).label;

                const Heading = station.categories.length > 1 ? 'h3' : 'h2';

                return (
                  <section
                    key={category.alias}
                    id={`buffet-category-${category.alias}`}
                    data-buffet-category={category.alias}
                    className="client-buffet-section"
                    aria-labelledby={`buffet-category-heading-${category.alias}`}
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <Heading
                        id={`buffet-category-heading-${category.alias}`}
                        className={
                          station.categories.length > 1
                            ? 'font-display text-lg font-bold'
                            : 'client-station-heading'
                        }
                      >
                        {categoryLabel}
                      </Heading>

                      <span className="h-px flex-1 bg-border" aria-hidden="true" />
                    </div>

                    <div className="client-menu-grid grid gap-3">
                      {items.map((item) => (
                        <ProductCardItem
                          key={item.alias}
                          item={item}
                          selectedAllergenTagIds={selectedAllergenTagIds}
                          quantity={cart[item.id] ?? 0}
                          onAddItem={onAdd}
                          onAddItemDetails={onAddDetails}
                          onRemoveItem={onRemove}
                          showActions={isSelected}
                          priceMode="included"
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </section>
          ))}
        </div>
      ) : (
        <p
          className="client-buffet-empty py-10 text-center text-sm text-content-muted"
          role="status"
        >
          Não existem pratos de buffet disponíveis neste momento.
        </p>
      )}

      {shouldRenderSelectButton &&
        createPortal(
          <button
            type="button"
            className={[
              'client-buffet-choose',
              isSelectButtonLeaving ? 'is-leaving' : '',
              isSelectActionDragging ? 'is-dragging' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ transform: selectActionTransform }}
            disabled={isPreview || isChoosing || isSelected || isSelectButtonLeaving}
            onClick={() => setConfirmationAction('select')}
          >
            Selecionar buffet
          </button>,
          document.body,
        )}

      {visibleConfirmationAction && (
        <BuffetConfirmationModal
          action={visibleConfirmationAction}
          isSubmitting={isChoosing}
          onClose={closeConfirmation}
          onConfirm={confirmSelection}
        />
      )}
    </div>
  );
}
