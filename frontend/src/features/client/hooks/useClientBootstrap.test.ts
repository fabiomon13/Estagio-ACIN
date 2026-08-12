// frontend/src/features/client/hooks/useClientBootstrap.test.ts

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
// mocks used to control every resource loaded during client bootstrap
const mocks = vi.hoisted(() => ({
  table: vi.fn(),
  session: vi.fn(),
  sessionState: vi.fn(),
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
  getSessionState: mocks.sessionState,
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
const session = { id: 7, is_approved: true, waiter_id: 2 };
// describe the test suite for initial client data loading
describe('useClientBootstrap', () => {
  // configure successful default responses before every test
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    sessionStorage.clear();
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
  it('carrega apenas uma vez os artigos do buffet inicial', async () => {
    mocks.guest.mockResolvedValue({
      id: 1,
      buffet_id: 10,
      allergy_tag_ids: [],
      allergy_preferences_completed_at: null,
    });
    mocks.buffets.mockResolvedValue([{ id: 10, name: 'Buffet', price: '20.00' }]);

    const result = setup();

    await waitFor(() => expect(result.result.current.status).toBe('ready'));
    await waitFor(() => expect(mocks.buffetItems).toHaveBeenCalledTimes(1));

    expect(mocks.buffetItems).toHaveBeenCalledWith(10, expect.any(Object));
  });
  it('reutiliza os artigos ao regressar a um buffet já carregado', async () => {
    mocks.guest.mockResolvedValue({
      id: 1,
      buffet_id: 10,
      allergy_tag_ids: [],
      allergy_preferences_completed_at: null,
    });
    mocks.buffets.mockResolvedValue([
      { id: 10, name: 'Buffet A', price: '20.00' },
      { id: 20, name: 'Buffet B', price: '25.00' },
    ]);

    const result = setup();

    await waitFor(() => expect(result.result.current.status).toBe('ready'));

    act(() => result.result.current.data.setSelectedBuffetId(20));
    await waitFor(() => expect(mocks.buffetItems).toHaveBeenCalledTimes(2));

    act(() => result.result.current.data.setSelectedBuffetId(10));
    await waitFor(() => expect(result.result.current.data.selectedBuffetId).toBe(10));

    expect(mocks.buffetItems).toHaveBeenCalledTimes(2);
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
