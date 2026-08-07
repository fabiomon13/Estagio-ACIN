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
  starters: {
    label: 'Entradas',
    stationKey: 'entradas',
    stationName: 'Entradas',
    emoji: '🥟',
    stationOrder: 1,
    categoryOrder: 1,
  },
  nigiri: {
    label: 'Nigiri',
    stationKey: 'sushi',
    stationName: 'Sushi ',
    emoji: '🍣',
    stationOrder: 2,
    categoryOrder: 1,
  },
  sashimi: {
    label: 'Sashimi',
    stationKey: 'sushi',
    stationName: 'Sushi ',
    emoji: '🐟',
    stationOrder: 2,
    categoryOrder: 2,
  },
  uramaki: {
    label: 'Uramaki',
    stationKey: 'sushi',
    stationName: 'Sushi ',
    emoji: '🍱',
    stationOrder: 2,
    categoryOrder: 3,
  },
  hosomaki: {
    label: 'Hosomaki',
    stationKey: 'sushi',
    stationName: 'Sushi ',
    emoji: '🍙',
    stationOrder: 2,
    categoryOrder: 4,
  },
  tempura: {
    label: 'Tempura',
    stationKey: 'fryer',
    stationName: 'Fritos',
    emoji: '🍤',
    stationOrder: 3,
    categoryOrder: 1,
  },
  ramen: {
    label: 'Ramen',
    stationKey: 'hot-wok',
    stationName: 'Cozinha Quente',
    emoji: '🍜',
    stationOrder: 4,
    categoryOrder: 1,
  },
  'soft-drinks-water': {
    label: 'Refrigerantes e água',
    stationKey: 'bar',
    stationName: 'Bebidas',
    emoji: '🥤',
    stationOrder: 5,
    categoryOrder: 1,
  },
  'alcoholic-drinks': {
    label: 'Bebidas alcoólicas',
    stationKey: 'bar',
    stationName: 'Bebidas',
    emoji: '🍷',
    stationOrder: 5,
    categoryOrder: 2,
  },
  desserts: {
    label: 'Sobremesas',
    stationKey: 'cold-pantry',
    stationName: 'Cozinha fria',
    emoji: '🍰',
    stationOrder: 6,
    categoryOrder: 1,
  },
};

export const tagConfig = {
  vegetariano: {
    label: 'Vegetariano',
    type: 'diet',
  },
  vegan: {
    label: 'Vegan',
    type: 'diet',
  },
  'sem-gluten': {
    label: 'Sem glúten',
    type: 'diet',
  },
  'sem-lactose': {
    label: 'Sem lactose',
    type: 'diet',
  },
  'alergenio-gluten': {
    label: 'Glúten',
    type: 'allergen',
  },
  'alergenio-crustaceos': {
    label: 'Crustáceos',
    type: 'allergen',
  },
  'alergenio-ovos': {
    label: 'Ovos',
    type: 'allergen',
  },
  'alergenio-peixe': {
    label: 'Peixe',
    type: 'allergen',
  },
  'alergenio-amendoins': {
    label: 'Amendoins',
    type: 'allergen',
  },
  'alergenio-soja': {
    label: 'Soja',
    type: 'allergen',
  },
  'alergenio-leite': {
    label: 'Leite',
    type: 'allergen',
  },
  'alergenio-frutos-de-casca-rija': {
    label: 'Frutos de casca rija',
    type: 'allergen',
  },
  'alergenio-aipo': {
    label: 'Aipo',
    type: 'allergen',
  },
  'alergenio-mostarda': {
    label: 'Mostarda',
    type: 'allergen',
  },
  'alergenio-sesamo': {
    label: 'Sésamo',
    type: 'allergen',
  },
  'alergenio-sulfitos': {
    label: 'Sulfitos',
    type: 'allergen',
  },
  'alergenio-tremoco': {
    label: 'Tremoço',
    type: 'allergen',
  },
  'alergenio-moluscos': {
    label: 'Moluscos',
    type: 'allergen',
  },
} as const satisfies Record<string, TagConfig>;

export type KnownCategoryAlias = keyof typeof categoryConfig;

export type KnownTagAlias = keyof typeof tagConfig;

const priceFormatter = new Intl.NumberFormat('pt-PT', {
  style: 'currency',
  currency: 'EUR',
});

export function getCategoryConfig(alias: string, fallbackName = alias): CategoryConfig {
  const normalizedAlias = alias.trim();
  const normalizedName = fallbackName.trim() || normalizedAlias || 'Outros';

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
      label: fallbackName.replace(/^Alergénio:\s*/i, ''),
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
