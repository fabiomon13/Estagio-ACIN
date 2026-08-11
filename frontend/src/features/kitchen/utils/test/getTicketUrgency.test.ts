import { describe, expect, it } from 'vitest';
import { getElapsedMinutes, getTicketUrgency, sortTicketsByUrgency } from '../getTicketUrgency';
import type { KitchenTicket } from '../../types/kitchen.types';

describe('getElapsedMinutes', () => {
  it('returns 0 for a ticket created right now', () => {
    const now = new Date('2026-07-30T12:00:00Z');
    expect(getElapsedMinutes(now.toISOString(), now)).toBe(0);
  });

  it('returns 9 for a ticket created 9 minutes and 59 seconds ago', () => {
    const now = new Date('2026-07-30T12:09:59Z');
    const createdAt = new Date('2026-07-30T12:00:00Z').toISOString();
    expect(getElapsedMinutes(createdAt, now)).toBe(9);
  });

  it('returns 10 for a ticket created exactly 10 minutes ago', () => {
    const now = new Date('2026-07-30T12:10:00Z');
    const createdAt = new Date('2026-07-30T12:00:00Z').toISOString();
    expect(getElapsedMinutes(createdAt, now)).toBe(10);
  });

  it('returns 20 for a ticket created exactly 20 minutes ago', () => {
    const now = new Date('2026-07-30T12:20:00Z');
    const createdAt = new Date('2026-07-30T12:00:00Z').toISOString();
    expect(getElapsedMinutes(createdAt, now)).toBe(20);
  });

  it('clamps a future createdAt to 0 instead of returning a negative number', () => {
    const now = new Date('2026-07-30T12:00:00Z');
    const createdAt = new Date('2026-07-30T12:05:00Z').toISOString();
    expect(getElapsedMinutes(createdAt, now)).toBe(0);
  });

  it('returns 0 for an unparseable createdAt', () => {
    const now = new Date('2026-07-30T12:00:00Z');
    expect(getElapsedMinutes('not-a-date', now)).toBe(0);
  });
});

describe('getTicketUrgency', () => {
  it('returns normal below 10 minutes', () => {
    expect(getTicketUrgency(9)).toBe('normal');
  });

  it('returns warning at exactly 10 minutes', () => {
    expect(getTicketUrgency(10)).toBe('warning');
  });

  it('returns warning below 20 minutes', () => {
    expect(getTicketUrgency(19)).toBe('warning');
  });

  it('returns danger at exactly 20 minutes', () => {
    expect(getTicketUrgency(20)).toBe('danger');
  });
});

describe('sortTicketsByUrgency', () => {
  function makeTicket(orderId: number, createdAt: string): KitchenTicket {
    return {
      order_id: orderId,
      table_number: 1,
      guest_number: 1,
      round_number: 1,
      created_at: createdAt,
      items: [],
    };
  }

  it('orders danger before warning before normal', () => {
    const now = new Date('2026-07-30T12:30:00Z');
    const dangerTicket = makeTicket(1, '2026-07-30T12:05:00Z'); // 25 min ago
    const warningTicket = makeTicket(2, '2026-07-30T12:18:00Z'); // 12 min ago
    const normalTicket = makeTicket(3, '2026-07-30T12:28:00Z'); // 2 min ago

    const sorted = sortTicketsByUrgency([normalTicket, dangerTicket, warningTicket], now);

    expect(sorted.map((ticket) => ticket.order_id)).toEqual([1, 2, 3]);
  });

  it('within the same urgency, orders oldest created_at first', () => {
    const now = new Date('2026-07-30T12:30:00Z');
    const olderDanger = makeTicket(1, '2026-07-30T12:00:00Z'); // 30 min ago
    const newerDanger = makeTicket(2, '2026-07-30T12:05:00Z'); // 25 min ago

    const sorted = sortTicketsByUrgency([newerDanger, olderDanger], now);

    expect(sorted.map((ticket) => ticket.order_id)).toEqual([1, 2]);
  });

  it('breaks ties on identical created_at using ascending order_id', () => {
    const now = new Date('2026-07-30T12:30:00Z');
    const sameTimeA = makeTicket(5, '2026-07-30T12:00:00Z');
    const sameTimeB = makeTicket(2, '2026-07-30T12:00:00Z');

    const sorted = sortTicketsByUrgency([sameTimeA, sameTimeB], now);

    expect(sorted.map((ticket) => ticket.order_id)).toEqual([2, 5]);
  });

  it('does not mutate the input array', () => {
    const now = new Date('2026-07-30T12:30:00Z');
    const tickets = [makeTicket(2, '2026-07-30T12:00:00Z'), makeTicket(1, '2026-07-30T12:05:00Z')];
    const original = [...tickets];

    sortTicketsByUrgency(tickets, now);

    expect(tickets).toEqual(original);
  });
});
