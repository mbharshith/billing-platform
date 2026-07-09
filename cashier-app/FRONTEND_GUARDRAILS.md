# Frontend Guardrails — cashier-app

> **The rulebook for THIS codebase.**
>
> The repo-root `GUARDRAILS.md` is the generic full-stack rulebook. This
> file is the sharp, project-specific subset that actually mirrors the
> patterns we ship here. Read once, reference forever.
>
> - **RULE**      hard requirement. Violate -> revert.
> - **GUIDELINE** strong default. Violate -> justify in the commit message.
> - **SHOULD**    best practice. Violate -> note in code review.

Stack: React 18 + TypeScript 5 (strict) + Vite 5 + Dexie 4 + react-router 6.
No backend yet. IndexedDB is the source of truth. WCAG 2.2 AA is mandatory
 standard). Bundle target: sub-app chunks stay under 20 KB gzip.

---

## Table of Contents

1. Architecture (shell + sub-apps)
2. Brand & Theming
3. Fixtures Isolation
4. Multi-Tenancy
5. Data Layer (Dexie)
6. Components & CSS
7. Routing
8. TypeScript
9. State & Contexts
10. Performance
11. Accessibility (WCAG 2.2 AA)
12. Error Handling
13. File & Folder Layout
14. Git & Commit Style
15. Anti-Patterns

---

## 1. Architecture — shell + sub-apps

The app is a micro-frontend split into one **shell** and N **sub-apps**,
each `React.lazy()`-loaded so Vite emits per-app chunks.

```
src/
  shell/         host: router, guards, providers, login
  apps/
    counter/     admin + cashier POS
    vendor/      SaaS-owner control plane
    storefront/  customer-facing (Phase 1 stub)
  shared/        atoms, molecules, organisms, feedback, errors, templates,
                 domain, hooks, lib, store, brand.ts
  styles/        theme.css, tokens.css, globals.css
```

- **RULE** `Shell.tsx` is the ONLY `<BrowserRouter>` in the app. Sub-apps
  export a `<Routes>` tree with relative paths (no leading `/`).
- **RULE** Sub-apps are mounted via `lazy(() => import('@apps/x/XApp'))`.
  Never static-import a sub-app from the shell.
- **RULE** Every sub-app must be wrapped in `<ErrorBoundary>` and
  `<Suspense fallback={...}>` at the shell mount site (see the `SubApp`
  helper in `Shell.tsx`). One sub-app crashing must never blank another.
- **RULE** Sub-apps NEVER import from each other. Cross-cutting logic
  lives in `@shared/*`. If two sub-apps need the same thing, promote it.
- **RULE** Path aliases only. No `../../../` climbing. Aliases:
  `@shell/*`, `@apps/*`, `@shared/*`, `@styles/*`.
- **GUIDELINE** Adding a new sub-app must be a 3-line change to
  `Shell.tsx` plus a new folder under `apps/`. If it's more, the shell
  has grown a responsibility that belongs elsewhere.

---

## 2. Brand & Theming

Rebranding must be a two-file change: text lives in one place, visuals
live in one place.

- **RULE** All product-name/tagline text comes from `@shared/brand`.
  Never hard-code `"QuickBill"`, `"Cashier POS"`, etc. in a component.
- **RULE** All brand colors, accents, fonts live in `styles/theme.css` as
  `--brand-*` primitives. Never define a color inline (`color: '#hex'`)
  in JSX or another CSS file.
- **RULE** Components read only semantic tokens (`--app-*`), NEVER
  `--brand-*` directly. `tokens.css` is the aliasing layer between the
  two — that's the whole point of the indirection.
- **GUIDELINE** New design token? Add `--app-<name>` to `tokens.css`
  pointing at the appropriate `--brand-*` primitive. If a component wants
  a fixed value not tied to the brand, that's a code smell — get the
  design system a real name for it first.
- **RULE** Dark mode is switched by setting `data-theme="dark"` on the
  root, not by conditional class names in every component. See
  `shared/lib/theme.ts`.

---

## 3. Fixtures Isolation

All fabricated demo data lives in ONE folder: `src/shared/fixtures/`.

- **RULE** Only THREE files may import from `@shared/fixtures`:
  1. `shared/lib/db-bootstrap.ts` (first-run seed)
  2. `shared/store/SalesContext.tsx` (empty-list back-seed)
  3. `shared/store/SettingsContext.tsx` (reset action)
  A grep for `'@shared/fixtures'` must return exactly 3 code hits + at
  most 1 doc-comment reference. If your PR touches this, justify it.
