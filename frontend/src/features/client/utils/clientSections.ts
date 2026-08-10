// frontend/src/features/client/utils/clientSections.ts

import { getCategoryConfig } from '../clientConfig';
import type { CategoryAlias, CategorySection, StationSection } from '../clientTypes';
import type { Category, MenuItem } from '../services/menuApi';

type OrderedCategorySection = {
  section: CategorySection;
  order: number;
};

type StationGroup = {
  key: string;
  name: string;
  order: number;
  categories: OrderedCategorySection[];
};

// function to build category sections from categories and items
export function buildCategorySections(
  categories: readonly Category[],
  items: readonly MenuItem[],
): CategorySection[] {
  const itemsByCategory = new Map<CategoryAlias, MenuItem[]>();

  // Group items by category alias
  for (const item of items) {
    const categoryAlias = item.category.alias;
    const categoryItems = itemsByCategory.get(categoryAlias);

    if (categoryItems) {
      categoryItems.push(item);
    } else {
      itemsByCategory.set(categoryAlias, [item]);
    }
  }

  // Build category sections based on the grouped items
  return categories.flatMap((category) => {
    const categoryItems = itemsByCategory.get(category.alias);

    if (!categoryItems?.length) {
      return [];
    }

    return [
      {
        category,
        items: categoryItems,
      },
    ];
  });
}

// function to group category sections into station sections
export function groupCategorySections(sections: readonly CategorySection[]): StationSection[] {
  const groups = new Map<string, StationGroup>();

  for (const section of sections) {
    const config = getCategoryConfig(section.category.alias, section.category.name);

    // Check if the station group already exists
    const existingGroup = groups.get(config.stationKey);

    // If it exists, add the category section to the existing group
    if (existingGroup) {
      existingGroup.categories.push({
        section,
        order: config.categoryOrder,
      });

      continue;
    }

    // If it doesn't exist, create a new station group and add the category section
    groups.set(config.stationKey, {
      key: config.stationKey,
      name: config.stationName,
      order: config.stationOrder,
      categories: [
        {
          section,
          order: config.categoryOrder,
        },
      ],
    });
  }

  // Convert the groups map to an array, sort by station order, and sort categories within each station
  return [...groups.values()]
    .toSorted((first, second) => first.order - second.order)
    .map((group) => ({
      key: group.key,
      name: group.name,
      categories: group.categories
        .toSorted((first, second) => first.order - second.order)
        .map(({ section }) => section),
    }));
}
