export type CategoryConfig = {
  label: string;
  stationKey: string;
  stationName: string;
  emoji: string;
  stationOrder: number;
  categoryOrder: number;
};

export type TagConfig = {
  label: string;
  type: 'diet' | 'allergen';
};

export const categoryConfig = {
  'alcoholic-drinks': {
    label: 'Alcoholic drinks',
    stationKey: 'bar',
    stationName: 'Drinks',
    emoji: '🍷',
    stationOrder: 4,
    categoryOrder: 2,
  },
  'soft-drinks-water': {
    label: 'Soft drinks & water',
    stationKey: 'bar',
    stationName: 'Drinks',
    emoji: '🥤',
    stationOrder: 4,
    categoryOrder: 1,
  },
  desserts: {
    label: 'Desserts',
    stationKey: 'cold-pantry',
    stationName: 'Cold kitchen',
    emoji: '🍰',
    stationOrder: 5,
    categoryOrder: 1,
  },
  tempura: {
    label: 'Tempura',
    stationKey: 'fryer',
    stationName: 'Fried dishes',
    emoji: '🍤',
    stationOrder: 3,
    categoryOrder: 1,
  },
  ramen: {
    label: 'Ramen',
    stationKey: 'hot-wok',
    stationName: 'Hot dishes',
    emoji: '🍜',
    stationOrder: 2,
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
} as const satisfies Record<string, CategoryConfig>;

export const tagConfig = {
  vegetariano: {
    label: 'Vegetarian',
    type: 'diet',
  },
  vegan: {
    label: 'Vegan',
    type: 'diet',
  },
  'sem-gluten': {
    label: 'Gluten-free',
    type: 'diet',
  },
  'sem-lactose': {
    label: 'Lactose-free',
    type: 'diet',
  },
  'alergenio-gluten': {
    label: 'Gluten',
    type: 'allergen',
  },
  'alergenio-crustaceos': {
    label: 'Crustaceans',
    type: 'allergen',
  },
  'alergenio-ovos': {
    label: 'Eggs',
    type: 'allergen',
  },
  'alergenio-peixe': {
    label: 'Fish',
    type: 'allergen',
  },
  'alergenio-amendoins': {
    label: 'Peanuts',
    type: 'allergen',
  },
  'alergenio-soja': {
    label: 'Soy',
    type: 'allergen',
  },
  'alergenio-leite': {
    label: 'Milk',
    type: 'allergen',
  },
  'alergenio-frutos-de-casca-rija': {
    label: 'Tree nuts',
    type: 'allergen',
  },
  'alergenio-aipo': {
    label: 'Celery',
    type: 'allergen',
  },
  'alergenio-mostarda': {
    label: 'Mustard',
    type: 'allergen',
  },
  'alergenio-sesamo': {
    label: 'Sesame',
    type: 'allergen',
  },
  'alergenio-sulfitos': {
    label: 'Sulphites',
    type: 'allergen',
  },
  'alergenio-tremoco': {
    label: 'Lupin',
    type: 'allergen',
  },
  'alergenio-moluscos': {
    label: 'Molluscs',
    type: 'allergen',
  },
} as const satisfies Record<string, TagConfig>;

export type KnownCategoryAlias = keyof typeof categoryConfig;

export type KnownTagAlias = keyof typeof tagConfig;

const priceFormatter = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
});

export function getCategoryConfig(alias: string, fallbackName = alias): CategoryConfig {
  const normalizedAlias = alias.trim();
  const normalizedName = fallbackName.trim() || normalizedAlias || 'Other';

  const configured = categoryConfig[normalizedAlias as KnownCategoryAlias];

  if (configured) {
    return configured;
  }

  return {
    label: normalizedName,
    stationKey: normalizedAlias || 'other',
    stationName: normalizedName,
    emoji: '🍽️',
    stationOrder: 999,
    categoryOrder: 999,
  };
}

export function getTagConfig(alias: string, fallbackName: string): TagConfig {
  return (
    tagConfig[alias as KnownTagAlias] ?? {
      label: fallbackName.replace('Allergen: ', ''),
      type: alias.startsWith('alergenio-') ? 'allergen' : 'diet',
    }
  );
}

export function formatPrice(value: string | number): string {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    if (import.meta.env.DEV) {
      console.warn(`Invalid price received: ${String(value)}`);
    }

    return '—';
  }

  return priceFormatter.format(numericValue);
}

export function getStationOrder(alias: string): number {
  return getCategoryConfig(alias).stationOrder;
}

export function getCategoryOrder(alias: string): number {
  return getCategoryConfig(alias).categoryOrder;
}