- **RULE** No fixture data outside `fixtures/`. If you're tempted to
  hard-code a `SEED_*` list somewhere, either move it here or make it a
  real domain constant (enum, not sample data).
- **GUIDELINE** Fixtures must remain deterministic — `sales.ts` uses a
  seeded PRNG so demos are reproducible.
- **SHOULD** When the backend goes live, this folder is deleted with a
  single `rm -rf`. Keep it that easy. See `fixtures/README.md`.

---

## 4. Multi-Tenancy

Every persisted row belongs to exactly one tenant. Cross-tenant leaks
are the #1 SaaS bug class — treat them as P0.

- **RULE** Every domain entity carries `storeId: string`. Never write a
  row without one. `db-bootstrap.ts` has a `backfillStoreId()` helper for
  legacy rows — do not remove.
- **RULE** Every Dexie query in a tenant-scoped context must filter by
  `useCurrentStoreId()`. Never `.toArray()` the whole table without a
  store filter, even in dev.
- **RULE** The vendor role uses the `VENDOR_SCOPE` sentinel as `storeId`.
  Vendor-only reads MUST use `useAuth().isVendor` before dropping the
  storeId filter.
- **RULE** Currency and tax rate come from the current `Store` row, not
  from a global constant. Use `useMoney()` and read `store.taxRate` —
  never assume USD or 8.25%.
- **GUIDELINE** When adding a new persisted entity, add a `[storeId+x]`
  compound index to Dexie's schema. Uniqueness invariants (SKU, mobile)
  must be per-tenant, not global.

---

## 5. Data Layer (Dexie)

- **RULE** Reads use `useLiveQuery(...)`. Never call `db.<table>.toArray()`
  in a component effect and stash it in `useState` — the UI won't refresh
  when another tab writes.
- **RULE** Writes are `async` and go through the appropriate context
  (`useProducts().add()`, `useCustomers().save()`, etc.), never direct
  `db.<table>.put()` from a page.
- **RULE** Multi-row writes go inside `db.transaction('rw', [...], async () => { ... })`.
  A crash mid-write must leave the DB either fully applied or fully
  rolled back.
- **GUIDELINE** Schema changes bump the Dexie version number AND ship a
  migration function. Never mutate an existing version's stores.
- **RULE** `localStorage` is reserved for exactly two things:
  1. `settings::*` — StoreSettings JSON (tiny, no watchers needed)
  2. `session::*` — the current-user session pointer
  Anything else goes in IndexedDB.

---

## 6. Components & CSS

Atomic design hierarchy, one-way dependency arrow: atoms -> molecules ->
organisms -> templates -> pages.

- **RULE** Atoms are stateless, primitive, and depend on nothing but React
  and CSS modules. Never import a domain type or context into an atom.
- **RULE** Molecules compose atoms. Organisms compose molecules + atoms.
  Reverse imports (atom importing organism) are a hard revert.
- **RULE** Styling is CSS Modules only. No inline styles for anything
  more than positioning primitives (`display`, `padding`, `gap`). No
  `styled-components`, no Tailwind classes, no emotion.
- **RULE** CSS module class names use camelCase (`cls.emptyState`), not
  kebab-case, because TypeScript autocomplete depends on it.
- **RULE** No new UI text hard-coded in JSX. Add it to
  `@shared/domain/strings.ts` first. Rebranding + i18n later is worth the
  30-second detour today.
- **GUIDELINE** A component file over 300 lines wants splitting. Over
  600 lines is a hard limit (Code Puppy rule).
- **SHOULD** Prefer composition to configuration. If a component grows a
  fourth boolean prop, it's probably two components.

---

## 7. Routing

- **RULE** Only the shell owns `<BrowserRouter>`. Sub-apps only ever use
  `<Routes>` with paths relative to their mount point (`path="cashier"`,
  not `path="/cashier"`).
- **RULE** Auth + role checks live in shell guards (`ProtectedRoute`,
  `AdminRoute`, `VendorRoute`). Sub-apps use `AdminRoute` for finer
  refinement inside their own tree — never re-implement role logic in a
  page.
- **RULE** Every route element is wrapped in `<ErrorBoundary label="...">`
  via the `R()` helper in each sub-app router. Boundary label = route
  name, for observability.
- **RULE** Unknown routes render `<NotFoundPage />`, never a silent
  redirect. Broken bookmarks should be obvious to the user.
