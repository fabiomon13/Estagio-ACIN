// frontend/src/features/client/utils/clientSections.test.ts

import { describe, expect, it } from 'vitest';

import type { Category, MenuItem } from '../services/menuApi';
import { buildCategorySections, groupCategorySections } from './clientSections';

// example categories used to build menu sections
const categories: Category[] = [
  { id: 1, default_station_id: 1, name: 'Entradas', alias: 'entradas' },
  { id: 2, default_station_id: 1, name: 'Pratos', alias: 'pratos-principais' },
];

// create a menu item for a specific category
function createItem(id: number, category: Category): MenuItem {
  return {
    id,
    category_id: category.id,
    name: `Artigo ${id}`,
    alias: `artigo-${id}`,
    description: null,
    photo_url: null,
    base_price: '5.00',
    base_preparation_time: 10,
    is_available: true,
    category,
    tags: [],
  };
}

// describe the test suite for category section creation
describe('buildCategorySections', () => {
  // test case to check grouping by category
  it('agrupa os artigos pela respetiva categoria', () => {
    const sections = buildCategorySections(categories, [
      createItem(1, categories[0]),
      createItem(2, categories[1]),
      createItem(3, categories[0]),
    ]);

    expect(sections).toHaveLength(2);
    expect(sections[0].items.map((item) => item.id)).toEqual([1, 3]);
    expect(sections[1].items.map((item) => item.id)).toEqual([2]);
  });

  // test case to check if empty categories are omitted
  it('omite categorias sem artigos', () => {
    const sections = buildCategorySections(categories, [createItem(1, categories[0])]);

    expect(sections).toHaveLength(1);
    expect(sections[0].category.id).toBe(1);
  });
});

// describe the test suite for station grouping
describe('groupCategorySections', () => {
  // test case to check if categories are converted into station groups
  it('converte as categorias em grupos de estações', () => {
    const sections = buildCategorySections(categories, [
      createItem(1, categories[0]),
      createItem(2, categories[1]),
    ]);
    const stations = groupCategorySections(sections);

    expect(stations.length).toBeGreaterThan(0);
    expect(stations.flatMap((station) => station.categories)).toHaveLength(2);
  });
});
