// frontend/src/features/client/services/clientRealtime.ts

export type ClientRealtimeEvent =
  | {
      type: 'authenticated';
      guest_id: number;
    }
  | {
      type:
        | 'orders.changed'
        | 'service_requests.changed'
        | 'session.changed'
        | 'payment.completed'
        | 'menu.changed'
        | 'pong';
    };

// Builds the WebSocket URL for the client based on the provided table code and environment configuration
export function buildClientWebSocketUrl(tableCode: string): string {
  const normalizedTableCode = tableCode.trim();

  // Validate the table code and ensure it is not empty
  if (!normalizedTableCode) {
    throw new Error('O código da mesa é obrigatório');
  }

  // Retrieve the API base URL from environment variables
  const apiBaseUrl = import.meta.env.VITE_API_URL as string | undefined;

  // Validate that the API base URL is configured
  if (!apiBaseUrl) {
    throw new Error('VITE_API_URL não está configurado');
  }

  // Create the WebSocket URL based on the API base URL and the normalized table code
  const websocketUrl = createWebSocketBaseUrl(apiBaseUrl);

  websocketUrl.pathname = [
    websocketUrl.pathname.replace(/\/+$/, ''),
    'client',
    'tables',
    encodeURIComponent(normalizedTableCode),
    'ws',
  ].join('/');

  // Clear any search parameters and hash fragments to ensure a clean WebSocket URL
  websocketUrl.search = '';
  websocketUrl.hash = '';

  return websocketUrl.toString();
}

// Parses a raw WebSocket message string into a ClientRealtimeEvent object, returning null for invalid messages
export function parseClientRealtimeEvent(rawMessage: string): ClientRealtimeEvent | null {
  try {
    // Attempt to parse the raw message as JSON
    const value: unknown = JSON.parse(rawMessage);

    // Validate that the parsed value is an object and has a valid type
    if (!isRecord(value) || typeof value.type !== 'string') {
      return null;
    }

    // Handle different event types and validate their specific properties
    switch (value.type) {
      // Handle the 'authenticated' event type, ensuring the guest_id is valid
      case 'authenticated':
        if (!isValidGuestId(value.guest_id)) {
          return null;
        }

        return {
          type: 'authenticated',
          guest_id: value.guest_id,
        };

      // Handle other event types that do not require additional properties
      case 'orders.changed':
      case 'service_requests.changed':
      case 'session.changed':
      case 'payment.completed':
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

// Creates a WebSocket base URL from the provided API base URL, ensuring the protocol is valid for WebSocket connections
function createWebSocketBaseUrl(apiBaseUrl: string): URL {
  let url: URL;

  // Attempt to create a URL object from the API base URL, throwing an error for invalid URLs
  try {
    url = apiBaseUrl.startsWith('/')
      ? new URL(apiBaseUrl, window.location.origin)
      : new URL(apiBaseUrl);
  } catch {
    throw new Error('VITE_API_URL contém um URL inválido');
  }

  // Convert the HTTP/HTTPS protocol to the corresponding WebSocket protocol (ws/wss)
  if (url.protocol === 'http:') {
    url.protocol = 'ws:';
  } else if (url.protocol === 'https:') {
    url.protocol = 'wss:';
  } else {
    throw new Error('VITE_API_URL deve utilizar o protocolo HTTP ou HTTPS');
  }

  return url;
}

// Checks if a value is a plain object (Record<string, unknown>), excluding arrays and null
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Validates if a value is a valid guest ID, which must be a positive safe integer
function isValidGuestId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}