- **GUIDELINE** New route? Add it inside the appropriate sub-app router,
  not in `Shell.tsx`. The shell only knows about sub-app mount points.

---

## 8. TypeScript

`tsconfig.json` has `strict`, `noUnusedLocals`, `noUnusedParameters`,
`noFallthroughCasesInSwitch`. All enabled. All non-negotiable.

- **RULE** No `any`. If TypeScript can't infer it, name the type. `unknown`
  is fine when the source truly is untyped (external JSON, `window.*`);
  narrow it explicitly at the boundary.
- **RULE** All domain types in `@shared/domain/types.ts` use `readonly`
  wherever the value must not mutate after construction (list props,
  seed arrays, config objects).
- **RULE** Discriminated unions over string flags. `UserRole`,
  `PaymentMethod`, `SaleStatus` — all string literal unions, never
  freeform strings.
- **RULE** Public exports are typed explicitly. `export const foo: Foo`
  not `export const foo` (inference is allowed inside a module, but the
  public surface is documentation).
- **GUIDELINE** Prefer type aliases (`type X = ...`) over `interface`
  unless the type is meant to be extended from user code (it isn't,
  usually). Zen of Python: "There should be one obvious way to do it."

---

## 9. State & Contexts

- **RULE** One context per domain slice. Nine contexts today: Auth,
  Users, Stores, Products, Customers, Sales, Settings, Audit, Toast.
  Add a tenth only if you have a genuinely new slice — don't split by
  page.
- **RULE** Context provider order is defined in `shell/RootProvider.tsx`
  and matters: `Users + Stores > Auth > Products/Customers/Sales`. New
  providers must document their placement rationale in comments.
- **RULE** Contexts expose the smallest surface possible: derived
  selectors + action functions, never the raw Dexie table or query
  handle.
- **RULE** Provider values are memoized (`useMemo`) so consumers don't
  re-render on unrelated state changes.
- **GUIDELINE** No global stores (Redux, Zustand, etc.) until we hit a
  real performance ceiling. React context + `useLiveQuery` is enough for
  a client-only SaaS at this scale — YAGNI.

---

## 10. Performance

- **RULE** Sub-apps are lazy-loaded. Never `import { XApp } from '@apps/x'`
  in the shell — always `lazy(() => import('@apps/x/XApp'))`.
- **RULE** Expensive derivations (sorting, aggregating sales) go inside
  `useMemo` keyed on the input array reference, not on JSON.stringify.
- **RULE** Event handlers passed as props to memoized children use
  `useCallback` with the minimal dep list.
- **RULE** Lists of >50 rows must use `React.memo` on the row component
  OR virtualize. Whichever fits — but don't render 500 uncontrolled
  organisms.
- **GUIDELINE** Bundle budget: `index-*.js` (shell + shared) <= 120 KB
  gzip. Each sub-app chunk <= 20 KB gzip (storefront especially — it
  runs on customer phones). Verify with `npm run build` before shipping
  a big feature.
- **SHOULD** No new production dependency without a bundle-size check.
  100 KB from a library that gives us 3 lines of value fails the taste
  test.

---

## 11. Accessibility (WCAG 2.2 AA)

- **RULE** Every interactive element is keyboard-reachable and has a
  visible focus indicator. Tab order matches visual order.
- **RULE** Color contrast: text >= 4.5:1, large text >= 3:1, non-text UI
  (icons, borders) >= 3:1. Test both light and dark modes. `cp_colors`
  skill has the palette + verified pairings.
- **RULE** Icons that convey meaning have an `aria-label` or a visible
  text label next to them. Decorative icons get `aria-hidden="true"`.
- **RULE** Form inputs are paired with a `<label>` (visible or `sr-only`),
  never just a placeholder.
- **RULE** Touch targets on mobile >= 44x44 px (WCAG 2.5.5). Verify on the
  smallest viewport we support (390x844).
- **RULE** Motion respects `prefers-reduced-motion`. Our `tokens.css`
  already handles the media query — new animations must use the
  `--app-motion-*` tokens, not raw `transition:` values.
- **GUIDELINE** Modals trap focus, close on Escape, and return focus to
  the invoking element on dismiss. Announce with `role="dialog"` +
  `aria-labelledby`.

---

## 12. Error Handling

- **RULE** Every route is wrapped in `<ErrorBoundary label="...">`. A
  page throwing does not blank the app.
