import { getCategoryConfig } from '../clientConfig';
import type { CategorySection, StationSection } from '../clientTypes';
import type { Category, MenuItem } from '../services/menuApi';

export function buildCategorySections(
  categories: readonly Category[],
  items: readonly MenuItem[],
): CategorySection[] {
  const itemsByCategory = new Map<number, MenuItem[]>();

  for (const item of items) {
    const categoryItems = itemsByCategory.get(item.category_id);
    if (categoryItems) categoryItems.push(item);
    else itemsByCategory.set(item.category_id, [item]);
  }

  return categories.flatMap((category) => {
    const categoryItems = itemsByCategory.get(category.id) ?? [];
    return categoryItems.length > 0 ? [{ category, items: categoryItems }] : [];
  });
}

export function groupCategorySections(sections: readonly CategorySection[]): StationSection[] {
  const groups = new Map<string, { key: string; name: string; categories: CategorySection[] }>();

  for (const section of sections) {
    const config = getCategoryConfig(section.category.alias, section.category.name);
    const group = groups.get(config.stationKey);
    if (group) group.categories.push(section);
    else {
      groups.set(config.stationKey, {
        key: config.stationKey,
        name: config.stationName,
        categories: [section],
      });
    }
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      categories: group.categories.toSorted(
        (first, second) =>
          getCategoryConfig(first.category.alias).categoryOrder -
          getCategoryConfig(second.category.alias).categoryOrder,
      ),
    }))
    .toSorted(
      (first, second) =>
        getCategoryConfig(first.categories[0].category.alias).stationOrder -
        getCategoryConfig(second.categories[0].category.alias).stationOrder,
    );
}
