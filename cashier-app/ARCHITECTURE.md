# QuickBill · Architecture

> A single-page reference for how the app is wired end-to-end. Read this once
> before you touch routing, providers, the Dexie schema, or the design tokens.
> If reality drifts from what's below, the doc is wrong — fix it in the same PR.

---

## 1 · What QuickBill is

QuickBill is a **multi-tenant retail commerce platform** built as a
frontend-only SPA (React 19 + TypeScript + Vite + Dexie/IndexedDB). One
codebase serves five distinct **surfaces**:

| # | Surface           | URL                     | Audience              | Auth               |
|---|-------------------|-------------------------|-----------------------|--------------------|
| 1 | Marketing home    | `/`                     | Prospective SaaS buyer | public             |
| 2 | Auth              | `/login`                | Anyone                 | public             |
| 3 | Vendor console    | `/dashboard/*`          | SaaS operator (us)     | `vendor` role      |
| 4 | Tenant storefront | `/:slug`                | End shoppers (public)  | public             |
| 5 | Tenant staff      | `/:slug/cashier`, `/:slug/admin` | Store staff / admin | `cashier` / `admin` |

No backend, no server. Everything persists in the browser via Dexie. Data
model is designed so `storeId` can graduate to a real `tenantId` on a backend
later without touching feature code.

---

## 2 · URL Architecture — slug-first

The whole app pivots on **one** URL rule:

> **The tenant slug is the first path segment.** Everything else nests under it.

```
/                            marketing home         (public)
/login                       auth
/dashboard/*                 vendor console         (vendor)

/:slug                       storefront home        (public)
/:slug/browse                storefront browse
/:slug/product/:productId    PDP
/:slug/cart                  cart
/:slug/checkout              checkout
/:slug/order/:orderId        order confirmation
/:slug/cashier/*             tenant POS             (staff)
/:slug/admin/*               tenant admin           (admin)
```

**Reserved slugs** (`dashboard`, `login`, `signup`, `admin`, `api`, `assets`,
`static`, `shop`, `tenant`, `vendor`) can never be assigned to a tenant —
enforced in `src/shared/lib/tenantSlug.ts::RESERVED_SLUGS`. Adding a new
top-level route means adding it to that set.

Route order matters in `Shell.tsx`: `/:slug/cashier/*` and `/:slug/admin/*`
are declared **before** the catch-all `/:slug/*` storefront route so the more
specific patterns win.

**Legacy URLs redirect, never 404.** `/vendor/*`, `/shop/:slug/*`,
`/tenant/shop/:slug/*` and every bare staff path (`/cashier`, `/products`, …)
all redirect to their new equivalents so bookmarks and QR codes keep working.

---

## 3 · Runtime composition

```
index.html
 └─ main.tsx
     └─ StrictMode
         └─ ErrorBoundary (label="outer")
             └─ RootProvider          ← composes all data contexts
                 └─ Shell             ← the ONE BrowserRouter
                     └─ <Routes>      ← dispatches to a sub-app
                         ├─ MarketingHomePage   (/ )
                         ├─ LoginPage           (/login)
                         ├─ VendorApp           (/dashboard/*)  — lazy chunk
                         ├─ CashierApp          (/:slug/cashier/*)  — lazy chunk
                         ├─ AdminApp            (/:slug/admin/*)    — lazy chunk
                         └─ StorefrontApp       (/:slug/*)          — lazy chunk
```

Each sub-app is a `React.lazy` chunk so the initial marketing/login payload
stays lean. `Shell` wraps every mount in an `ErrorBoundary` + `Suspense`
fallback so a chunk-load failure lands on the retry splash, never a blank
screen.

---

## 4 · Provider tree — order is load-bearing

`RootProvider` (`src/shell/RootProvider.tsx`) composes contexts in a **fixed
order**. Do not reorder without reading the notes below.

```
SettingsProvider                ← localStorage-only, no DB
  ToastProvider                 ← must wrap everything that can toast
    ⏳  bootstrapDb() awaits first
    StoresProvider              ← Dexie live-query on stores
      UsersProvider             ← Dexie live-query on users
        AuthProvider            ← reads users to reconcile session on reload
          AuditProvider         ← writes to auditLog on vendor actions
            ProductsProvider    ← scoped by AuthContext.currentStoreId
              CustomersProvider
                SalesProvider
                  <Shell />
```

**Why the order:**

