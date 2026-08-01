# Kitchen Notification Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the presentational `KitchenNotification` component and wire a temporary button into `KitchenPage` so it can be previewed live in the running board.

**Architecture:** A single stateless component (`KitchenNotification`) styled after the existing `TicketCard`/`Toast`/`Alert` file trio (`.tsx` + `.types.ts` + `.styles.ts`). No provider, no queue, no real event wiring — this plan's only consumer is a throwaway `useState` toggle + button inside `KitchenPage.tsx`, added purely so the component can be seen rendered in the actual app instead of just compiled in isolation.

**Tech Stack:** React + TypeScript, Tailwind utility classes (project's existing color tokens: `info`/`warning`/`danger`), Vite dev server for manual visual verification. No new dependencies.

## Global Constraints

- Component variant names must be exactly `'info' | 'warning' | 'danger'` (spec: reuse `Badge`/`TicketCard` color vocabulary, no new palette).
- Component lives under `frontend/src/features/kitchen/components/kitchen-notification/`, **not** `components/ui/` (explicit user direction, overriding the original brainstorm proposal).
- `icon` and `message` are caller-supplied props — the component must not hardcode any specific kitchen event or icon.
- `onDismiss` is optional; the close button only renders when it is passed.
- No dedicated unit test for this component — it's purely presentational with no state/effects/logic, same convention already documented for `TicketCard`/`KitchenColumn` in `docs/kitchen-frontend.md` ("no dedicated unit tests... verify visually in the browser"). Verification is manual, via the dev server.
- **Never run `git commit`.** The user's standing instruction is that commits only happen when explicitly requested, even though this plan's task template normally ends each task with a commit step — every "Commit" step below is replaced with an explicit stop-and-wait instead.
- The button/toggle added to `KitchenPage.tsx` is explicitly temporary scaffolding for visual verification, not production behavior — it will be removed once the real notification system (provider/queue + real event triggers) lands in a future plan.

---

### Task 1: Build the `KitchenNotification` component

**Files:**
- Create: `frontend/src/features/kitchen/components/kitchen-notification/KitchenNotification.types.ts`
- Create: `frontend/src/features/kitchen/components/kitchen-notification/KitchenNotification.styles.ts`
- Create: `frontend/src/features/kitchen/components/kitchen-notification/KitchenNotification.tsx`

**Interfaces:**
- Produces: `KitchenNotification` (default export, a React component), `KitchenNotificationProps`, `KitchenNotificationVariant` — all imported by Task 2 from `../components/kitchen-notification/KitchenNotification` (types re-exported from the same module path via `KitchenNotification.types.ts`).

- [ ] **Step 1: Create the types file**

`frontend/src/features/kitchen/components/kitchen-notification/KitchenNotification.types.ts`:

```ts
import type { ReactNode } from 'react';

export type KitchenNotificationVariant = 'info' | 'warning' | 'danger';

export type KitchenNotificationProps = {
  variant: KitchenNotificationVariant;
  message: string;
  icon: ReactNode;
  onDismiss?: () => void;
};
```

- [ ] **Step 2: Create the styles file**

`frontend/src/features/kitchen/components/kitchen-notification/KitchenNotification.styles.ts`:

```ts
import type { KitchenNotificationVariant } from './KitchenNotification.types';

export const baseStyles = [
  'flex w-full items-center gap-3',
  'rounded-lg border-l-4 bg-surface-raised p-4 shadow-md',
].join(' ');

export const variantBorderStyles: Record<KitchenNotificationVariant, string> = {
  info: 'border-info',
  warning: 'border-warning',
  danger: 'border-danger',
};

export const variantIconStyles: Record<KitchenNotificationVariant, string> = {
  info: 'text-info',
  warning: 'text-warning',
  danger: 'text-danger',
};

export const messageStyles = 'flex-1 text-sm text-content';

export const closeButtonStyles = [
  'shrink-0 rounded-md p-1 text-content-subtle',
  'opacity-70 transition-opacity hover:opacity-100',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current',
].join(' ');
```

This follows the same left-accent-border language `TicketCard.styles.ts` already uses for urgency (`border-l-4 border-{urgency}/80`), rather than `Toast`'s full-border/full-color-background treatment — per spec, this is a visually distinct component from `Toast`, and the message text stays neutral (`text-content`) instead of tinted, matching how `TicketCard` keeps `itemName` neutral while only the border/badges carry color.

- [ ] **Step 3: Create the component file**

`frontend/src/features/kitchen/components/kitchen-notification/KitchenNotification.tsx`:

```tsx
import { CloseIcon } from '../../../../components/icons';
import type { KitchenNotificationProps } from './KitchenNotification.types';
import {
  baseStyles,
  variantBorderStyles,
  variantIconStyles,
  messageStyles,
  closeButtonStyles,
} from './KitchenNotification.styles';

export default function KitchenNotification({
  variant,
  message,
  icon,
  onDismiss,
}: KitchenNotificationProps) {
  return (
    <div role="status" className={`${baseStyles} ${variantBorderStyles[variant]}`}>
      <span className={variantIconStyles[variant]}>{icon}</span>

      <p className={messageStyles}>{message}</p>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className={closeButtonStyles}
        >
          <CloseIcon size={16} />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors. If there are import-path errors, double check the relative path depth — `kitchen-notification/` sits at the same depth as `ticket-card/` under `features/kitchen/components/`, so `../../../../components/icons` is correct (four levels up: `kitchen-notification` → `components` → `kitchen` → `features` → `src`).

- [ ] **Step 5: Stop — do not commit**

Per the user's standing instruction, do not run `git commit` here. Leave the three new files unstaged and move on to Task 2; committing (if ever) happens only when the user explicitly asks.

---

### Task 2: Wire a temporary preview button into `KitchenPage`

**Files:**
- Modify: `frontend/src/features/kitchen/pages/KitchenPage.tsx`

**Interfaces:**
- Consumes: `KitchenNotification` component from Task 1 — `import KitchenNotification from '../components/kitchen-notification/KitchenNotification'` (relative to `pages/KitchenPage.tsx`, `components/kitchen-notification/` is a sibling of `pages/` under `features/kitchen/`). Props used: `variant="info"`, `message: string`, `icon: ReactNode`, `onDismiss: () => void`.
- Consumes: existing `Button` from `frontend/src/components/ui/button/Button.tsx` (`variant` prop accepts `'secondary'`, `size` accepts `'sm'`, per `Button.types.ts`).
- Consumes: existing `PlusIcon` from `frontend/src/components/icons` (accepts `size` prop, per `Icon.types.ts`).

Current relevant section of `KitchenPage.tsx` (for exact anchor points):

```tsx
import { useState } from 'react';
import { groupTicketsByColumn } from '../utils/getTicketColumn';
import { filterFragments } from '../utils/filterFragments';
import { useKitchenTickets } from '../hooks/useKitchenTickets';
import KitchenColumn from '../components/kitchen-column/KitchenColumn';
import Loader from '../../../components/ui/loader/Loader';
import SearchInput from '../../../components/ui/search-input/SearchInput';
import Dropdown from '../../../components/ui/dropdown/Dropdown';
import { getStationColor, STATION_NAMES } from '../../../utils/getStationColor';
import { useNow } from '../../../hooks/useNow';
```

and the header's JSX:

```tsx
      <header className="flex justify-between pb-10 items-center">
        <div className="flex gap-4 w-[70%]">
          <div className="w-[40%]">
            <SearchInput
              placeholder='Procurar por messa ou item'
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClear={() => setSearch('')}
            />
          </div>
          <div className='w-[25%]'>

          <Dropdown
            value={stationFilter}
            onChange={setStationFilter}
            options={stationOptions}
            placeholder="Todas as estações"
          />
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-content text-2xl">{timeFormatter.format(now)}</h1>
          <span className="text-md text-content-subtle capitalize">{dateFormatter.format(now)}</span>
        </div>
      </header>
```

- [ ] **Step 1: Add the new imports**

At the top of `KitchenPage.tsx`, add these three imports (alongside the existing ones):

```tsx
import KitchenNotification from '../components/kitchen-notification/KitchenNotification';
import Button from '../../../components/ui/button/Button';
import { PlusIcon } from '../../../components/icons';
```

- [ ] **Step 2: Add the toggle state**

Inside the `KitchenPage` function body, alongside the existing `search`/`stationFilter` state:

```tsx
const [showTestNotification, setShowTestNotification] = useState(false);
```

- [ ] **Step 3: Add the test button to the header**

Inside the header's left `<div className="flex gap-4 w-[70%]">`, after the station `Dropdown`'s wrapping `<div>`, add:

```tsx
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowTestNotification((prev) => !prev)}
          >
            Testar notificação
          </Button>
