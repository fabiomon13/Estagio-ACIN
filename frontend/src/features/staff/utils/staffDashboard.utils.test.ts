import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  formatTimeSince,
  isAssistanceType,
  isUrgentPriority,
  tableBorder,
  translateState,
} from './staffDashboard.utils';

describe('staffDashboard.utils', () => {
  afterEach(() => vi.useRealTimers());

  it('formats elapsed minutes and hours and clamps future dates to zero', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-11T12:00:00Z'));

    expect(formatTimeSince('2026-08-11T11:55:00Z')).toBe('5 min');
    expect(formatTimeSince('2026-08-11T10:35:00Z')).toBe('1h 25m');
    expect(formatTimeSince('2026-08-11T12:10:00Z')).toBe('0 min');
    expect(formatTimeSince(null)).toBeNull();
  });

  it.each([
    ['active', 'Ativa'],
    ['inactive', 'Inativa'],
    ['payment_requested', 'Pagamento Solicitado'],
    ['custom', 'custom'],
  ])('translates the %s state', (state, label) => {
    expect(translateState(state)).toBe(label);
  });

  it.each([
    ['active', 'border-success'],
    ['awaiting_approval', 'border-warning'],
    ['payment_requested', 'border-warning'],
    ['inactive', 'border-border-strong'],
    ['custom', 'border-border'],
  ])('selects a border for %s', (state, border) => {
    expect(tableBorder(state)).toBe(border);
  });

  it('recognizes assistance aliases defensively', () => {
    expect(isAssistanceType(' assistance ')).toBe(true);
    expect(isAssistanceType('assitance')).toBe(true);
    expect(isAssistanceType('ASSIST_USER')).toBe(true);
    expect(isAssistanceType('payment_request')).toBe(false);
  });

  it('recognizes supported urgent priority labels', () => {
    expect(isUrgentPriority(' urgent ')).toBe(true);
    expect(isUrgentPriority('HIGH')).toBe(true);
    expect(isUrgentPriority('alta')).toBe(true);
    expect(isUrgentPriority('normal')).toBe(false);
  });
});
