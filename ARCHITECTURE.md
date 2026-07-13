# Registro — Architecture

A demo full-stack retail commerce platform. Four apps, two shared packages,
one Dexie ledger, zero servers. Everything runs in the browser.

This document is the map. Read it once end-to-end before poking at code —
you'll save yourself a lot of "where does X live" spelunking.

---

## 1. What Registro is

Registro is a **multi-tenant retail OS**. One codebase serves:

| Surface | Who uses it | URL |
|---------|-------------|-----|
| **Marketing home** | Anyone browsing to the root | `/` |
| **Storefront** | Public shoppers | `/:slug` (e.g. `/velvet`) |
| **Sales Register** | In-store staff | `/:slug/cashier` |
| **Tenant Admin** | Shop owners | `/:slug/admin` |
| **SaaS Console** | Platform vendor (planned) | `/dashboard` |

Every sale — walk-in, dine-in, delivery, marketplace, online — lands in the
**same `sales` table**. Same customer record. Same product row. No ETL.

---

## 2. Repo layout

```
Billing/
├── apps/
│   ├── shell/          Host app. Owns BrowserRouter, login, marketing home.
│   ├── pos/            Sales Register (/cashier) + Tenant Admin (/admin).
│   └── storefront/     Public tenant shop (/:slug/*).
├── packages/@billing/
│   ├── shared/         Domain types, Dexie DB, Contexts, fixtures, hooks, brand.
│   └── ui/             Design system (atoms, molecules, organisms, admin, guards).
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── package.json        Root scripts: build, dev:shell, dev:pos, dev:storefront.
```

