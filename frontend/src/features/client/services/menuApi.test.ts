// frontend/src/features/client/services/menuApi.test.ts

import { beforeEach, describe, expect, it, vi } from 'vitest';
const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('../../../services/api/client', () => ({ apiFetch }));
import {
  createSession,
  getBuffetItems,
  getCategories,
  getMenu,
  getSessionState,
  getTable,
} from './menuApi';

// describe the test suite for menu, buffet, table, and session requests
describe('menuApi', () => {
  // reset the request mock before every test
  beforeEach(() => apiFetch.mockReset());

  // test case to check if all menu pages are combined into a single result
  it('carrega todas as páginas do menu', async () => {
    apiFetch
      .mockResolvedValueOnce({ items: [{ id: 1 }], total: 2, limit: 1, offset: 0 })
      .mockResolvedValueOnce({ items: [{ id: 2 }], total: 2, limit: 1, offset: 1 });
    const result = await getMenu({ limit: 1 });
    expect(result.items).toHaveLength(2);
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });

  // test case to check if the correct resource paths are used for categories, buffet items, and table requests
  it('usa os caminhos dos recursos', () => {
    getCategories();
    getBuffetItems(3);
    getTable('mesa 1');
    expect(apiFetch.mock.calls.map(([path]) => path)).toEqual([
      '/client/categories',
      '/client/buffets/3/items',
      '/client/tables/mesa%201',
    ]);
  });

  // test case to check if the payload used to create a dining session includes the number of clients
  it('envia o número de clientes ao criar sessão', () => {
    createSession('mesa', 4);
    expect(apiFetch).toHaveBeenCalledWith(
      '/client/tables/mesa/session',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ num_clients: 4 }) }),
    );
  });
  it('consulta o estado da sessao com o token do dispositivo', () => {
    getSessionState('mesa', 12, 'device-token');

    expect(apiFetch).toHaveBeenCalledWith(
      '/client/tables/mesa/sessions/12/state',
      expect.objectContaining({
        headers: { 'X-Device-Token': 'device-token' },
      }),
    );
  });
});
