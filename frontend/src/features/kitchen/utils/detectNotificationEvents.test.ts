import { describe, expect, it } from 'vitest';
import { detectNotificationEvents } from './detectNotificationEvents';
import type { KitchenOrderItem, KitchenTicket } from '../types/kitchen.types';

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
    table_number: 5,
    guest_number: 1,
    round_number: 1,
    created_at: '2026-07-30T12:00:00Z',
    items: [makeItem()],
    ...overrides,
  };
}

const T0 = new Date('2026-07-30T12:00:00Z');

describe('detectNotificationEvents', () => {
  it('seeds tickets on the first run without firing new-order', () => {
    const ticket = makeTicket();

    const { events } = detectNotificationEvents([ticket], null, T0);

    expect(events).toEqual([]);
  });

  it('fires new-order when a ticket not seen before shows up on a later run', () => {
    const ticket = makeTicket({ order_id: 1, round_number: 1, table_number: 5 });
    const { nextState } = detectNotificationEvents([ticket], null, T0);

    const newTicket = makeTicket({ order_id: 2, round_number: 1, table_number: 8 });
    const { events } = detectNotificationEvents([ticket, newTicket], nextState, T0);

    expect(events).toEqual([{ type: 'new-order', message: 'Novo pedido — Mesa 8' }]);
  });

  it('does not fire ready-too-long the moment an item is first observed as Ready', () => {
    const ticket = makeTicket({ items: [makeItem({ status: 'Ready' })] });

    const { events } = detectNotificationEvents([ticket], null, T0);

    expect(events).toEqual([]);
  });

  it('fires ready-too-long once an item has been observed Ready for 5+ minutes, and not again on the next poll', () => {
    const readyItem = makeItem({ order_item_id: 501, menu_item_name: 'Ramen', status: 'Ready' });
    const ticket = makeTicket({ table_number: 5, items: [readyItem] });

    const first = detectNotificationEvents([ticket], null, T0);
    expect(first.events).toEqual([]);

    const fiveMinLater = new Date(T0.getTime() + 5 * 60_000);
    const second = detectNotificationEvents([ticket], first.nextState, fiveMinLater);
    expect(second.events).toEqual([
      { type: 'ready-too-long', message: 'Ramen pronto há mais de 1 min — Mesa 5' },
    ]);

    const tenMinLater = new Date(T0.getTime() + 10 * 60_000);
    const third = detectNotificationEvents([ticket], second.nextState, tenMinLater);
    expect(third.events).toEqual([]);
  });

  it('clears ready tracking once the item leaves Ready, so a later Ready observation restarts the timer', () => {
    const readyItem = makeItem({ order_item_id: 501, status: 'Ready' });
    const ticket = makeTicket({ items: [readyItem] });

    const first = detectNotificationEvents([ticket], null, T0);

    const servedTicket = makeTicket({
      items: [makeItem({ order_item_id: 501, status: 'Served' })],
    });
    const second = detectNotificationEvents(
      [servedTicket],
      first.nextState,
      new Date(T0.getTime() + 5 * 60_000),
    );
    expect(second.events).toEqual([]);

    const readyAgainTicket = makeTicket({
      items: [makeItem({ order_item_id: 501, status: 'Ready' })],
    });
    const third = detectNotificationEvents(
      [readyAgainTicket],
      second.nextState,
      new Date(T0.getTime() + 6 * 60_000),
    );
    // Just became Ready again from this function's point of view -- must not
    // immediately fire using the old (5-minute-old) timestamp.
    expect(third.events).toEqual([]);
  });
});