```

- [ ] **Step 4: Render the notification when toggled on**

Immediately after the `</header>` closing tag (before the `<section>` with the columns), add:

```tsx
      {showTestNotification && (
        <div className="px-5 pb-5">
          <KitchenNotification
            variant="info"
            message="Nova ronda na mesa 5"
            icon={<PlusIcon size={16} />}
            onDismiss={() => setShowTestNotification(false)}
          />
        </div>
      )}
```

- [ ] **Step 5: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Run the existing test suite**

Run: `cd frontend && npm run test -- --run`
Expected: all currently-passing tests (39, as of this plan) still pass — this change doesn't touch any tested logic (`useKitchenTickets`, `useKitchenTicketsFeed`, `getTicketColumn`, `filterFragments`), only `KitchenPage.tsx`'s JSX, which has no dedicated tests.

- [ ] **Step 7: Manually verify in the browser**

Run: `cd frontend && npm run dev`, open the kitchen page.
Expected:
- A "Testar notificação" button appears in the header, next to the search bar and station dropdown.
- Clicking it shows a notification card below the header: a left blue (`info`) accent border, a plus icon in blue, the text "Nova ronda na mesa 5" in normal (non-tinted) text, and a close (×) button on the right.
- Clicking the close button hides the notification.
- Clicking "Testar notificação" again toggles it back on.

- [ ] **Step 8: Stop — do not commit**

Per the user's standing instruction, do not run `git commit` here. Leave the changes unstaged; committing (if ever) happens only when the user explicitly asks.
