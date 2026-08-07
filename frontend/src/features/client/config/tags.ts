// frontend/src/features/client/config/categories.ts

export type TagConfig = {
  label: string;
  type: 'diet' | 'allergen';
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

export type KnownTagAlias = keyof typeof tagConfig;

export function getTagConfig(alias: string, fallbackName: string): TagConfig {
  const normalizedAlias = alias.trim().toLowerCase();

  return (
    tagConfig[normalizedAlias as KnownTagAlias] ?? {
      label: fallbackName.replace(/^Alergénio:\s*/i, ''),
      type: normalizedAlias.startsWith('alergenio-') ? 'allergen' : 'diet',
    }
  );
}
