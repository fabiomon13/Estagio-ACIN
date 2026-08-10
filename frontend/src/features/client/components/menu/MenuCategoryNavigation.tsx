// frontend/src/features/client/menu/MenuCategoryNavigation.tsx

import type { RefObject } from 'react';

import { getCategoryConfig } from '../../clientConfig';
import type { StationSection } from '../../clientTypes';
import { CategoryButton } from '../shared/CategoryButton';

type MenuCategoryNavigationProps = {
  stations: readonly StationSection[];
  activeCategory: string | null;
  navigationRef?: RefObject<HTMLElement | null>;
  onSelectCategory: (categoryAlias: string) => void;
};

export function MenuCategoryNavigation({
  stations,
  activeCategory,
  navigationRef,
  onSelectCategory,
}: MenuCategoryNavigationProps) {
  if (stations.length === 0) {
    return null;
  }

  return (
    <nav ref={navigationRef} className="client-category-nav" aria-label="Categorias do menu">
      <div className="client-category-row scrollbar-none mx-auto flex max-w-lg gap-2 overflow-x-auto">
        {stations.map((station) => {
          const firstCategory = station.categories[0]?.category;

          if (!firstCategory) {
            return null;
          }

          const isExpanded = station.categories.some(
            ({ category }) => category.alias === activeCategory,
          );

          if (station.categories.length === 1) {
            return (
              <CategoryButton
                key={firstCategory.alias}
                categoryAlias={firstCategory.alias}
                label={getCategoryConfig(firstCategory.alias, firstCategory.name).label}
                selected={activeCategory === firstCategory.alias}
                onClick={() => onSelectCategory(firstCategory.alias)}
              />
            );
          }

          return (
            <div
              key={station.key}
              className={[
                'client-category-group flex flex-none gap-1',
                isExpanded ? 'is-expanded' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <button
                type="button"
                className={[
                  'client-category-button client-station-button',
                  isExpanded ? 'is-active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-expanded={isExpanded}
                onClick={() => onSelectCategory(firstCategory.alias)}
              >
                {station.name}
              </button>

              <div
                className={['client-group-categories', isExpanded ? 'is-visible' : '']
                  .filter(Boolean)
                  .join(' ')}
                aria-hidden={!isExpanded}
                inert={!isExpanded}
              >
                {station.categories.map(({ category }) => (
                  <CategoryButton
                    key={category.alias}
                    categoryAlias={category.alias}
                    label={getCategoryConfig(category.alias, category.name).label}
                    selected={activeCategory === category.alias}
                    onClick={() => onSelectCategory(category.alias)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
