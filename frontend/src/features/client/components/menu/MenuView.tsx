// frontend/src/features/client/menu/MenuView.tsx

import { useEffect, useMemo, useRef, useState } from 'react';

import { getCategoryConfig } from '../../clientConfig';
import type { StationSection } from '../../clientTypes';
import { MenuCategoryNavigation } from './MenuCategoryNavigation';
import { ProductCardItem } from './ProductCardItem';

type MenuViewProps = {
  stations: readonly StationSection[];
  navigationStations?: readonly StationSection[];
  selectedAllergenTagIds?: ReadonlySet<number>;
  cart: Readonly<Record<number, number>>;
  onAdd: (itemId: number) => void;
  onAddDetails?: (itemId: number, quantity: number, notes: string) => void;
  onRemove: (itemId: number) => void;
  isPreview?: boolean;
};

export function MenuView({
  stations,
  navigationStations = stations,
  selectedAllergenTagIds = new Set(),
  cart,
  onAdd,
  onAddDetails,
  onRemove,
  isPreview = false,
}: MenuViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
  const scrollLockedRef = useRef(false);
  const unlockTimerRef = useRef<number | null>(null);

  const categories = useMemo(() => stations.flatMap((station) => station.categories), [stations]);

  const categoryAliases = useMemo(
    () => new Set(categories.map(({ category }) => category.alias)),
    [categories],
  );

  const activeCategory =
    selectedCategory !== null && categoryAliases.has(selectedCategory)
      ? selectedCategory
      : (categories[0]?.category.alias ?? null);

  useEffect(() => {
    if (isPreview || !rootRef.current || categories.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollLockedRef.current) {
          return;
        }

        const closestEntry = entries
          .filter((entry) => entry.isIntersecting)
          .toSorted(
            (first, second) =>
              Math.abs(first.boundingClientRect.top) - Math.abs(second.boundingClientRect.top),
          )[0];

        const categoryAlias = closestEntry?.target.getAttribute('data-menu-category');

        if (categoryAlias) {
          setSelectedCategory(categoryAlias);
        }
      },
      {
        rootMargin: '-35% 0px -55% 0px',
      },
    );

    const categoryElements = rootRef.current.querySelectorAll<HTMLElement>('[data-menu-category]');

    categoryElements.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [categories, isPreview]);

  useEffect(() => {
    if (isPreview || activeCategory === null || !navigationRef.current) {
      return;
    }

    const centeringTimer = window.setTimeout(() => {
      navigationRef.current
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
      if (unlockTimerRef.current !== null) {
        window.clearTimeout(unlockTimerRef.current);
      }
    },
    [],
  );

  function scrollToCategory(categoryAlias: string): void {
    scrollLockedRef.current = true;
    setSelectedCategory(categoryAlias);

    if (unlockTimerRef.current !== null) {
      window.clearTimeout(unlockTimerRef.current);
    }

    document.getElementById(`menu-category-${categoryAlias}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });

    unlockTimerRef.current = window.setTimeout(() => {
      scrollLockedRef.current = false;
      unlockTimerRef.current = null;
    }, 800);
  }

  if (stations.length === 0) {
    return (
      <div
        className="client-menu-sections mx-auto max-w-lg px-4 py-10 text-center text-sm text-content-muted"
        role="status"
      >
        Não existem artigos disponíveis neste momento.
      </div>
    );
  }

  return (
    <>
      <div className="client-menu-controls">
        <section className="client-menu-heading mx-auto max-w-lg px-4">
          <h1>Menu</h1>
        </section>

        <MenuCategoryNavigation
          stations={navigationStations}
          activeCategory={activeCategory}
          navigationRef={isPreview ? undefined : navigationRef}
          onSelectCategory={scrollToCategory}
        />
      </div>

      <div ref={rootRef} className="client-menu-sections mx-auto max-w-lg px-4 pb-8">
        {stations.map((station) => (
          <section
            key={station.key}
            className="client-station-section"
            aria-labelledby={
              station.categories.length > 1 ? `menu-station-${station.key}` : undefined
            }
          >
            {station.categories.length > 1 && (
              <h2 id={`menu-station-${station.key}`} className="client-station-heading">
                {station.name}
              </h2>
            )}

            {station.categories.map(({ category, items }) => {
              const categoryLabel = getCategoryConfig(category.alias, category.name).label;

              const Heading = station.categories.length > 1 ? 'h3' : 'h2';

              return (
                <section
                  key={category.alias}
                  id={`menu-category-${category.alias}`}
                  data-menu-category={category.alias}
                  className="client-menu-section"
                  aria-labelledby={`menu-category-heading-${category.alias}`}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <Heading
                      id={`menu-category-heading-${category.alias}`}
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
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </section>
        ))}
      </div>
    </>
  );
}
