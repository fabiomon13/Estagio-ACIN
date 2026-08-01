# Kitchen Notification Component — Design

## Context

`docs/kitchen-frontend.md` lists "Notifications / sound toggle" as explicitly out of scope for the current kitchen board. The cancellation toast (`useToast`) is a stand-in for that gap, not the real system.

We're building the real notification system step by step. **This spec covers only the first step: the presentational notification component itself**, plus a temporary way to preview it in the running kitchen board. It does not cover:

- A provider/queue that manages multiple notifications over time.
- Real event detection (new ticket arrived, item waiting too long).
- The sound toggle / `KitchenSettingsPage` wiring.

Those are separate future steps, each to be brainstormed and planned on their own.

## Component: `KitchenNotification`

**Location:** `frontend/src/features/kitchen/components/kitchen-notification/`
- `KitchenNotification.tsx`
- `KitchenNotification.types.ts`
- `KitchenNotification.styles.ts`

This mirrors the existing `ticket-card/` and `kitchen-column/` folder pattern. It lives under `features/kitchen/components/`, not `components/ui/`, per explicit direction — this is a kitchen-specific piece, not a generic cross-app primitive like `Toast`/`Alert`.

### Props

```ts
export type KitchenNotificationVariant = 'info' | 'warning' | 'danger';

export type KitchenNotificationProps = {
  variant: KitchenNotificationVariant;
  message: string;
  icon: ReactNode;
  onDismiss?: () => void;
};
```

- `variant` reuses the color vocabulary already established by `Badge` and `TicketCard`'s urgency levels (`info`/`warning`/`danger`), so a "new ticket" notification and a "this item is late" notification are visually consistent with the rest of the board without inventing a new palette.
- `icon` is passed in by the caller (same convention as `Toast`, which doesn't hardcode icons) — this component doesn't know about specific kitchen events yet.
- `onDismiss` is optional; the close button (`CloseIcon`) only renders when it's provided.

### Visual design

- Compact card: `rounded-lg`, `bg-surface-raised`, a colored left accent matching `variant` (same visual language as `TicketCard`'s `border-l-4 border-{urgency}/80`).
- Layout: icon on the left, message in the middle, close button on the right (present only if `onDismiss` is passed).
- No fixed/absolute positioning inside the component — whoever renders it (today: `KitchenPage` directly; later: a provider) is responsible for placement on screen. This mirrors how `Toast` (the component) stays position-agnostic and `ToastProvider` owns the `fixed` wrapper.

### Testing

Purely presentational, no state or effects — same as `TicketCard`, no dedicated unit test. Verified visually.

## Temporary preview wiring in `KitchenPage.tsx`

To see the component rendered in the real board (not a fixture), `KitchenPage` gets:

- A local `const [showTestNotification, setShowTestNotification] = useState(false)`.
- A button near the header (label: "Testar notificação") that toggles it.
- When `true`, renders one `<KitchenNotification variant="info" message="Nova ronda na mesa 5" icon={<...>} onDismiss={() => setShowTestNotification(false)} />` with hardcoded example data.

This wiring is explicitly temporary scaffolding for visual verification, not the real notification system — it will be replaced once event detection and the provider/queue exist. It stays inline in `KitchenPage.tsx` (no new hook/file) since it's throwaway.

## Out of scope (future steps)

- Notification provider/queue (multiple notifications stacking, auto-dismiss timing).
- Real event triggers (new ticket detected via poll diff, item aging past a threshold).
- Sound playback / mute toggle in `KitchenSettingsPage`.
- Removing the temporary test button once the real system lands.
