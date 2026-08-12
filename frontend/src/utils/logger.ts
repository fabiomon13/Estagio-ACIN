type LogDetails = Readonly<Record<string, unknown>>;

const LOG_PREFIX = '[Scan&Serve]';

function debug(message: string, details?: LogDetails): void {
  if (!import.meta.env.DEV) return;

  console.debug(LOG_PREFIX, message, details ?? '');
}

function warn(message: string, details?: LogDetails): void {
  if (!import.meta.env.DEV) return;

  console.warn(LOG_PREFIX, message, details ?? '');
}

function error(message: string, details?: LogDetails): void {
  console.error(LOG_PREFIX, message, details ?? '');
}

export const logger = Object.freeze({ debug, warn, error });
