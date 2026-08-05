import { useEffect, useMemo, useRef, useState } from 'react';

import { formatPrice, getCategoryConfig } from '../clientConfig';
import type { StationSection } from '../clientTypes';
import type { Buffet } from '../services/menuApi';

import { CategoryButton } from './CategoryButton';
import { ProductCard } from './ProductCard';

type BuffetViewProps = {
  buffet: Buffet | null;
  stations: StationSection[];
  navigationStations?: StationSection[];
  cart: Record<number, number>;
  onAdd: (itemId: number) => void;
  onAddDetails?: (itemId: number, quantity: number, notes: string) => void;
  onRemove: (itemId: number) => void;
  onChoose: (buffetId: number | null) => Promise<void>;
  isSelected: boolean;
  canSelectBuffet?: boolean;
  canCancelSelection: boolean;
  isPreview?: boolean;
};

type ConfirmationAction = 'select' | 'cancel' | null;

export function BuffetView({
  buffet,
  stations,
  navigationStations = stations,
  cart,
  onAdd,
  onAddDetails,
  onRemove,
  onChoose,
  isSelected,
  canSelectBuffet = true,
  canCancelSelection,
  isPreview = false,
}: BuffetViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [confirmationAction, setConfirmationAction] = useState<ConfirmationAction>(null);
  const [isChoosing, setIsChoosing] = useState(false);
  const [shouldRenderSelectButton, setShouldRenderSelectButton] = useState(!isSelected);

  const rootRef = useRef<HTMLDivElement>(null);
  const categoryNavigationRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const selectButtonRef = useRef<HTMLButtonElement>(null);
  const categoryScrollLocked = useRef(false);
  const categoryUnlockTimer = useRef<number | null>(null);
  const choosingLock = useRef(false);

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

  const visibleConfirmationAction =
    !canSelectBuffet && confirmationAction === 'select' ? null : confirmationAction;
  const isConfirmationOpen = visibleConfirmationAction !== null;

  useEffect(() => {
    if (!isSelected) {
      const appearanceTimer = window.setTimeout(() => setShouldRenderSelectButton(true), 0);
      return () => window.clearTimeout(appearanceTimer);
    }

    if (!shouldRenderSelectButton) return;

    const removalTimer = window.setTimeout(() => setShouldRenderSelectButton(false), 180);
    return () => window.clearTimeout(removalTimer);
  }, [isSelected, shouldRenderSelectButton]);

  useEffect(() => {
    if (isPreview || !rootRef.current || categories.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (categoryScrollLocked.current) return;

        const closestVisibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (first, second) =>
              Math.abs(first.boundingClientRect.top) - Math.abs(second.boundingClientRect.top),
          )[0];

        const categoryAlias = closestVisibleEntry?.target.getAttribute('data-buffet-category');

        if (categoryAlias) {
          setSelectedCategory(categoryAlias);
        }
      },
      {
        rootMargin: '-30% 0px -60% 0px',
        threshold: [0, 0.25, 0.5],
      },
    );

    const elements = rootRef.current.querySelectorAll<HTMLElement>('[data-buffet-category]');

    elements.forEach((element) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [categories, isPreview]);

  useEffect(() => {
    if (isPreview || activeCategory === null || !categoryNavigationRef.current) {
      return;
    }

    const centeringTimer = window.setTimeout(() => {
      const categoryButton = categoryNavigationRef.current?.querySelector<HTMLElement>(
        `[data-category-alias="${activeCategory}"]`,
      );

      categoryButton?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }, 160);

    return () => window.clearTimeout(centeringTimer);
  }, [activeCategory, isPreview]);

  useEffect(() => {
    if (!isConfirmationOpen) return;

    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    dialogRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !choosingLock.current) {
        setConfirmationAction(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;

      window.removeEventListener('keydown', handleKeyDown);

      previouslyFocusedElement?.focus();
    };
  }, [isConfirmationOpen]);

  useEffect(
    () => () => {
      if (categoryUnlockTimer.current !== null) {
        window.clearTimeout(categoryUnlockTimer.current);
      }
    },
    [],
  );

  function scrollToCategory(categoryAlias: string) {
    categoryScrollLocked.current = true;
    setSelectedCategory(categoryAlias);

    if (categoryUnlockTimer.current !== null) {
      window.clearTimeout(categoryUnlockTimer.current);
    }

    document.getElementById(`buffet-category-${categoryAlias}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });

    categoryUnlockTimer.current = window.setTimeout(() => {
      categoryScrollLocked.current = false;
      categoryUnlockTimer.current = null;
    }, 800);
  }

  async function choose(buffetId: number | null) {
    if (choosingLock.current) return;

    choosingLock.current = true;
    setIsChoosing(true);

    try {
      await onChoose(buffetId);
      setConfirmationAction(null);
    } catch {
      // The parent displays the request error to the customer.
    } finally {
      choosingLock.current = false;
      setIsChoosing(false);
    }
  }

  function closeConfirmation() {
    if (!choosingLock.current) {
      setConfirmationAction(null);
    }
  }

  function handleBackdropClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && !choosingLock.current) {
      closeConfirmation();
    }
  }

  function confirmAction() {
    if (!buffet || visibleConfirmationAction === null) return;
    if (visibleConfirmationAction === 'select' && !canSelectBuffet) return;

    const buffetId = visibleConfirmationAction === 'cancel' ? null : buffet.id;

    void choose(buffetId);
  }

  if (!buffet) {
    return (
      <p className="mx-auto max-w-lg px-4 py-8 text-sm text-content-muted" role="status">
        Buffet unavailable.
      </p>
    );
  }

  const confirmationTitle =
    visibleConfirmationAction === 'cancel'
      ? 'Cancel buffet selection?'
      : 'Confirm buffet selection?';

  const confirmationDescription =
    visibleConfirmationAction === 'cancel'
      ? 'The buffet will no longer be associated with your order.'
      : 'You can cancel your buffet selection until you send your first order to the kitchen.';

  return (
    <div
      ref={rootRef}
      className="client-buffet mx-auto max-w-lg px-4 pb-28"
      data-buffet-view={isPreview ? 'preview' : 'interactive'}
    >
      <header className="client-buffet-heading">
        <h1>{buffet.name}</h1>
        <p>{formatPrice(buffet.price)} per person</p>
      </header>

      {!isSelected && (
        <div className="client-buffet-notice is-primary">
          <strong>Not included</strong>
          <p>Drinks, extras and products available in the Menu section are charged separately.</p>
        </div>
      )}

      <div className="client-buffet-notice">
        <p>
          All dishes shown in this section are included. Drinks, extras and Menu products are
          charged separately.
        </p>
      </div>

      {Number(buffet.waste_charge) > 0 && (
        <div className="client-buffet-notice">
          <strong>Food waste policy</strong>
          <p>
            Excessive food waste may incur an additional charge of{' '}
            {formatPrice(buffet.waste_charge)}.
          </p>
        </div>
      )}

      {isSelected && (
        <div className="client-selected-buffet" role="status">
          <div>
            <span>Buffet selected</span>
          </div>

          {canCancelSelection && !isPreview && (
            <button
              type="button"
              disabled={isChoosing}
              aria-label="Cancel buffet selection"
              onClick={() => setConfirmationAction('cancel')}
            >
              {isChoosing ? '…' : '×'}
            </button>
          )}
        </div>
      )}

      {navigationStations.length > 0 && (
        <nav
          ref={isPreview ? undefined : categoryNavigationRef}
          className={`client-category-nav client-buffet-category-nav ${isPreview ? 'is-preview' : ''}`}
          aria-label="Buffet categories"
        >
          <div className="client-category-row scrollbar-none mx-auto flex max-w-lg gap-2 overflow-x-auto">
            {navigationStations.map((station) => {
              const isExpanded = station.categories.some(
                ({ category }) => category.alias === activeCategory,
              );

              return station.categories.length > 1 ? (
                <div
                  key={station.key}
                  className={`client-category-group flex flex-none gap-1 ${isExpanded ? 'is-expanded' : ''}`}
                >
                  <button
                    type="button"
                    className={`client-category-button client-station-button ${isExpanded ? 'is-active' : ''}`}
                    aria-expanded={isExpanded}
                    onClick={() => scrollToCategory(station.categories[0].category.alias)}
                  >
                    {station.name}
                  </button>
                  <div
                    className={`client-group-categories ${isExpanded ? 'is-visible' : ''}`}
                    aria-hidden={!isExpanded}
                    inert={!isExpanded}
                  >
                    {station.categories.map(({ category }) => (
                      <CategoryButton
                        key={category.alias}
                        categoryAlias={category.alias}
                        label={getCategoryConfig(category.alias, category.name).label}
                        selected={activeCategory === category.alias}
                        onClick={() => scrollToCategory(category.alias)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <CategoryButton
                  key={station.categories[0].category.alias}
                  categoryAlias={station.categories[0].category.alias}
                  label={
                    getCategoryConfig(
                      station.categories[0].category.alias,
                      station.categories[0].category.name,
                    ).label
                  }
                  selected={activeCategory === station.categories[0].category.alias}
                  onClick={() => scrollToCategory(station.categories[0].category.alias)}
                />
              );
            })}
          </div>
        </nav>
      )}

      {hasItems ? (
        <div className="client-buffet-sections">
          {stations.map((station) => (
            <section
              key={station.key}
              className="client-station-section"
              aria-labelledby={`buffet-station-${station.key}`}
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
                        <ProductCard
                          key={item.alias}
                          item={item}
                          quantity={cart[item.id] ?? 0}
                          onAdd={() => onAdd(item.id)}
                          onAddDetails={(quantity, notes) =>
                            onAddDetails?.(item.id, quantity, notes)
                          }
                          onRemove={() => onRemove(item.id)}
                          showActions={isSelected && !isPreview}
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
          There are no buffet dishes available at the moment.
        </p>
      )}

      {shouldRenderSelectButton && canSelectBuffet && !isPreview && (
        <button
          ref={selectButtonRef}
          type="button"
          className={`client-buffet-choose ${isSelected ? 'is-leaving' : ''}`}
          disabled={!hasItems || isChoosing || isSelected}
          onClick={() => setConfirmationAction('select')}
        >
          Select buffet
        </button>
      )}

      {isConfirmationOpen && (
        <div
          className="client-buffet-modal-backdrop"
          role="presentation"
          onClick={handleBackdropClick}
        >
          <section
            ref={dialogRef}
            tabIndex={-1}
            className="client-buffet-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="buffet-confirmation-title"
            aria-describedby="buffet-confirmation-description"
          >
            <h2 id="buffet-confirmation-title">{confirmationTitle}</h2>

            <p id="buffet-confirmation-description">{confirmationDescription}</p>

            <div className="client-buffet-modal-actions">
              <button
                type="button"
                className="is-secondary"
                disabled={isChoosing}
                onClick={closeConfirmation}
              >
                Keep current selection
              </button>

              <button type="button" disabled={isChoosing} onClick={confirmAction}>
                {isChoosing
                  ? 'Confirming…'
                  : visibleConfirmationAction === 'cancel'
                    ? 'Cancel buffet'
                    : 'Confirm'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
