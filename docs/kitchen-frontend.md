# Kitchen Frontend — Live Ticket Board

This document explains how the kitchen's live ticket board works on the frontend: how data gets from the backend to the screen, how it's split into columns, how status updates are sent, and how the pieces fit together. If you're extending the board (filters, search, notifications) or swapping polling for websockets, read this first.

**Scope:** this covers getting real tickets onto the board, splitting them into per-status fragments, sorting by urgency, updating an item's status, and the cancellation toast. It does **not** cover: station filter, search, the fuller notification system (sound/badges), `KitchenHistoryPage`/`KitchenSettingsPage` content, or any special treatment for the `Returned` item status.

## The short version

- `KitchenPage` fetches tickets via `useKitchenTickets`, splits them into per-column **fragments** with `groupTicketsByColumn`, and renders three `KitchenColumn`s (Novos / Em preparação / Prontos).
- **The board is item-centric, not ticket-centric.** A round with items in different states (say, one `Pending`, one `Preparing`) shows up as two small cards, one per column — not one card sitting in a single "wrong-looking" column. See "Column bucketing" below for why.
- Data arrives by **polling** `GET /api/kitchen/tickets` every 10 seconds. This lives in its own hook (`useKitchenTicketsFeed`) specifically so it can be swapped for a websocket subscription later without touching anything else.
- Clicking an item's action button updates its status **optimistically** (the UI changes immediately, before the backend confirms) and reverts with a toast if the request fails.
- `Served` and `Returned` items simply vanish from the board the moment they reach that status. `Cancelled` items also vanish, but fire a toast first so the kitchen isn't left with zero signal (see "Terminal statuses" below).
- Fragments are sorted within each column by urgency (danger first), then oldest first.

## File map

| File | What it's for |
|---|---|
| `frontend/src/features/kitchen/utils/getTicketUrgency.ts` | `getElapsedMinutes`, `getTicketUrgency` (10 min → warning, 20 min → danger), `sortTicketsByUrgency<T>` (generic — sorts anything with `order_id`/`created_at`, used for both full tickets and fragments). Pure functions, no React. |
| `frontend/src/features/kitchen/utils/getTicketColumn.ts` | `TicketFragment` type, `groupTicketsByColumn` — splits each ticket into per-column fragments (buckets + sorts). Pure, no React. |
| `frontend/src/features/kitchen/hooks/useKitchenTicketsFeed.ts` | Transport layer — polling today. Fetches on mount, every 10s after, exposes `{ tickets, isLoading, error, refetch }`. |
| `frontend/src/features/kitchen/hooks/useKitchenTickets.ts` | Business logic on top of the feed — optimistic `updateStatus`, revert-on-failure, one-in-flight-mutation-per-item guard, stale-poll protection, the cancellation toast. |
| `frontend/src/features/kitchen/components/ticket-card/TicketCard.tsx` | Renders one fragment — a compact header (table/round/guest), an allergen banner scoped to *this fragment's* items, and each item with its own action button. |
| `frontend/src/features/kitchen/components/kitchen-column/KitchenColumn.tsx` | Renders a column's title + its `TicketCard`s (one per fragment), computing `elapsedMinutes`/`urgency` per fragment. |
| `frontend/src/features/kitchen/pages/KitchenPage.tsx` | Composes the three columns. Intentionally minimal — no styling/layout polish beyond the 3-column row. |

## Column bucketing: item-centric, not ticket-centric

**The unit that gets placed into a column is a `TicketFragment`, not a whole `KitchenTicket`.**

```ts
export type TicketFragment = {
  order_id: number;
  table_number: number;
  round_number: number;
  guest_number: number;
  created_at: string; // the round's created_at, shared by every fragment of it
  items: KitchenOrderItem[]; // only the items matching this fragment's column
};
```

`groupTicketsByColumn` walks every ticket and, for each of the three active statuses (`Pending`/`Preparing`/`Ready`), collects the items in that ticket matching that status into one fragment. A round with 3 items in 3 different active statuses produces **3 separate fragments**, one per column — never the same item in two places, never a card whose button contradicts the column it's sitting in. Items sharing a status within the same round stay together in one fragment (not split further).

This replaced an earlier ticket-centric model (a whole round moved into one column, chosen by priority across its items) specifically because that model could show a round sitting in "Preparing" while one of its own items still displayed a "Preparar" button.

Within a column, `sortTicketsByUrgency` orders fragments: urgency descending (danger, warning, normal) → oldest `created_at` first → `order_id` ascending as a final tie-breaker (keeps ordering stable across polls, no jitter). **Ordering is entirely per-column** — there's no cross-column priority; each of the three lists is sorted independently.

This depends on a backend guarantee: `GET /api/kitchen/tickets` never returns a ticket without at least one `Pending`/`Preparing`/`Ready` item (see `get_active_tickets` in `docs/kitchen-backend.md`) — so `groupTicketsByColumn` doesn't need its own defensive filtering for fully-terminal tickets.

## Terminal statuses: `Served` / `Cancelled` / `Returned`

None of the three columns can ever contain one of these — `groupTicketsByColumn` only ever produces `Pending`/`Preparing`/`Ready` fragments. What happens to an item when it reaches a terminal status:

