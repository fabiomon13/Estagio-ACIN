// frontend/src/features/client/hooks/useClientBootstrap.test.ts

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
// mocks used to control every resource loaded during client bootstrap
const mocks = vi.hoisted(() => ({
  table: vi.fn(),
  session: vi.fn(),
  guest: vi.fn(),
  categories: vi.fn(),
  menu: vi.fn(),
  buffets: vi.fn(),
  buffetItems: vi.fn(),
  tags: vi.fn(),
  orders: vi.fn(),
}));
vi.mock('../services/menuApi', () => ({
  getTable: mocks.table,
  getActiveSession: mocks.session,
  getCategories: mocks.categories,
  getMenu: mocks.menu,
  getBuffets: mocks.buffets,
  getBuffetItems: mocks.buffetItems,
  getTags: mocks.tags,
}));
vi.mock('../services/guestApi', () => ({ ensureGuest: mocks.guest }));
vi.mock('../services/orderApi', () => ({ getOrders: mocks.orders }));
vi.mock('../utils/deviceToken', () => ({ getDeviceToken: () => 'token' }));
import { ApiError } from '../../../services/api/client';
import { useClientBootstrap } from './useClientBootstrap';

// example table and approved session used in the tests
const table = { id: 1, table_number: 1, max_capacity: 4, public_code: 'mesa' };
const session = { is_approved: true, waiter_id: 2 };
// describe the test suite for initial client data loading
describe('useClientBootstrap', () => {
  // configure successful default responses before every test
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.table.mockResolvedValue(table);
    mocks.session.mockResolvedValue(session);
    mocks.guest.mockResolvedValue({
      id: 1,
      buffet_id: null,
      allergy_tag_ids: [],
      allergy_preferences_completed_at: null,
    });
    mocks.categories.mockResolvedValue([]);
    mocks.menu.mockResolvedValue({ items: [] });
    mocks.buffets.mockResolvedValue([]);
    mocks.buffetItems.mockResolvedValue([]);
    mocks.tags.mockResolvedValue([]);
    mocks.orders.mockResolvedValue([]);
  });
  // render the hook with observable state setters
  function setup() {
    const setTable = vi.fn();
    const setGuestCount = vi.fn();
    const setSessionState = vi.fn();
    const onOrdersLoaded = vi.fn();
    const hook = renderHook(() =>
      useClientBootstrap({
        tableCode: 'mesa',
        setTable,
        setGuestCount,
        setSessionState,
        onOrdersLoaded,
      }),
    );
    return { ...hook, setTable, setGuestCount, setSessionState, onOrdersLoaded };
  }
  it('carrega a sessão aprovada e os dados', async () => {
    const result = setup();
    await waitFor(() => expect(result.result.current.status).toBe('ready'));
    expect(result.setTable).toHaveBeenCalledWith(table);
    expect(result.setGuestCount).toHaveBeenCalledWith(2);
    expect(result.setSessionState).toHaveBeenCalledWith('ready');
  });
  it('entra em setup quando não existe sessão', async () => {
    mocks.session.mockRejectedValue(new ApiError(404, 'Não encontrada'));
    const result = setup();
    await waitFor(() => expect(result.result.current.status).toBe('ready'));
    expect(result.setSessionState).toHaveBeenCalledWith('setup');
  });
  it('expõe erros da API', async () => {
    mocks.table.mockRejectedValue(new ApiError(500, 'Falha controlada'));
    const result = setup();
    await waitFor(() => expect(result.result.current.status).toBe('error'));
    expect(result.result.current.error).toBe('Falha controlada');
  });
});
// frontend/src/features/client/hooks/useClientBootstrap.test.ts

// test case to check the complete approved-session flow
// test case to check the setup state when no session exists
// test case to check if controlled API errors are exposed
