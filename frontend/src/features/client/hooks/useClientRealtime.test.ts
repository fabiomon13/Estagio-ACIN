// frontend/src/features/client/hooks/useClientRealtime.test.ts

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../services/clientRealtime', () => ({
  buildClientWebSocketUrl: () => 'ws://test',
  parseClientRealtimeEvent: (raw: string) => JSON.parse(raw),
}));
vi.mock('../utils/deviceToken', () => ({ getDeviceToken: () => 'token' }));
import { useClientRealtime } from './useClientRealtime';

// lightweight WebSocket implementation used to drive connection events
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static OPEN = 1;
  static CLOSED = 3;
  readyState = 1;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  url: string;
  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }
  send(value: string) {
    this.sent.push(value);
  }
  close() {
    this.readyState = 3;
  }
}
// describe the test suite for realtime client updates
describe('useClientRealtime', () => {
  // install a fresh fake WebSocket before every test
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });
  afterEach(() => vi.unstubAllGlobals());
  // create independent callbacks for each hook render
  const callbacks = () => ({
    onOrdersChanged: vi.fn(),
    onServiceRequestsChanged: vi.fn(),
    onSessionChanged: vi.fn(),
    onPaymentCompleted: vi.fn(),
    onMenuChanged: vi.fn(),
    onReconnect: vi.fn(),
  });
  // test case to check if no socket is opened while realtime is disabled
  it('fica desativado quando não está habilitado', () => {
    const { result } = renderHook(() =>
      useClientRealtime({ tableCode: 'mesa', enabled: false, ...callbacks() }),
    );
    expect(result.current).toBe('disabled');
    expect(FakeWebSocket.instances).toHaveLength(0);
  });
  it('autentica e encaminha eventos', async () => {
    const cb = callbacks();
    const { result } = renderHook(() =>
      useClientRealtime({ tableCode: 'mesa', enabled: true, ...cb }),
    );
    const socket = FakeWebSocket.instances[0];
    act(() => socket.onopen?.());
    expect(JSON.parse(socket.sent[0])).toEqual({ type: 'authenticate', device_token: 'token' });
    act(() =>
      socket.onmessage?.(
        new MessageEvent('message', {
          data: JSON.stringify({ type: 'authenticated', guest_id: 1 }),
        }),
      ),
    );
    expect(result.current).toBe('connected');
    act(() =>
      socket.onmessage?.(
        new MessageEvent('message', { data: JSON.stringify({ type: 'orders.changed' }) }),
      ),
    );
    await waitFor(() => expect(cb.onOrdersChanged).toHaveBeenCalledOnce());

    act(() =>
      socket.onmessage?.(
        new MessageEvent('message', { data: JSON.stringify({ type: 'payment.completed' }) }),
      ),
    );
    await waitFor(() => expect(cb.onPaymentCompleted).toHaveBeenCalledOnce());
  });
  it('agrupa eventos repetidos recebidos no mesmo ciclo', async () => {
    const cb = callbacks();
    renderHook(() => useClientRealtime({ tableCode: 'mesa', enabled: true, ...cb }));
    const socket = FakeWebSocket.instances[0];

    act(() => {
      for (let index = 0; index < 3; index += 1) {
        socket.onmessage?.(
          new MessageEvent('message', { data: JSON.stringify({ type: 'orders.changed' }) }),
        );
      }
    });

    await waitFor(() => expect(cb.onOrdersChanged).toHaveBeenCalledOnce());
  });
  it('trata uma recusa de autenticação como erro', () => {
    const { result } = renderHook(() =>
      useClientRealtime({ tableCode: 'mesa', enabled: true, ...callbacks() }),
    );
    act(() => FakeWebSocket.instances[0].onclose?.({ code: 1008 } as CloseEvent));
    expect(result.current).toBe('error');
  });
});
// frontend/src/features/client/hooks/useClientRealtime.test.ts

// test case to check authentication and event forwarding
// test case to check authentication policy failures
