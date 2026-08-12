import { apiFetch } from '../../../services/api/client';
import { buildClientTablePath, createDeviceHeaders } from './clientRequest';

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

export type ClientSessionState = {
  session: DiningSession;
  status: 'active' | 'completed' | 'closed';
};

export type Buffet = {
  id: number;
  name: string;
  alias: string;
  price: string;
  waste_charge: string;
};

// Fetches the complete menu by retrieving all pages of menu items, combining them into a single result
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

// Fetches a single page of menu items based on the specified limit and offset, returning a Promise that resolves to a MenuPage object
function getMenuPage(limit: number, offset: number, signal?: AbortSignal): Promise<MenuPage> {
  const query = new URLSearchParams({
    is_available: 'true',
    limit: String(limit),
    offset: String(offset),
  });
  return apiFetch<MenuPage>(`/client/menu-items?${query}`, { signal });
}

// Fetches lists of categories, tags, buffets, buffet items, table information, and active dining sessions from the API
export function getCategories(options: MenuRequestOptions = {}): Promise<Category[]> {
  return apiFetch<Category[]>('/client/categories', options);
}

export function getTags(options: MenuRequestOptions = {}): Promise<MenuTag[]> {
  return apiFetch<MenuTag[]>('/client/tags', options);
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

export function getSessionState(
  tableCode: string,
  sessionId: number,
  deviceToken: string,
  options: MenuRequestOptions = {},
): Promise<ClientSessionState> {
  return apiFetch<ClientSessionState>(
    `${buildClientTablePath(tableCode)}/sessions/${sessionId}/state`,
    {
      headers: createDeviceHeaders(deviceToken),
      signal: options.signal,
    },
  );
}

// Creates a new dining session for the specified table code, including the number of clients in the request body
export function createSession(tableCode: string, numClients: number): Promise<DiningSession> {
  return apiFetch<DiningSession>(`${buildClientTablePath(tableCode)}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ num_clients: numClients }),
  });
}
