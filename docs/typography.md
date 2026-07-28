# Typography

Two typefaces, each with one job. Don't reach for a third without a real reason — and if you do, add it here.

| Role | Font | Where it applies |
|---|---|---|
| Display / titles | **Baloo Bhaijaan 2** | Automatic on every `<h1>` and `<h2>`. Anything else needs the `font-display` class explicitly. |
| Body / everything else | **Plus Jakarta Sans** | The app-wide default — set once on `<body>`, inherited by every other element. You never need to add a class for this. |

Both are self-hosted via [`@fontsource`](https://fontsource.org/) (`frontend/node_modules/@fontsource/...`), not loaded from Google's CDN — no external request, works offline.

## Where this is configured

`frontend/src/index.css`:

```css
@import '@fontsource/baloo-bhaijaan-2/600.css';
@import '@fontsource/baloo-bhaijaan-2/700.css';
@import '@fontsource/plus-jakarta-sans/400.css';
@import '@fontsource/plus-jakarta-sans/500.css';
@import '@fontsource/plus-jakarta-sans/600.css';
@import 'tailwindcss';

@theme {
  --font-display: 'Baloo Bhaijaan 2', sans-serif;
  --font-sans: 'Plus Jakarta Sans', sans-serif;
}
```

This is Tailwind v4's CSS-first config — there's no `tailwind.config.js`. Defining `--font-display` and `--font-sans` in `@theme` automatically creates the `font-display` and `font-sans` utility classes. Overriding `--font-sans` (Tailwind's own default-font variable) is what makes Plus Jakarta Sans the app-wide default without touching every component.

The `h1`/`h2` → Baloo rule lives further down in the same file:

```css
h1,
h2 {
  font-family: var(--font-display);
}
```

## Using it

**A normal heading** — nothing to do, it's automatic:
```tsx
<h1 className="text-4xl font-bold">Kitchen</h1>
```

**A large display title that isn't semantically an `<h1>`/`<h2>`** (e.g. a hero on a landing page) — add `font-display` by hand:
```tsx
<div className="font-display text-7xl font-bold">Scan & Serve</div>
```

**Everything else** (paragraphs, labels, buttons, table cells) — just write it, it already renders in Plus Jakarta Sans:
```tsx
<p className="text-sm">Table 7's order is ready.</p>
```

## Sizes and weights (Tailwind classes, standard)

- Size: `text-xs` `text-sm` `text-base` `text-lg` `text-xl` `text-2xl` `text-3xl` ... up to `text-9xl`. For anything bigger, an arbitrary value works: `text-[160px]`.
- Weight: `font-normal` `font-medium` `font-semibold` `font-bold` ...

## The one gotcha: only these weights are actually loaded

| Font | Loaded weights |
|---|---|
| Plus Jakarta Sans | 400 (`font-normal`), 500 (`font-medium`), 600 (`font-semibold`) |
| Baloo Bhaijaan 2 | 600 (`font-semibold`), 700 (`font-bold`) |

If you use a weight class that isn't in that list (e.g. `font-bold` on regular body text, or `font-normal` on an `<h1>`), the browser doesn't have that weight's actual font file — it fakes it (synthetic bold/thin), which looks noticeably worse than a real weight. Stick to the loaded weights above.

**Need a different weight?** It's a one-line addition, not a redesign — add an `@import` line for it in `index.css` (check available weights in `frontend/node_modules/@fontsource/<font>/`, e.g. `frontend/node_modules/@fontsource/plus-jakarta-sans/700.css`), then use the matching Tailwind class.
