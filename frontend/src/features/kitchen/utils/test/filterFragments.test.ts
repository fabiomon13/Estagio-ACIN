import { describe, expect, it } from 'vitest';
import { filterFragments } from '../filterFragments';
import type { TicketFragment } from '../getTicketColumn';
import type { KitchenOrderItem } from '../../types/kitchen.types';

function makeItem(overrides: Partial<KitchenOrderItem> = {}): KitchenOrderItem {
  return {
    order_item_id: 1,
    menu_item_name: 'Test Dish',
    quantity: 1,
    notes: null,
    tags: [],
    matched_allergens: [],
    station_id: 1,
    station: 'Hot/Wok',
    status: 'Pending',
    created_at: '2026-07-30T12:00:00Z',
    ...overrides,
  };
}

function makeFragment(overrides: Partial<TicketFragment> = {}): TicketFragment {
  return {
    order_id: 1,
    table_number: 1,
    guest_number: 1,
    round_number: 1,
    created_at: '2026-07-30T12:00:00Z',
    items: [makeItem()],
    ...overrides,
  };
}

describe('filterFragments', () => {
  it('keeps every station when no station filter is applied', () => {
    const fragment = makeFragment({
      items: [
        makeItem({ order_item_id: 1, station: 'Sushi Bar' }),
        makeItem({ order_item_id: 2, station: 'Fryer' }),
      ],
    });

    const result = filterFragments([fragment], '', []);

    expect(result[0].items.map((item) => item.order_item_id)).toEqual([1, 2]);
  });

  it('keeps items from any of the selected stations', () => {
    const fragment = makeFragment({
      items: [
        makeItem({ order_item_id: 1, station: 'Sushi Bar' }),
        makeItem({ order_item_id: 2, station: 'Hot/Wok' }),
        makeItem({ order_item_id: 3, station: 'Fryer' }),
      ],
    });

    const result = filterFragments([fragment], '', ['Sushi Bar', 'Hot/Wok']);

    expect(result[0].items.map((item) => item.order_item_id)).toEqual([1, 2]);
  });

  it('drops a fragment entirely when none of its items match the selected stations', () => {
    const fragment = makeFragment({
      items: [makeItem({ order_item_id: 1, station: 'Bar' })],
    });

    const result = filterFragments([fragment], '', ['Sushi Bar', 'Hot/Wok']);

    expect(result).toEqual([]);
  });

  it('combines the station filter with the search query', () => {
    const fragment = makeFragment({
      items: [
        makeItem({ order_item_id: 1, station: 'Sushi Bar', menu_item_name: 'Salmon Roll' }),
        makeItem({ order_item_id: 2, station: 'Sushi Bar', menu_item_name: 'Tuna Roll' }),
      ],
    });

    const result = filterFragments([fragment], 'salmon', ['Sushi Bar']);

    expect(result[0].items.map((item) => item.order_item_id)).toEqual([1]);
  });
});
