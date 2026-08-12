// frontend/src/features/client/services/clientRealtime.test.ts

import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildClientWebSocketUrl, parseClientRealtimeEvent } from './clientRealtime';

// describe the test suite for the shared client realtime helpers
describe('buildClientWebSocketUrl', () => {
  afterEach(() => vi.unstubAllEnvs());

  // test case to check if HTTP URLs are converted to WebSocket URLs and preserve the API prefix
  it('converte HTTP em WebSocket e preserva o prefixo da API', () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8000/api/');

    expect(buildClientWebSocketUrl(' mesa 01 ')).toBe(
      'ws://localhost:8000/api/client/tables/mesa%2001/ws',
    );
  });

  // test case to check if HTTPS URLs are converted to secure WebSocket URLs and remove query/hash
  it('converte HTTPS em WebSocket seguro e remove query/hash', () => {
    vi.stubEnv('VITE_API_URL', 'https://example.test/api?token=bad#fragment');

    expect(buildClientWebSocketUrl('mesa')).toBe('wss://example.test/api/client/tables/mesa/ws');
  });

  it('resolve um caminho relativo usando a origem atual', () => {
    vi.stubEnv('VITE_API_URL', '/api');

    expect(buildClientWebSocketUrl('mesa')).toBe(
      `${window.location.origin.replace(/^http/, 'ws')}/api/client/tables/mesa/ws`,
    );
  });

  // test case to check if empty table codes, missing configuration, invalid URLs, and insecure protocols are rejected
  it('rejeita código vazio, configuração ausente, URL inválido e protocolo inseguro', () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8000/api');
    expect(() => buildClientWebSocketUrl('  ')).toThrow(/mesa/i);

    vi.stubEnv('VITE_API_URL', '');
    expect(() => buildClientWebSocketUrl('mesa')).toThrow(/VITE_API_URL/);

    vi.stubEnv('VITE_API_URL', 'não-é-url');
    expect(() => buildClientWebSocketUrl('mesa')).toThrow(/inválido/i);

    vi.stubEnv('VITE_API_URL', 'ftp://example.test/api');
    expect(() => buildClientWebSocketUrl('mesa')).toThrow(/HTTP ou HTTPS/i);
  });
});

// describe the test suite for parsing client realtime events
describe('parseClientRealtimeEvent', () => {
  // test case to check if valid event types are accepted and parsed correctly
  it.each([
    'orders.changed',
    'service_requests.changed',
    'session.changed',
    'menu.changed',
    'pong',
  ] as const)('aceita o evento %s', (type) => {
    expect(parseClientRealtimeEvent(JSON.stringify({ type, ignored: true }))).toEqual({ type });
  });

  // test case to check if authentication events are accepted only with a positive safe integer guest_id
  it('aceita autenticação apenas com um guest_id inteiro positivo e seguro', () => {
    expect(parseClientRealtimeEvent('{"type":"authenticated","guest_id":7}')).toEqual({
      type: 'authenticated',
      guest_id: 7,
    });

    for (const guestId of [0, -1, 1.5, '1', Number.MAX_SAFE_INTEGER + 1, null]) {
      expect(
        parseClientRealtimeEvent(JSON.stringify({ type: 'authenticated', guest_id: guestId })),
      ).toBeNull();
    }
  });

  // test case to check if invalid messages are ignored and return null
  it.each(['not-json', 'null', '[]', '{}', '{"type":1}', '{"type":"unknown"}'])(
    'ignora mensagens inválidas: %s',
    (message) => {
      expect(parseClientRealtimeEvent(message)).toBeNull();
    },
  );
});
