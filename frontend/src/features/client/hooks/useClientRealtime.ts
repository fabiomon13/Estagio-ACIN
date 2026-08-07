// frontend/src/features/client/hooks/useClientRealtime.ts

import { useEffect, useRef, useState } from 'react';

import { CLIENT_REALTIME_MAX_RECONNECT_DELAY_MS } from '../clientConfig';
import { buildClientWebSocketUrl, parseClientRealtimeEvent } from '../services/clientRealtime';
import { getDeviceToken } from '../utils/deviceToken';

const INITIAL_RECONNECT_DELAY_MS = 1_000;
const HEARTBEAT_INTERVAL_MS = 25_000;

export type ClientRealtimeStatus =
  'disabled' | 'connecting' | 'connected' | 'reconnecting' | 'error';

type UseClientRealtimeOptions = {
  tableCode?: string;
  enabled: boolean;
  onOrdersChanged: () => void;
  onServiceRequestsChanged: () => void;
  onSessionChanged: () => void;
  onMenuChanged: () => void;
};

type RealtimeCallbacks = Pick<
  UseClientRealtimeOptions,
  'onOrdersChanged' | 'onServiceRequestsChanged' | 'onSessionChanged' | 'onMenuChanged'
>;

export function useClientRealtime({
  tableCode,
  enabled,
  onOrdersChanged,
  onServiceRequestsChanged,
  onSessionChanged,
  onMenuChanged,
}: UseClientRealtimeOptions): ClientRealtimeStatus {
  const [status, setStatus] = useState<ClientRealtimeStatus>(enabled ? 'connecting' : 'disabled');

  const callbacksRef = useRef<RealtimeCallbacks>({
    onOrdersChanged,
    onServiceRequestsChanged,
    onSessionChanged,
    onMenuChanged,
  });

  useEffect(() => {
    callbacksRef.current = {
      onOrdersChanged,
      onServiceRequestsChanged,
      onSessionChanged,
      onMenuChanged,
    };
  }, [onMenuChanged, onOrdersChanged, onServiceRequestsChanged, onSessionChanged]);

  useEffect(() => {
    if (!enabled || !tableCode) {
      const statusTimer = window.setTimeout(() => setStatus('disabled'), 0);

      return () => {
        window.clearTimeout(statusTimer);
      };
    }

    const activeTableCode = tableCode;

    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let heartbeatTimer: number | null = null;
    let reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
    let isActive = true;
    let hasConnected = false;

    function clearReconnectTimer(): void {
      if (reconnectTimer === null) {
        return;
      }

      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    function clearHeartbeat(): void {
      if (heartbeatTimer === null) {
        return;
      }

      window.clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    function scheduleReconnect(): void {
      if (!isActive || reconnectTimer !== null) {
        return;
      }

      setStatus('reconnecting');

      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        connect();

        reconnectDelay = Math.min(reconnectDelay * 2, CLIENT_REALTIME_MAX_RECONNECT_DELAY_MS);
      }, reconnectDelay);
    }

    function startHeartbeat(): void {
      clearHeartbeat();

      heartbeatTimer = window.setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(
            JSON.stringify({
              type: 'ping',
            }),
          );
        }
      }, HEARTBEAT_INTERVAL_MS);
    }

    function handleMessage(message: MessageEvent<string>): void {
      const event = parseClientRealtimeEvent(message.data);

      if (event === null) {
        return;
      }

      switch (event.type) {
        case 'authenticated':
          hasConnected = true;
          reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
          setStatus('connected');
          startHeartbeat();
          break;

        case 'orders.changed':
          callbacksRef.current.onOrdersChanged();
          break;

        case 'service_requests.changed':
          callbacksRef.current.onServiceRequestsChanged();
          break;

        case 'session.changed':
          callbacksRef.current.onSessionChanged();
          break;

        case 'menu.changed':
          callbacksRef.current.onMenuChanged();
          break;

        case 'pong':
          break;
      }
    }

    function connect(): void {
      if (!isActive) {
        return;
      }

      clearReconnectTimer();
      clearHeartbeat();

      setStatus(hasConnected ? 'reconnecting' : 'connecting');

      let websocketUrl: string;

      try {
        websocketUrl = buildClientWebSocketUrl(activeTableCode);
      } catch {
        setStatus('error');
        return;
      }

      socket = new WebSocket(websocketUrl);

      socket.onopen = () => {
        if (!isActive || socket?.readyState !== WebSocket.OPEN) {
          return;
        }

        socket.send(
          JSON.stringify({
            type: 'authenticate',
            device_token: getDeviceToken(),
          }),
        );
      };

      socket.onmessage = handleMessage;

      socket.onerror = () => {
        if (isActive) {
          setStatus('error');
        }
      };

      socket.onclose = (event) => {
        clearHeartbeat();

        if (!isActive) {
          return;
        }

        // 1008 significa que o backend recusou
        // a autenticação ou a política da ligação.
        if (event.code === 1008) {
          setStatus('error');
          return;
        }

        scheduleReconnect();
      };
    }

    connect();

    return () => {
      isActive = false;

      clearReconnectTimer();
      clearHeartbeat();

      if (socket && socket.readyState !== WebSocket.CLOSED) {
        socket.close(1000, 'Página desmontada');
      }
    };
  }, [enabled, tableCode]);

  return status;
}