- **RULE** Every async operation that touches Dexie or `fetch` is inside
  `try/catch` (or `.then/.catch`) with a `useToast()` error surface. No
  silent failures.
- **RULE** No `alert()`, no `confirm()`. Use the Toast + Modal molecules.
- **RULE** `window.onerror` and `unhandledrejection` handlers in
  `main.tsx` are the last line of defense — log to console with a `[tag]`
  prefix. Never remove them.
- **GUIDELINE** Boot-time failures (IDB unavailable, private mode) render
  `<AppSplash state="failed" onRetry={...} />`, never a blank page.

---

## 13. File & Folder Layout

- **RULE** Kebab-case for CSS module files (`layout.module.css`),
  PascalCase for React component files (`CashierPage.tsx`), camelCase
  for everything else (`useMoney.ts`, `dateRange.ts`).
- **RULE** One React component per file. Two if the second is a private
  sub-component only used by the first (mark it with a comment).
- **RULE** No file over 600 lines. Split cohesively (by responsibility),
  not arbitrarily (by line count).
- **RULE** Directory names are lowercase, no dashes: `atoms/`,
  `molecules/`, not `ui-atoms/`.
- **GUIDELINE** Sibling files stay small and focused. If `X.tsx` grows
  a `X.helpers.ts` and a `X.types.ts`, make it a folder `X/` with
  `X/index.tsx`, `X/helpers.ts`, `X/types.ts`.

---

## 14. Git & Commit Style

- **RULE** Commit message subject: `<type>(<scope>): <what>`. Types:
  `feat`, `fix`, `refactor`, `chore`, `docs`, `perf`, `a11y`, `test`.
- **RULE** Commit body explains WHY. Anyone can read the diff to see WHAT.
  A commit with no body better be a trivial typo.
- **RULE** No emoji in commit messages or file writes. Local guardrail
  (`emoji_filter`) enforces this on tool output.
- **RULE** `git mv` for renames. Preserve history so `git log --follow`
  works on the destination.
- **GUIDELINE** Small commits. If your commit changes >500 lines across
  >10 files, it's probably two commits.
- **GUIDELINE** Never `git push --force` on main. Never rewrite history
  someone else has pulled.
- **GUIDELINE** Commit often. `git` is our time machine — a broken
  intermediate state is fine as long as it's reachable.

---

## 15. Anti-Patterns (never do these)

- Hard-coding a brand name, logo path, or product string.
- Importing from `@shared/fixtures` outside the sanctioned 3 files.
- Reaching into `db.<table>` from a component — always go through a context.
- Using `localStorage` for anything other than settings + session.
- Adding a state library because "React context feels wrong."
- Inline hex colors, inline font sizes, inline shadows in JSX or CSS.
- `any`, `as unknown as X`, `// @ts-ignore` — banned without a comment
  explaining the exact reason and a linked TODO to fix.
- `.then(...).then(...).then(...)` chains longer than two. Use `async/await`.
- Passing more than 6 props to a component. Refactor to composition.
- `useEffect` that runs on every render (missing dep array). Ever.
- Using `<div onClick={...}>` for anything a screen reader might touch.
  If it's clickable, it's a `<button>`.
- Silent redirects for 404s. Always render a real Not Found page.
- Adding a top-level route to `Shell.tsx` that isn't a sub-app mount
  point.

---

## Pre-commit checklist

Run these before every commit — they take 15 seconds:

```bash
# from cashier-app/
npx tsc -b --noEmit   # no TS errors
npm run build         # vite build succeeds, bundle sizes ok
```

If either fails, do not commit.

## Pre-merge checklist

For a feature branch merging to main:

- [ ] All 15 sections above respected (or violation explained)
- [ ] Chromium smoke test on the affected route(s) — light + dark
- [ ] Bundle sizes still in budget (`index` <= 120 KB gz, sub-apps <= 20 KB gz)
- [ ] Multi-tenant test: log in as a second tenant, verify no cross-leak
- [ ] Keyboard-only test: reach every new interactive control without a mouse
- [ ] Screenshot in the PR description

## When to break a rule

Every rule here exists because breaking it once cost someone hours. If
you have a real reason to break one:

1. Say so in the commit body. "Breaking RULE 6.3 because <reason>."
2. Add a `// GUARDRAIL-EXEMPT: <reason>` comment at the site.
3. Open a follow-up issue if the exception should become a rule change.

Rules serve the codebase, not the other way around. But default to
following them — they exist for reasons you may not have hit yet.