**Build tool:** Vite per app, TypeScript 5, React 18, React Router 6.
**Package manager:** pnpm workspaces.
**Persistence:** Dexie (IndexedDB) — a single named database, `quickbill`
(kept for backwards-compat; see `brand.ts` if you're tempted to rename it).

---

## 3. The four apps

### 3.1 `apps/shell` — the host

The **only** app the browser actually loads first. Owns:

- The single `<BrowserRouter>`
- Route table (see §5)
- `<MarketingHomePage>` — the / landing
- `<LoginPage>` — `/login`
- Sub-app mount points (`<CashierApp>`, `<AdminApp>`, `<StorefrontApp>`)
- All shared providers (see `RootProvider.tsx`)
- Error boundary at the outermost layer

Sub-apps are imported **directly via source aliases** (see `vite.config.ts`),
not through module federation. See §9 for the war story.

### 3.2 `apps/pos` — Sales Register + Admin

Two subtrees mounted at `/:slug/cashier/*` and `/:slug/admin/*`:

- `RegisterApp.tsx` — the router, exports both `CashierApp` (register-facing
  staff) and `AdminApp` (owner-facing).
- `RegisterShell.tsx` — the layout wrapper: header + sidebar + `<Outlet />`.
- `pages/CashierPage.tsx` — the register terminal itself.
- `pages/admin/*` — dashboard, reports, marketing, accounting, logs, inventory-extras.
- `pages/*` — CRUD pages for products / customers / users / stores / settings / sales.

**Cashier vs Admin auth split:** enforced *inside* `RegisterApp.tsx` per-subtree
(cashier = any staff, admin = admin-only). This lets the storefront stay public
while both staff subtrees demand a session.

### 3.3 `apps/storefront` — public shop

Mounted at `/:slug/*`. Zero auth required.

- `StorefrontApp.tsx` — router.
- `StorefrontShell.tsx` — nav + sticky cart bar + footer.
- `pages/HomePage.tsx` — hero + bestsellers + new arrivals (§7).
- `pages/BrowsePage.tsx` — filter/search catalog.
- `pages/ProductPage.tsx` — PDP.
- `pages/CartPage.tsx` — line editor.
- `pages/CheckoutPage.tsx` — writes a `Sale` with `channel: 'online'`.
- `pages/OrderConfirmedPage.tsx` — the receipt.
- `state/CartContext.tsx` — cart state (session-scoped).
- `state/StorefrontTenantContext.tsx` — resolves the slug → `Store` row.
- `lib/tenantTheme.ts` — per-tenant palette + tagline.

### 3.4 `apps/shell` marketing home — sort of a 4th app

Not a separate package but functionally a distinct surface. `MarketingHomePage.tsx`
is the SaaS pitch: hero + 4 product pillars + demo tenants + creds + CTA + contact.
All copy flows from `@billing/shared/brand`.

---

## 4. The two shared packages

### 4.1 `@billing/shared`

The single source of truth for everything non-visual.

```
shared/src/
├── brand.ts              ← THE ONE file for product name, tagline, wordmark, emails.
├── domain/
│   ├── types.ts          Core types: Store, User, Product, Sale, Customer, ...
│   ├── restaurant.ts     Restaurant/F&B extensions: OrderType, Table, KOT, ...
│   ├── tmbill-extras.ts  Warehouse, GRN, StockTransfer, VendorBill, ...
│   ├── permissions.ts    can(action, role) — the RBAC gate.
│   ├── computeSaleTotals.ts   Pure functions for subtotal, tax, discount.
│   ├── format.ts, dateRange.ts, catalog.ts, strings.ts
├── lib/
│   ├── db.ts             Dexie schema (v1 → v5).
│   ├── db-bootstrap.ts   Seed empty DB with fixtures.
│   ├── resolveTenant.ts  slug ↔ storeId translation.
│   ├── tenantSlug.ts     Reserved slugs, validation.
│   ├── theme.ts, storage.ts
├── store/                React Context providers, one per aggregate:
│   ├── AuthContext.tsx      currentUser, currentStoreId, currentOutletId, login/logout
│   ├── StoresContext.tsx    tenants
│   ├── ProductsContext.tsx  catalog
│   ├── SalesContext.tsx     every sale + void/refund
│   ├── CustomersContext.tsx registered shoppers + lending balance
│   ├── UsersContext.tsx     staff
│   ├── SettingsContext.tsx  per-tenant settings
│   ├── AuditContext.tsx     audit log writes
│   └── ToastContext.tsx     the toast queue
├── hooks/                useMoney (currency), useTable (Dexie live query)
└── fixtures/             Seed data for the 3 demo tenants.
```

### 4.2 `@billing/ui`

The design system. Atomic-design layout:

```
ui/src/
├── styles/
│   ├── tokens.css        CSS custom properties (colors, spacing, radius, ...)
│   ├── theme.css         Light + dark themes bound to tokens.
│   └── globals.css       Resets + base type.
├── atoms/                Icon, Input, Select, Text, Button, ThemeToggle
├── molecules/            DataTable, FormRow, Modal, Toast, ...
├── organisms/
│   ├── index.tsx                  Big composites (KPI grid, etc.)
│   ├── cashier-checkout.tsx       All-in-one checkout modal (mode tabs + payment + customer)
│   ├── cashier-context.tsx        Header chips (order type, table, customer)
│   ├── cashier-depth.tsx          Sale-detail panel
│   ├── cashier-money.tsx          Money math + tender inputs
│   └── outlet-picker.tsx          Multi-outlet dropdown chip
├── admin/
│   ├── Sidebar.tsx                Collapsible left nav, per-user visibility
│   ├── index.tsx                  Group + link definitions
│   ├── SidebarSettingsModal.tsx   Hide/show group + link customisation
│   └── useSidebarVisibility.ts    localStorage: hidden groups + hidden links
├── charts/               Recharts wrappers with tokens applied.
├── errors/               AppSplash, ErrorBoundary, NotFoundPage.
├── feedback/             Toast primitives.
├── guards/               <ProtectedRoute>, <AdminRoute>.
└── templates/            Full-page templates.
```

---

## 5. Routing model

Owned entirely by `apps/shell/src/Shell.tsx`. **One `<BrowserRouter>`.**

```
/                       → Marketing home (public)
/login                  → Sign in
/dashboard/*            → Redirects to /login for now (vendor console TBD)
/:slug                  → Storefront home (public, per-tenant)
/:slug/browse           → Storefront catalog
/:slug/product/:id      → Storefront PDP
/:slug/cart             → Storefront cart
/:slug/checkout         → Storefront checkout → writes a Sale
/:slug/order/:id        → Storefront order confirmation
/:slug/cashier/*        → Sales Register (staff auth)
/:slug/admin/*          → Tenant Admin (admin-only auth)
```

**Slug resolution:** `resolveTenant.ts` maps `slug` ↔ `Store.id`. Reserved
slugs (`login`, `dashboard`, `admin`, ...) are rejected at tenant-creation
time in `tenantSlug.ts`.

**Route order matters:** more-specific patterns (`/:slug/cashier/*`) come
BEFORE the catch-all `/:slug/*`, otherwise the storefront swallows staff URLs.

**Legacy redirects:** old bookmarks (`/shop/:slug/*`, `/vendor/*`, bare
`/cashier`) 301 to their current URLs.

---

## 6. Data model

One Dexie database, **many tables**, all keyed by `storeId` for tenant isolation.

**v1–v4 tables** (core commerce):

- `stores` — tenants. `status: active | suspended`.
- `users` — staff. `role: vendor | admin | cashier`. `storeId` scopes to tenant.
- `products` — catalog. `storeId + sku` unique.
- `customers` — registered shoppers + lending balance.
- `sales` — the ledger. `channel: register | online | dine-in | delivery | ...`.
  Every checkout — Register OR Storefront — writes here.
- `customerPayments` — lending repayments.
- `auditLog` — every mutating action.

**v5 tables** (TMBill parity — restaurant + inventory):

- `markets, brands, outlets, paymentModes, orderTypes, taxSlabs,
   discounts, addlCharges, reasons, outletSettings`
- `menuCategories, modifiers, combos, variants`
- `sections, diningTables, kotStations, aggregators, deliveryZones`
- `ingredients, recipes, suppliers, purchaseOrders, wastageEntries`
- `customerGroups, loyaltyTiers, coupons, feedbackEntries`
- `warehouses, rawMaterialCategories, unitsOfMeasure, stockAdjustments,
   grns, stockTransfers, indentRequests, productionBatches`
- `accounts, expenseCategories, expenses, vendorBills`
- `whatsAppTemplates, customerSegments, marketingCampaigns`

**Bootstrap:** on first boot, `db-bootstrap.ts` seeds the three demo tenants
(Velvet, Spice Route, La Maison) with realistic fixtures if the tables are empty.

---

## 7. Multi-tenant model

- **Tenant** = row in `stores` table. Each has `id, slug, name, currency,
   status, market, brand`.
- **Slug** = URL-safe identifier. `resolveTenant.ts` translates slug ↔ id.
- **Scoping:** every domain table row carries a `storeId`. Context providers
  filter by `currentStoreId` from `AuthContext`.
- **Outlet:** a *physical location* under a tenant. Multi-outlet tenants
  (e.g. a chain) can switch active outlet via `<OutletPicker>` on the
  Register shell. Persisted per-user under `localStorage["active-outlet:<userId>"]`.
- **Marketing home** intentionally never advertises the real tenant NAMES —
  it labels demo cards by vertical ("Luxury fashion", "Fine dining") so the
  page reads as a platform, not a customer list.

---

## 8. Auth + permissions

- **Session:** `AuthContext` reads/writes `localStorage.session`.
- **Roles:** `vendor | admin | cashier` (see `permissions.ts`).
  - `vendor` = SaaS owner; cross-tenant scope (`VENDOR_SCOPE`).
  - `admin` = tenant admin; scoped to one `storeId`.
  - `cashier` = tenant staff; scoped to one `storeId`.
- **Route guards** live in `@billing/ui/guards`:
  - `<ProtectedRoute>` — any signed-in user.
  - `<AdminRoute>` — `admin` or `vendor` only.
- **Marketing home** does its own bounce: if you're already signed in as
  staff, it redirects you to `/:slug/cashier`; vendors go to `/dashboard`.

**Demo credentials** (all seeded, all listed on the marketing home):

| Role | User | Pass | Lands on |
|------|------|------|----------|
| SaaS owner | `vendor` | `vendor123` | `/dashboard` |
| Tenant admin | `velvet` | `velvet123` | `/velvet/admin` |
| Register staff | `velvet.cashier` | `cashier123` | `/velvet/cashier` |
| Shopper | — | — | `/velvet` (public) |

---

## 9. Why NOT Module Federation

We tried it. It broke. Here's the postmortem so you don't retry.

**What broke:** every remote-app route bounced to the ErrorBoundary with
`useAuth must be used within <AuthProvider>` — even though the shell's
`RootProvider` wrapped everything in `<AuthProvider>`.

**Why:** `@originjs/vite-plugin-federation`'s `shared: { ... }` block only
shares npm-published packages resolvable by name in `node_modules`. It
**cannot** share workspace packages aliased to source via tsconfig paths
(like our `@billing/shared` → `packages/@billing/shared/src`).

Result: shell, pos, and storefront each bundled their **own** copy of every
Context module. `createContext(...)` runs at bundle-load time, so each copy
is a *different* React context instance. The shell's `<AuthProvider>`
populated the shell-copy; the pos remote's `useAuth()` read the pos-copy
(which had no Provider) and threw.

**Fix:** drop federation between shell and pos/storefront. Alias
`posApp → apps/pos/src` and `storefrontApp → apps/storefront/src` in
`shell/vite.config.ts`. Federation plugin stays loaded with `remotes: {}`
so flipping back is a one-line change if independent deployment ever
becomes a real requirement.

**Rule of thumb:** Module Federation is worth the complexity ONLY if you
need independent deployment. Inside a single monorepo owned by one team,
just import directly.

---

## 10. Design system usage

- All colors, radii, spacing = **tokens** in `ui/src/styles/tokens.css`.
  Never hardcode a hex or a px in a component.
- Theme switching (light/dark) via a `data-theme` attribute on `<html>`.
  The `<ThemeToggle>` atom drives it; `apps/shell/public/theme-init.js`
  applies the persisted choice before React mounts (prevents FOUC).
- Per-tenant accents live in `apps/storefront/src/lib/tenantTheme.ts` and
  are injected via CSS custom properties (`--app-accent`, etc.) on a
  container wrapper. No inline styles on children.
- Fonts: **Fraunces** (italic serif, for accents/wordmark), **Inter** (ink sans).

---

## 11. Local dev

```bash
# From repo root
pnpm install                       # once

pnpm dev:shell                     # http://localhost:5000 (host + marketing + login)
# You typically only need the shell — it imports pos + storefront directly.

pnpm dev:pos                       # http://localhost:5001 (isolated pos preview)
pnpm dev:storefront                # http://localhost:5002 (isolated storefront preview)

pnpm build                         # full production build (all three apps)
pnpm typecheck                     # `tsc --noEmit` across all packages
```

**First-run seed:** the app auto-seeds Velvet, Spice Route, La Maison
on empty DB via `db-bootstrap.ts`. To reset: DevTools → Application →
IndexedDB → delete `quickbill` DB → reload.

---

## 12. Adding things

### Add a new tenant

1. Add a `Store` fixture in `packages/@billing/shared/src/fixtures/stores.ts`.
2. Seed its products, users, order types in the matching fixture files.
3. Add its palette + tagline to `apps/storefront/src/lib/tenantTheme.ts`.
4. (Optional) add a demo card to `MarketingHomePage.tsx` `DEMO_TENANTS`.
5. Delete the local `quickbill` DB and reload to re-seed.

### Add a new admin page

1. Create the page component under `apps/pos/src/pages/admin/`.
2. Register the route in `apps/pos/src/RegisterApp.tsx`.
3. Add the sidebar entry in `packages/@billing/ui/src/admin/index.tsx`.
4. If it needs new domain data, extend `db.ts` (bump schema version) and
   add a Context provider in `@billing/shared/store/`.

### Add a new user-facing string

Add it to `packages/@billing/shared/src/domain/strings.ts`. Never inline
copy in a component.

### Add a new brand touchpoint

Add it to `packages/@billing/shared/src/brand.ts`. That file is **the**
source of truth for name/tagline/emails/wordmark. If you find yourself
typing "Registro" in a component, you're doing it wrong — import from
`@shared/brand` instead.

---

## 13. Zen

- **DRY:** repeated copy → `strings.ts`; repeated color → `tokens.css`;
  repeated component → `@billing/ui`.
- **YAGNI:** the vendor console at `/dashboard` is stubbed to a `/login`
  redirect until a real user story demands it.
- **SOLID:** each Context owns one aggregate. Each organism owns one
  screen concern. Guards are their own package.
- **Explicit > implicit:** every route is listed once in `Shell.tsx`;
  every fixture is a named export; every permission is a `can(action)`
  call, never an inline `role === 'admin'` check.
- **One source of truth:** brand text, tokens, permissions, strings,
  routes, tenants — each lives in exactly one file. Renaming a thing
  should be a single-file edit. If it isn't, that's the bug.
