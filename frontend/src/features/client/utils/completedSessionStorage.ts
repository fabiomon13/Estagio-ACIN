// Remembers which dining session this browser was part of, per table, so a
// page reload can tell "no active session" (guest paid, nothing to load)
// apart from "never had one" (fresh device) -- see useClientBootstrap.ts.
//
// Every place that can learn a session just completed (bootstrap re-detecting
// a stale one, the payment-completed WebSocket event, the completion poll)
// must clear this the same way -- otherwise a later reload finds the old
// session id again and reports "completed" a second time.

function storageKey(tableCode: string): string {
  return `client-session:${tableCode}`;
}

export function clearStoredSessionId(tableCode: string): void {
  sessionStorage.removeItem(storageKey(tableCode));
}

export function setStoredSessionId(tableCode: string, sessionId: number): void {
  sessionStorage.setItem(storageKey(tableCode), String(sessionId));
}

export function getStoredSessionId(tableCode: string): number | null {
  const raw = Number(sessionStorage.getItem(storageKey(tableCode)));
  return Number.isSafeInteger(raw) && raw > 0 ? raw : null;
}