- `SettingsProvider` and `ToastProvider` sit outside the boot gate so the
  retry splash can still toast/theme correctly if Dexie fails to open.
- `BootGate` (inside `RootProvider`) blocks the entire tenant tree until
  `bootstrapDb()` resolves — otherwise first-render sees an empty users
  array and `AuthContext` would sign every returning user out (see the
  `reconciledRef` pattern in `AuthContext.tsx`).
- `UsersProvider` must precede `AuthProvider` because Auth needs to look
  up the persisted user by id on reload.
- Every domain provider (`Products`/`Customers`/`Sales`) reads
  `AuthContext.currentStoreId` to scope its `useLiveQuery` — so Auth must
  be higher in the tree.

---

## 5 · Data layer — Dexie

Local persistence lives in `src/shared/lib/db.ts`. **One DB, one file.**

### Schema (v4)

| Table              | Primary key | Compound / secondary indexes                                             |
|--------------------|-------------|--------------------------------------------------------------------------|
| `stores`           | `id`        | `name`, `status`                                                         |
| `users`            | `id`        | `username`, `storeId`, `role`                                            |
| `products`         | `id`        | `storeId`, `[storeId+sku]`, `category`, `active`                         |
| `customers`        | `id`        | `storeId`, `[storeId+mobile]`                                            |
| `sales`            | `id`        | `storeId`, `completedAt`, `customerId`, `cashierId`, `voided`, `channel`, `orderStatus`, `[storeId+channel]`, `[storeId+orderStatus]` |
| `customerPayments` | `id`        | `customerId`, `receivedAt`                                               |
| `auditLog`         | `id`        | `at`, `actorUsername`, `targetStoreId`, `action`                         |

### Migration ladder

- **v1** — initial schema
- **v2** — rename `UserRole.master` → `admin` in place
- **v3** — add `store.status` + `auditLog` table (vendor console)
- **v4** — add `channel` + `orderStatus` to `sales` for online orders,
  backfill legacy rows as `counter` / `null`

Each `.version(N)` block ships its own `.upgrade()` callback for
legacy rows. **Never rename `BRAND.dbName`** — it orphans every existing
local database; ship a migration instead.

### Tenant scoping

`[storeId+sku]` and `[storeId+mobile]` are the compound indexes that enforce
per-tenant uniqueness in O(log n) lookups. All list queries follow the
pattern:

```ts
db.products.where('storeId').equals(currentStoreId).toArray()
```

`.between([currentStoreId, ''], [currentStoreId, '\uffff'])` throws
`DexieError2` in practice — use the simpler `.where().equals()` + in-memory
sort. Confirmed the hard way (see kennel `Project Decisions`).

---

## 6 · Tenant resolution — the ONE seam

`src/shared/lib/resolveTenant.ts` is **the only place** that maps a request
context to a `Store`. Everything else calls `useCurrentTenant()` from
`tenantSlug.ts` and doesn't care how we got there.

Resolution order:

1. **Custom domain lookup** (`db.stores.where('customDomain').equals(hostname)`)
   — placeholder for the paid upsell tier. Not wired yet, but the seam is
   there.
2. **Subdomain under platform apex** (e.g. `myntra.quickbill.shop` →
   `store-myntra`).
3. **Path slug fallback** (`/myntra` → `store-myntra`) — today's dev URL.

Slug ↔ storeId convention:

```ts
storeIdToSlug('store-myntra') === 'myntra'
slugToStoreId('myntra')       === 'store-myntra'
```

Route building uses the central `tenantPath(slug, surface, subpath)` factory
so a URL scheme rename touches ONE file, not fifty.

---

## 7 · Auth & route guards

`src/shell/RouteGuards.tsx` exposes three guards:

| Guard              | Allowed roles          | Redirect on fail |
|--------------------|------------------------|------------------|
| `ProtectedRoute`   | any signed-in staff    | `/login`         |
| `AdminRoute`       | `admin` only           | `/login`         |
| `VendorRoute`      | `vendor` only          | `/login`         |

Guards run per-subtree, not per-route:

- `CashierApp` wraps its routes in `<ProtectedRoute>` (any staff)
- `AdminApp` wraps in `<AdminRoute>` (admin only)
- `VendorApp` is wrapped in `<VendorRoute>` at the Shell level
- Storefront (`/:slug/*`) has **no guard** — it's public by design

