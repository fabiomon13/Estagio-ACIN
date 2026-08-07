// frontend/src/features/client/config/categories.ts

export type CategoryConfig = {
  label: string;
  stationKey: string;
  stationName: string;
  emoji: string;
  stationOrder: number;
  categoryOrder: number;
};

export const categoryConfig = {
  starters: {
    label: 'Entradas',
    stationKey: 'starters',
    stationName: 'Entradas',
    emoji: '🥟',
    stationOrder: 0,
    categoryOrder: 1,
  },
  nigiri: {
    label: 'Nigiri',
    stationKey: 'sushi-bar',
    stationName: 'Sushi',
    emoji: '🍣',
    stationOrder: 1,
    categoryOrder: 1,
  },
  sashimi: {
    label: 'Sashimi',
    stationKey: 'sushi-bar',
    stationName: 'Sushi',
    emoji: '🐟',
    stationOrder: 1,
    categoryOrder: 2,
  },
  hosomaki: {
    label: 'Hosomaki',
    stationKey: 'sushi-bar',
    stationName: 'Sushi',
    emoji: '🍣',
    stationOrder: 1,
    categoryOrder: 3,
  },
  uramaki: {
    label: 'Uramaki',
    stationKey: 'sushi-bar',
    stationName: 'Sushi',
    emoji: '🍣',
    stationOrder: 1,
    categoryOrder: 4,
  },
  ramen: {
    label: 'Ramen',
    stationKey: 'hot-wok',
    stationName: 'Pratos quentes',
    emoji: '🍜',
    stationOrder: 2,
    categoryOrder: 1,
  },
  tempura: {
    label: 'Tempura',
    stationKey: 'fryer',
    stationName: 'Fritos',
    emoji: '🍤',
    stationOrder: 3,
    categoryOrder: 1,
  },
  'soft-drinks-water': {
    label: 'Refrigerantes e água',
    stationKey: 'bar',
    stationName: 'Bebidas',
    emoji: '🥤',
    stationOrder: 4,
    categoryOrder: 1,
  },
  'alcoholic-drinks': {
    label: 'Bebidas alcoólicas',
    stationKey: 'bar',
    stationName: 'Bebidas',
    emoji: '🍷',
    stationOrder: 4,
    categoryOrder: 2,
  },
  desserts: {
    label: 'Sobremesas',
    stationKey: 'cold-pantry',
    stationName: 'Cozinha fria',
    emoji: '🍰',
    stationOrder: 5,
    categoryOrder: 1,
  },
} as const satisfies Record<string, CategoryConfig>;

export type KnownCategoryAlias = keyof typeof categoryConfig;

export function getCategoryConfig(alias: string, fallbackName = alias): CategoryConfig {
  const normalizedAlias = alias.trim().toLowerCase();
  const normalizedName = fallbackName.trim() || normalizedAlias || 'Outros';

  return (
    categoryConfig[normalizedAlias as KnownCategoryAlias] ?? {
      label: normalizedName,
      stationKey: normalizedAlias || 'other',
      stationName: normalizedName,
      emoji: '🍽️',
      stationOrder: 999,
      categoryOrder: 999,
    }
  );
}

export function getStationOrder(alias: string): number {
  return getCategoryConfig(alias).stationOrder;
}

export function getCategoryOrder(alias: string): number {
  return getCategoryConfig(alias).categoryOrder;
}