| Status | Behavior |
|---|---|
| `Served` | Vanishes from the board immediately. No toast, no lingering card — kitchen has nothing left to do with it. |
| `Returned` | Same as `Served`. Not a built feature, just the natural consequence of not being one of the three active statuses. |
| `Cancelled` | Vanishes from the board too (there's no dismiss-button UI anymore — that whole mechanism was removed), but `useKitchenTickets` fires a toast the moment it detects the transition, so cancellations aren't silently invisible while the fuller notification system and order history remain unbuilt. |

The item still exists in the API response right up until it's excluded at the grouping step (the backend always returns every item of a round, regardless of status) — that's what makes the cancellation toast possible: `useKitchenTickets` sees the item with its name and table number one last time before it disappears.

## Why polling lives in its own hook

`useKitchenTicketsFeed` and `useKitchenTickets` are split specifically so that switching to websockets later only means rewriting `useKitchenTicketsFeed.ts`. As long as its return shape stays `{ tickets, isLoading, error, refetch }`, nothing else in the tree — `useKitchenTickets`, `groupTicketsByColumn`, `KitchenColumn`, `KitchenPage` — needs to change.

`useKitchenTicketsFeed` also protects itself against two easy-to-miss races:

- **Out-of-order responses.** A scheduled poll and a manual `refetch()` can overlap; if the older one resolves *after* the newer one, it must not overwrite the newer data. Guarded with an incrementing request id — only the response matching the latest issued request updates state.
- **Error spam.** A failed poll doesn't replace an already-set `error` with a new object on every consecutive failure — only the first failure (after a success) creates a new error, so a `useEffect` watching `error` (e.g., to show a toast) doesn't re-fire every 10 seconds while the backend is down.

## Optimistic updates

`useKitchenTickets.updateStatus(orderItemId, nextStatus)`:

1. Updates the item's status locally immediately.
2. Calls `kitchenService.updateItemStatus`.
3. On success: nothing else to do — the next poll confirms it.
4. On a `409` (another chef already changed it): reverts, shows a toast with the backend's message, and calls `feed.refetch()` immediately instead of waiting for the next scheduled poll.
5. On any other failure: reverts, shows a generic toast, no forced refetch.

Guards worth knowing about if you're touching this code:

- **One in-flight mutation per item.** If a chef clicks fast enough to fire a second `updateStatus` for the same item while the first request hasn't resolved yet, the second call is silently ignored (`pendingItemIdsRef`). No loading spinner on the button — it just won't double-submit.
- **Reverting never stomps fresher data.** If a poll lands between an optimistic update and its (failing) response, and that poll already shows the item further along (e.g., another chef advanced it too), the failed revert is skipped — it only restores `previousStatus` if the item is still sitting at the `nextStatus` this specific call set.
- **A stale poll can't flicker the UI back, but a genuinely newer one still wins.** A feed sync (poll/refetch) can resolve with a snapshot fetched *before* a click — still showing the old status — which would otherwise briefly flip the card back to its old column until a later poll corrects it. `useKitchenTickets` keeps a `pendingOptimisticStatusRef` map of `order_item_id → status` for every mutation currently in flight, and re-applies it on top of every incoming feed snapshot *unless* the incoming status is at or past the optimistic one in the natural order (`Pending < Preparing < Ready < any terminal status`, see `STATUS_RANK`). That comparison is the only way to tell "this poll predates my click" (behind → ignore it) from "this poll reflects something that actually happened after my click, e.g. another chef also touched it" (equal or ahead → let it win).

## Testing

Frontend testing uses **Vitest** + `@testing-library/react`. Run the suite:

```bash
cd frontend
npm run test        # single run
npm run test:watch  # watch mode
```

Notes if you're extending the hook tests:

- `useKitchenTicketsFeed`'s tests use `vi.useFakeTimers()`. **Don't use `vi.runOnlyPendingTimersAsync()`** to "just settle the current fetch" — it also fires the already-scheduled `setInterval`'s next tick (fake-timer "pending" means "scheduled", not "due now"), which silently doubles call counts. Use `vi.advanceTimersByTimeAsync(0)` to flush only the in-flight fetch, and `vi.advanceTimersByTimeAsync(intervalMs)` to simulate an elapsed poll cycle.
- Both hook test files call `vi.clearAllMocks()` in `beforeEach` — `vi.mock(...)`-based automocks keep call counts and queued `mockResolvedValueOnce`/`mockRejectedValueOnce` implementations across tests otherwise, which silently breaks assertions in later tests in the same file.
- `useKitchenTickets`'s tests mock `useKitchenTicketsFeed` directly (`vi.mock('./useKitchenTicketsFeed')`) rather than going through a real polling cycle — it's tested as a pure consumer of whatever the feed hands it. Simulate a poll landing mid-mutation by mutating the mock's returned `tickets` array and calling `rerender()` from `renderHook`.
- `getTicketColumn.test.ts` covers the fragment-splitting rules directly: same-round-different-status → separate fragments, same-round-same-status → one fragment, terminal items excluded from every column, a round with only terminal items produces no fragments anywhere.

`TicketCard`/`KitchenColumn`/`KitchenPage` have no dedicated unit tests (composition of already-tested pieces) — verify visually in the browser. `backend/app/db/seeds/order_items.py` (`python -m app.db.seeds.order_items`) seeds realistic multi-table, multi-status, multi-allergen test data for exactly this purpose — see that file's own docstring for what it covers and `--reset` to clear just its own data.

## What's explicitly out of scope (not built yet)

- Station filter, search.
- Notifications / sound toggle (the cancellation toast reuses the existing `useToast` primitive — it is not this system).
- Real content for `KitchenHistoryPage` / `KitchenSettingsPage`.
- Any special visual treatment for the `Returned` item status (it's simply never shown, same as `Served`).
- Buffet-aware urgency thresholds — `Guest.buffet_id` exists on the backend but isn't exposed on `KitchenTicketOut` yet.
- Board layout/styling polish beyond the 3-column row.
