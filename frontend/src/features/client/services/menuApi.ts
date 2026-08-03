import { apiFetch } from '../../../services/api/client';

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

type MenuPage = {
  items: MenuItem[];
  total: number;
  limit: number;
  offset: number;
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

export function getMenu(): Promise<MenuPage> {
  return apiFetch<MenuPage>('/client/menu-items?is_available=true&limit=100');
}

export function getCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/client/categories');
}

export function getBuffets(): Promise<Buffet[]> {
  return apiFetch<Buffet[]>('/client/buffets');
}

export function getBuffetItems(buffetId: number): Promise<MenuItem[]> {
  return apiFetch<MenuItem[]>(`/client/buffets/${buffetId}/items`);
}

export function getTable(tableCode: string): Promise<Table> {
  return apiFetch<Table>(`/client/tables/${encodeURIComponent(tableCode)}`);
}

export function getActiveSession(tableCode: string): Promise<DiningSession> {
  return apiFetch<DiningSession>(`/client/tables/${encodeURIComponent(tableCode)}/session`);
}

export function createSession(tableCode: string, numClients: number): Promise<DiningSession> {
  return apiFetch<DiningSession>(`/client/tables/${encodeURIComponent(tableCode)}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ num_clients: numClients }),
  });
}
