// frontend/src/features/client/services/clientRealtime.ts

export type ClientRealtimeEvent =
  | {
      type: 'authenticated';
      guest_id: number;
    }
  | {
      type: 'orders.changed';
    }
  | {
      type: 'service_requests.changed';
    }
  | {
      type: 'session.changed';
    }
  | {
      type: 'menu.changed';
    }
  | {
      type: 'pong';
    };

export function buildClientWebSocketUrl(tableCode: string): string {
  const apiBaseUrl = import.meta.env.VITE_API_URL as string | undefined;

  if (!apiBaseUrl) {
    throw new Error('VITE_API_URL não está configurado');
  }

  const websocketBaseUrl = apiBaseUrl.replace(/^http/, 'ws');

  return `${websocketBaseUrl}/client/tables/` + `${encodeURIComponent(tableCode)}/ws`;
}

export function parseClientRealtimeEvent(rawMessage: string): ClientRealtimeEvent | null {
  try {
    const value = JSON.parse(rawMessage) as unknown;

    if (
      typeof value !== 'object' ||
      value === null ||
      !('type' in value) ||
      typeof value.type !== 'string'
    ) {
      return null;
    }

    switch (value.type) {
      case 'authenticated':
        if (!('guest_id' in value) || typeof value.guest_id !== 'number') {
          return null;
        }

        return {
          type: 'authenticated',
          guest_id: value.guest_id,
        };

      case 'orders.changed':
      case 'service_requests.changed':
      case 'session.changed':
      case 'menu.changed':
      case 'pong':
        return {
          type: value.type,
        };

      default:
        return null;
    }
  } catch {
    return null;
  }
}
