// frontend/src/features/client/clientTypes.ts

import type { Buffet, Category, MenuItem } from './services/menuApi';

export const CLIENT_VIEWS = ['menu', 'buffet', 'orders'] as const;

export type ClientView = (typeof CLIENT_VIEWS)[number];

export const CLIENT_SESSION_STATES = [
  'loading',
  'setup',
  'waiting',
  'ready',
  'completed',
  'error',
] as const;

export type ClientSessionState = (typeof CLIENT_SESSION_STATES)[number];

export type MenuItemId = MenuItem['id'];
export type CategoryAlias = Category['alias'];
export type BuffetId = Buffet['id'];

export type ClientCart = Readonly<Partial<Record<MenuItemId, number>>>;

export type CategorySection = Readonly<{
  category: Category;
  items: readonly MenuItem[];
}>;

export type StationSection = Readonly<{
  key: string;
  name: string;
  categories: readonly CategorySection[];
}>;

export type ClientPageState =
  | Readonly<{
      status: Exclude<ClientSessionState, 'error'>;
    }>
  | Readonly<{
      status: 'error';
      message: string;
    }>;

export type ClientData = Readonly<{
  menuItems: readonly MenuItem[];
  buffets: readonly Buffet[];
  buffetItems: readonly MenuItem[];
  buffetItemIds: ReadonlySet<MenuItemId>;
  selectedBuffetId: BuffetId | null;
  menuStations: readonly StationSection[];
  buffetStations: readonly StationSection[];
}>;

export type MenuItemAction = (itemId: MenuItemId) => void;

export type CategoryAction = (categoryAlias: CategoryAlias) => void;
