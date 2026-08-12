import type { TicketUrgency } from '../components/ticket-card/TicketCard.types';

// Overridable per Vite mode (e.g. frontend/.env.presentation) so a live
// demo can shorten these without touching the real dev/prod defaults --
// see VITE_KITCHEN_WARNING_MINUTES / VITE_KITCHEN_DANGER_MINUTES.
const WARNING_THRESHOLD_MINUTES = Number(import.meta.env.VITE_KITCHEN_WARNING_MINUTES) || 10;
const DANGER_THRESHOLD_MINUTES = Number(import.meta.env.VITE_KITCHEN_DANGER_MINUTES) || 20;

const URGENCY_RANK: Record<TicketUrgency, number> = {
  danger: 2,
  warning: 1,
  normal: 0,
};

export function getElapsedMinutes(createdAt: string, now: Date = new Date()): number {
  const createdAtDate = new Date(createdAt);
  if (Number.isNaN(createdAtDate.getTime())) return 0;

  return Math.max(0, Math.floor((now.getTime() - createdAtDate.getTime()) / 60_000));
}

export function getTicketUrgency(elapsedMinutes: number): TicketUrgency {
  if (elapsedMinutes >= DANGER_THRESHOLD_MINUTES) return 'danger';
  if (elapsedMinutes >= WARNING_THRESHOLD_MINUTES) return 'warning';
  return 'normal';
}

type UrgencySortable = { order_id: number; created_at: string };

export function sortTicketsByUrgency<T extends UrgencySortable>(
  tickets: T[],
  now: Date = new Date(),
): T[] {
  return [...tickets].sort((a, b) => {
    const rankA = URGENCY_RANK[getTicketUrgency(getElapsedMinutes(a.created_at, now))];
    const rankB = URGENCY_RANK[getTicketUrgency(getElapsedMinutes(b.created_at, now))];
    if (rankA !== rankB) return rankB - rankA; // higher urgency first

    const createdAtDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (createdAtDiff !== 0) return createdAtDiff; // older first

    return a.order_id - b.order_id; // stable tie-breaker
  });
}
