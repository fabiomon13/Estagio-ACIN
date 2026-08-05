import { apiFetch } from '../../../services/api/client';
import { buildClientTablePath } from './clientRequest';

export type Category = {
  id: number;
  default_station_id: number;
  name: string;
  alias: string;
};

export type MenuTag = {
  id: number;
  name: string;
  alias: string;
};

export type MenuItem = {
  id: number;
  category_id: number;
  name: string;
  alias: string;
  description: string | null;
  photo_url: string | null;
  base_price: string;
  base_preparation_time: number;
  is_available: boolean;
  category: Category;
  tags: MenuTag[];
};

export type MenuPage = {
  items: MenuItem[];
  total: number;
  limit: number;
  offset: number;
};

export type MenuQuery = {
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
};

export type MenuRequestOptions = {
  signal?: AbortSignal;
};

export type Table = {
  id: number;
  table_number: number;
  max_capacity: number;
  public_code: string;
};

export type DiningSession = {
  id: number;
  table_id: number;
  waiter_id: number | null;
  num_clients: number;
  guest_count: number;
  available_places: number;
  is_active: boolean;
  is_approved: boolean;
  approved_at: string | null;
};

export type Buffet = {
  id: number;
  name: string;
  alias: string;
  price: string;
  waste_charge: string;
};

export async function getMenu({
  limit = 100,
  offset = 0,
  signal,
}: MenuQuery = {}): Promise<MenuPage> {
  const firstPage = await getMenuPage(limit, offset, signal);
  const items = [...firstPage.items];

  while (items.length < firstPage.total - offset) {
    const nextPage = await getMenuPage(limit, offset + items.length, signal);
    if (nextPage.items.length === 0) break;
    items.push(...nextPage.items);
  }

  return { ...firstPage, items, limit: items.length };
}

function getMenuPage(limit: number, offset: number, signal?: AbortSignal): Promise<MenuPage> {
  const query = new URLSearchParams({
    is_available: 'true',
    limit: String(limit),
    offset: String(offset),
  });
  return apiFetch<MenuPage>(`/client/menu-items?${query}`, { signal });
}

export function getCategories(options: MenuRequestOptions = {}): Promise<Category[]> {
  return apiFetch<Category[]>('/client/categories', options);
}

export function getBuffets(options: MenuRequestOptions = {}): Promise<Buffet[]> {
  return apiFetch<Buffet[]>('/client/buffets', options);
}

export function getBuffetItems(
  buffetId: number,
  options: MenuRequestOptions = {},
): Promise<MenuItem[]> {
  return apiFetch<MenuItem[]>(`/client/buffets/${buffetId}/items`, options);
}

export function getTable(tableCode: string, options: MenuRequestOptions = {}): Promise<Table> {
  return apiFetch<Table>(buildClientTablePath(tableCode), options);
}

export function getActiveSession(
  tableCode: string,
  options: MenuRequestOptions = {},
): Promise<DiningSession> {
  return apiFetch<DiningSession>(`${buildClientTablePath(tableCode)}/session`, options);
}

export function createSession(tableCode: string, numClients: number): Promise<DiningSession> {
  return apiFetch<DiningSession>(`${buildClientTablePath(tableCode)}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ num_clients: numClients }),
  });
}
