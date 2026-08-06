// Frontend-only: what is send. camelCase here, translated to the backend's
// snake_case query params
export type KitchenHistoryFilters = {
  dateFrom: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  status?: string;
  tableNumber?: number;
  itemId?: number;
  stationId?: number;
};

// From the backend: matches KitchenHistoryItemOut in kitchen/schemas.py.
// snake_case on purpose, this is the real shape of the JSON that arrives.
export type KitchenHistoryItem = {
  order_item_id: number;
  menu_item_name: string;
  table_number: number;
  round_number: number;
  quantity: number;
  station_id: number;
  station: string;
  status: string;
  created_at: string;
  updated_at: string;
};

// From the backend: matches KitchenHistoryListOut (the response of GET /kitchen/history).
export type KitchenHistoryListResult = {
  items: KitchenHistoryItem[];
  total_count: number;
};

// From the backend: matches KitchenHistorySummaryOut (GET /kitchen/history/summary).
export type KitchenHistorySummary = {
  counts: Record<string, number>;
  busiest_station: string | null;
  peak_hour: number | null; // 0-23
};

// From the backend: matches KitchenHistoryFilterOptionOut.
export type KitchenHistoryFilterOption = {
  id: number;
  name: string;
};

// From the backend: matches KitchenHistoryFilterOptionsOut (GET /kitchen/history/filters).
export type KitchenHistoryFilterOptions = {
  items: KitchenHistoryFilterOption[];
  stations: KitchenHistoryFilterOption[];
};
