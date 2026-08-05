// frontend/src/features/client/clientTypes.ts

import type { Buffet, Category, MenuItem } from './services/menuApi';

export const CLIENT_VIEWS = ['menu', 'buffet', 'orders'] as const;

export type ClientView = (typeof CLIENT_VIEWS)[number];

export type ClientSessionState = 'loading' | 'setup' | 'waiting' | 'ready' | 'error';

export type MenuItemId = MenuItem['id'];
export type CategoryId = Category['id'];
export type BuffetId = Buffet['id'];
export type StationKey = string;

export type ClientCart = Readonly<Partial<Record<MenuItemId, number>>>;

export type CategorySection = Readonly<{
  category: Category;
  items: readonly MenuItem[];
}>;

export type StationSection = Readonly<{
  key: StationKey;
  name: string;
  categories: readonly CategorySection[];
}>;

export type ClientPageState =
  | {
      status: 'loading';
    }
  | {
      status: 'setup';
    }
  | {
      status: 'waiting';
    }
  | {
      status: 'ready';
    }
  | {
      status: 'error';
      message: string;
    };

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

export type CategoryAction = (categoryId: CategoryId) => void;