Session state lives in `AuthContext` and is persisted to `localStorage`
(session token only, not the full user record). On reload, Auth reconciles
by looking up the persisted user id in the live `users` array — which is
why `UsersProvider` must sit above `AuthProvider` in the tree.

---

## 8 · Design system — three palettes, one codebase

The app runs **three visually distinct palettes** simultaneously, split by
audience:

| Palette              | Where               | Tokens             | Vibe                                    |
|----------------------|---------------------|--------------------|-----------------------------------------|
| **Blue SaaS**        | Auth, Vendor, Admin, Cashier | `--app-*` in `theme.css` | Cool, functional, high-contrast |
| **Luxury cream+gold**| Marketing (`/`), Storefront (`/:slug`) | `--mk-*` in `marketing.module.css`, `--lux-*` in `storefront.module.css` — numerically identical | Editorial, Fraunces italic, brass gold accents |
| **Tenant accent**    | Any staff surface, per-tenant | `--app-accent` (dynamic, from `store.accentColor`) | Tenant brand color, sparse use |

### Token layers

```
main.tsx imports (in order):
  1. theme.css     ← global palette + typography (blue SaaS defaults)
  2. tokens.css    ← spacing, radii, shadows, motion (design-system-wide)
  3. globals.css   ← resets, focus-visible, print styles
```

Then each app opts in to its own scoped palette by declaring CSS variables
on its own root class:

- `.mk-root` in `marketing.module.css` → cream + gold
- `.shell` in `storefront.module.css` → cream + gold (mirrors mk-*)
- (staff apps just inherit `--app-*` from `theme.css`)

The storefront and marketing token blocks are **numerically identical** but
physically separate — a comment at the top of each cross-references the
other so future edits stay in sync. If you make this shared, extract to
`src/styles/luxury.tokens.css` and import in both.

### Font stack

- **Fraunces** — serif display, used only for editorial headlines
  (marketing hero, storefront hero, section labels)
- **Montserrat** — sans-serif UI face, everywhere else
- **JetBrains Mono** — code / receipts / SKU numbers

All three loaded once in `index.html`, no per-app font loads.

---

## 9 · State management pattern

**React Context + Dexie `useLiveQuery`.** No Redux, no Zustand, no MobX.
Every domain provider follows the same shape:

```ts
export const ProductsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { currentStoreId } = useAuth();
  const products = useLiveQuery(
    () => db.products.where('storeId').equals(currentStoreId ?? '').toArray(),
    [currentStoreId],
    [],  // initial value while query runs
  );

  const addProduct = useCallback(async (input: NewProductInput) => {
    // validate, then await db.products.add({...})
  }, [currentStoreId]);

  return <ProductsCtx.Provider value={{ products, addProduct, ... }}>{children}</ProductsCtx.Provider>;
};
```

Writes are `async` and go straight to Dexie. `useLiveQuery` re-fires
subscribers automatically, so no manual invalidation. This means:

- **No stale state.** A write in tab A shows up in tab B via IDB events.
- **No selectors.** Consumers pull the whole tenant-scoped array and filter
  in-component. Fine at retail scales (thousands of rows, not millions).
- **Type-safe.** Every store returns a discriminated union for async ops
  (`{kind:'idle'|'loading'|'success'|'error'}`).

Ephemeral UI state (cart contents, modal open, form drafts) uses local
`useState` or feature-scoped context (e.g. `CartContext` inside
`StorefrontApp`), NOT the global provider tree.

---

## 10 · Folder conventions

```
src/
├── main.tsx                    ← mounts <RootProvider><Shell/></RootProvider>
├── shell/                      ← host: router, guards, marketing, login
│   ├── Shell.tsx               ← THE ONE BrowserRouter
│   ├── RootProvider.tsx        ← provider composition
│   ├── RouteGuards.tsx         ← Protected/Admin/Vendor
│   ├── LoginPage.tsx
│   └── MarketingHomePage.tsx
├── apps/                       ← self-contained sub-apps, lazy-loaded
│   ├── counter/                ← Cashier + Admin (share CounterShell)
│   ├── vendor/                 ← SaaS owner console
│   └── storefront/             ← customer-facing shop
├── shared/                     ← cross-app building blocks
│   ├── brand.ts                ← product identity (text)
│   ├── domain/                 ← types, catalog, format, permissions
│   ├── store/                  ← global React contexts (auth, data)
│   ├── lib/                    ← db, tenant resolution, theme
│   ├── atoms/                  ← primitives (Button, Input, Badge)
│   ├── molecules/              ← composed pieces (StatCard, Empty)
│   ├── organisms/              ← full sections (SidebarNav, Topbar)
│   ├── templates/              ← page skeletons (SplitPane, Sheet)
│   ├── hooks/                  ← useMoney, useDebounce, ...
│   ├── errors/                 ← ErrorBoundary, NotFound, Splash
│   ├── feedback/               ← Toast, Confirm, ProgressBar
│   └── fixtures/               ← demo seed data (dev only)
└── styles/
    ├── theme.css               ← global blue SaaS palette
    ├── tokens.css              ← spacing/radii/shadows/motion
    └── globals.css             ← resets, focus, print
```

