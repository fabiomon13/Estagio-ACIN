import { describe, expect, it } from 'vitest';
import { groupTicketsByColumn } from '../getTicketColumn';
import type { KitchenOrderItem, KitchenTicket } from '../../types/kitchen.types';

// Factories: sensible defaults + `overrides` for whatever a test cares about --
// used in the Arrange step below, so tests don't repeat the full object shape.
function makeItem(overrides: Partial<KitchenOrderItem> = {}): KitchenOrderItem {
  return {
    order_item_id: 1,
    menu_item_name: 'Test Dish',
    quantity: 1,
    notes: null,
    tags: [],
    matched_allergens: [],
    station_id: 1,
    station: 'Hot / Wok',
    status: 'Pending',
    created_at: '2026-07-30T12:00:00Z',
    ...overrides,
  };
}

function makeTicket(overrides: Partial<KitchenTicket> = {}): KitchenTicket {
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

describe('groupTicketsByColumn', () => {
  it('splits a round with items in 3 different active statuses into 3 separate fragments', () => {
    // Arrange: one ticket, one item per active status
    const ticket = makeTicket({
      order_id: 1,
      items: [
        makeItem({ order_item_id: 1, status: 'Pending' }),
        makeItem({ order_item_id: 2, status: 'Preparing' }),
        makeItem({ order_item_id: 3, status: 'Ready' }),
      ],
    });

    // Act
    const grouped = groupTicketsByColumn([ticket]);

    // Assert: each item landed in its matching column
    expect(grouped.new).toHaveLength(1);
    expect(grouped.new[0].items.map((item) => item.order_item_id)).toEqual([1]);
    expect(grouped.preparing).toHaveLength(1);
    expect(grouped.preparing[0].items.map((item) => item.order_item_id)).toEqual([2]);
    expect(grouped.ready).toHaveLength(1);
    expect(grouped.ready[0].items.map((item) => item.order_item_id)).toEqual([3]);
  });

  it('groups items sharing the same active status into one fragment, not split further', () => {
    // Arrange: two Pending items on the same ticket
    const ticket = makeTicket({
      items: [
        makeItem({ order_item_id: 1, status: 'Pending' }),
        makeItem({ order_item_id: 2, status: 'Pending' }),
      ],
    });

    // Act
    const grouped = groupTicketsByColumn([ticket]);

    // Assert: one fragment, not two -- same status doesn't get split
    expect(grouped.new).toHaveLength(1);
    expect(grouped.new[0].items.map((item) => item.order_item_id)).toEqual([1, 2]);
  });

  it('excludes Served, Cancelled, and Returned items from every column', () => {
    // Arrange: one active item, three terminal ones
    const ticket = makeTicket({
      items: [
        makeItem({ order_item_id: 1, status: 'Pending' }),
        makeItem({ order_item_id: 2, status: 'Served' }),
        makeItem({ order_item_id: 3, status: 'Cancelled' }),
        makeItem({ order_item_id: 4, status: 'Returned' }),
      ],
    });

    // Act
    const grouped = groupTicketsByColumn([ticket]);

    // Assert: only the active item made it into any column
    const allFragmentItemIds = [...grouped.new, ...grouped.preparing, ...grouped.ready].flatMap(
      (fragment) => fragment.items.map((item) => item.order_item_id),
    );

    expect(allFragmentItemIds).toEqual([1]);
  });

  it('produces no fragments for a round with only terminal items', () => {
    // Arrange: nothing active on this ticket at all
    const ticket = makeTicket({
      items: [
        makeItem({ order_item_id: 1, status: 'Served' }),
        makeItem({ order_item_id: 2, status: 'Cancelled' }),
      ],
    });

    // Act
    const grouped = groupTicketsByColumn([ticket]);

    // Assert: every column comes back empty
    expect(grouped.new).toEqual([]);
    expect(grouped.preparing).toEqual([]);
    expect(grouped.ready).toEqual([]);
  });

  it('sorts fragments within a column by urgency, most urgent first', () => {
    // Arrange: a fixed "now", one recent ticket and one old (more urgent) one
    const now = new Date('2026-07-30T12:30:00Z');
    const normalTicket = makeTicket({
      order_id: 1,
      created_at: '2026-07-30T12:28:00Z', // 2 min ago -> normal
      items: [makeItem({ status: 'Pending' })],
    });
    const dangerTicket = makeTicket({
      order_id: 2,
      created_at: '2026-07-30T12:05:00Z', // 25 min ago -> danger
      items: [makeItem({ status: 'Pending' })],
    });

    // Act: `now` is passed in explicitly, not read from the real clock
    const grouped = groupTicketsByColumn([normalTicket, dangerTicket], now);

    // Assert: the older (more urgent) ticket comes first
    expect(grouped.new.map((fragment) => fragment.order_id)).toEqual([2, 1]);
  });
});
