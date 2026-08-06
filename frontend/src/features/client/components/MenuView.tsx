import { useEffect, useRef, useState } from 'react';

import { getCategoryConfig } from '../clientConfig';
import type { StationSection } from '../clientTypes';
import { CategoryButton } from './CategoryButton';
import { ProductCard } from './ProductCard';

type MenuViewProps = {
  stations: StationSection[];
  selectedAllergenTagIds?: ReadonlySet<number>;
  navigationStations?: StationSection[];
  cart: Record<number, number>;
  onAdd: (itemId: number) => void;
  onAddDetails?: (itemId: number, quantity: number, notes: string) => void;
  onRemove: (itemId: number) => void;
  isPreview?: boolean;
};

export function MenuView({
  stations,
  selectedAllergenTagIds = new Set(),
  navigationStations = stations,
  cart,
  onAdd,
  onAddDetails,
  onRemove,
  isPreview = false,
}: MenuViewProps) {
  const firstCategory = stations[0]?.categories[0]?.category.alias ?? null;
  const [selectedCategory, setSelectedCategory] = useState<string | null>(firstCategory);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigationRef = useRef<HTMLElement>(null);
  const scrollLocked = useRef(false);
  const unlockTimer = useRef<number | null>(null);

  useEffect(() => {
    if (isPreview || stations.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollLocked.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
        const categoryAlias = visible[0]?.target.getAttribute('data-menu-category');
        if (categoryAlias) setSelectedCategory(categoryAlias);
      },
      { rootMargin: '-35% 0px -55% 0px' },
    );
    const elements = rootRef.current?.querySelectorAll<HTMLElement>('[data-menu-category]') ?? [];
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [isPreview, stations]);

  useEffect(() => {
    if (isPreview || selectedCategory === null) return;

    const centeringTimer = window.setTimeout(() => {
      navigationRef.current
        ?.querySelector<HTMLElement>(`[data-category-alias="${selectedCategory}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 160);

    return () => window.clearTimeout(centeringTimer);
  }, [isPreview, selectedCategory]);

  function scrollToCategory(categoryAlias: string) {
    scrollLocked.current = true;
    setSelectedCategory(categoryAlias);
    document.getElementById(`menu-category-${categoryAlias}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    if (unlockTimer.current !== null) window.clearTimeout(unlockTimer.current);
    unlockTimer.current = window.setTimeout(() => {
      scrollLocked.current = false;
      unlockTimer.current = null;
    }, 800);
  }

  useEffect(
    () => () => {
      if (unlockTimer.current !== null) window.clearTimeout(unlockTimer.current);
    },
    [],
  );

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
        <nav
          ref={isPreview ? undefined : navigationRef}
          className={`client-category-nav ${isPreview ? 'is-preview' : ''}`}
          aria-label="Categorias do menu"
        >
          <div className="client-category-row scrollbar-none mx-auto flex max-w-lg gap-2 overflow-x-auto">
            {navigationStations.map((station) => {
              const isExpanded = station.categories.some(
                ({ category }) => category.alias === selectedCategory,
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
                        selected={selectedCategory === category.alias}
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
                  selected={selectedCategory === station.categories[0].category.alias}
                  onClick={() => scrollToCategory(station.categories[0].category.alias)}
                />
              );
            })}
          </div>
        </nav>
      </div>
      <div ref={rootRef} className="client-menu-sections mx-auto max-w-lg px-4 pb-8">
        {stations.map((station) => (
          <section key={station.key} className="client-station-section">
            {station.categories.length > 1 && (
              <h2 className="client-station-heading">{station.name}</h2>
            )}
            {station.categories.map(({ category, items }) => (
              <section
                key={category.alias}
                id={`menu-category-${category.alias}`}
                data-menu-category={category.alias}
                className="client-menu-section"
              >
                <div className="mb-4 flex items-center gap-3">
                  {station.categories.length > 1 ? (
                    <h3 className="font-display text-lg font-bold">
                      {getCategoryConfig(category.alias, category.name).label}
                    </h3>
                  ) : (
                    <h2 className="client-station-heading">
                      {getCategoryConfig(category.alias, category.name).label}
                    </h2>
                  )}
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="client-menu-grid grid gap-3">
                  {items.map((item) => (
                    <ProductCard
                      key={item.alias}
                      item={item}
                      selectedAllergenTagIds={selectedAllergenTagIds}
                      quantity={cart[item.id] ?? 0}
                      onAdd={() => onAdd(item.id)}
                      onAddDetails={(quantity, notes) => onAddDetails?.(item.id, quantity, notes)}
                      onRemove={() => onRemove(item.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