**Path aliases** (defined in `vite.config.ts` + `tsconfig.json`):

- `@apps/*` → `src/apps/*`
- `@shared/*` → `src/shared/*`
- `@shell/*` → `src/shell/*`
- `@styles/*` → `src/styles/*`

Never `../../../` — always use aliases.

---

## 11 · Extension recipes

### Add a page to Cashier
1. Create `src/apps/counter/pages/MyPage.tsx`
2. Wire it in `src/apps/counter/CounterApp.tsx::CashierApp` as
   `<Route path="my-page" element={R('my-page', <MyPage />)} />`
3. Add to the sidebar in `src/apps/counter/CounterShell.tsx`

### Add a new Dexie table
1. Add type to `src/shared/domain/types.ts`
2. Bump schema version in `src/shared/lib/db.ts` — declare all previous
   stores again + add new one; add `.upgrade()` if backfilling
3. Create a `FoosContext.tsx` next to the others in `src/shared/store/`
4. Wire it into `RootProvider` at the right nesting depth (needs Auth
   above it if tenant-scoped)

### Add a new tenant
1. Create the store row via the vendor console (`/dashboard/tenants/new`)
   OR seed it in `src/shared/fixtures/`
2. Ensure the slug isn't in `RESERVED_SLUGS`
3. That's it — the whole app picks it up because everything resolves from
   the URL slug

### Add a new top-level route
1. Add the route in `Shell.tsx`
2. Add the slug to `RESERVED_SLUGS` in `tenantSlug.ts` so no tenant can
   ever collide with it
3. If it needs auth, wrap in a guard; if a new role is involved, extend
   the guard set in `RouteGuards.tsx`

### Rename the product
1. Edit `src/shared/brand.ts` — that's the whole diff.
2. If you're renaming the Dexie DB (`BRAND.dbName`), ship a migration
   that copies rows from the old DB name.

---

## 12 · Known gotchas (kennel-verified)

1. **Dexie compound `.between()` throws** — use `.where().equals()` + sort
   in memory. Confirmed on schema v3+.
2. **Session reconciliation must wait for async table hydration** — else
   every user logs out on reload. See `reconciledRef` in `AuthContext.tsx`.
3. **`sales.completedAt` needs to be a plain index** if you want to
   `orderBy` on it — not just part of a compound.
4. **Bootstrap runs exactly once** — guarded by a `db-bootstrap::v1` flag
   in localStorage. Bump the flag key when you change seed data shape.
5. **`Settings` page cannot edit locked store profile fields** — currency,
   tax rate, GSTIN are read-only for tenants (only vendor console can
   change them). This is intentional — don't unlock without also
   backfilling historical sales.

---

## 13 · What's NOT here (yet)

- **No backend.** Dexie is the source of truth. Every entity carries a
  `storeId` so the migration path to a real multi-tenant backend is
  "swap Dexie calls for HTTP calls".
- **No real auth.** Passwords live in `users.password` (plaintext) in
  IndexedDB — because this is a frontend-only demo. When a backend
  arrives, passwords MUST move server-side + get hashed (§6 in
  `domain/types.ts`).
- **No custom domains.** Placeholder in `resolveTenant.ts` line 1 — hook
  it up when the paid tier ships.
- **No real payments.** Checkout accepts `cash`/`card`/`cod`/`online` as
  strings, doesn't integrate a PSP.
- **No email/SMS.** Order confirmations are in-app only.

The architecture is designed so all five of the above land without
touching feature code — they slot into the seams that already exist.

---

_Last updated when the storefront palette was aligned with the marketing
homepage (commit `67b199c`). If reality drifts from this doc, fix the doc
in the same PR that broke it._
