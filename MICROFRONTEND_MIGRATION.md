# Micro-Frontend Migration Guide
## Billing Platform — Monolith → Module Federation

> **Current state:** Single Vite SPA with React.lazy() code splitting  
> **Target state:** Independent sub-apps deployed separately, composed at runtime via Vite Module Federation  
> **Estimated effort:** 8–12 days (1 engineer)

---

## Architecture Overview

### Before (today)
```
cashier-app/               ← one build, one deploy
  src/
    shell/                 ← BrowserRouter, routes, auth
    apps/
      pos/                 ← Cashier POS + Admin (lazy chunk)
      vendor/              ← SaaS vendor console (lazy chunk)
      storefront/          ← Customer shop (lazy chunk)
    shared/                ← contexts, db, atoms, domain types
```

### After (target)
```
packages/
  @billing/shared/         ← npm workspace package (extracted from src/shared/)
  @billing/ui/             ← atoms, molecules, organisms

apps/
  shell/                   ← host app  → https://app.yourplatform.com
  pos/                     ← remote    → https://pos.yourplatform.com
  vendor/                  ← remote    → https://vendor.yourplatform.com
  storefront/              ← remote    → https://storefront.yourplatform.com
```

---

## Phase 0 — Preparation (Day 1)

### 0.1 Set up a pnpm/npm workspace

Create `pnpm-workspace.yaml` at the repo root:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

Root `package.json`:

```json
{
  "name": "billing-platform",
  "private": true,
  "workspaces": ["apps/*", "packages/*"]
}
```

### 0.2 Install Module Federation plugin in every app

```bash
pnpm add -D @originjs/vite-plugin-federation --filter pos
pnpm add -D @originjs/vite-plugin-federation --filter vendor
pnpm add -D @originjs/vite-plugin-federation --filter storefront
pnpm add -D @originjs/vite-plugin-federation --filter shell
```

> **Important:** Module Federation requires `build.target: 'esnext'` in every sub-app. It uses dynamic `import()` with top-level await.

---

## Phase 1 — Extract Shared Package (Days 2–4)

This is the critical path. All sub-apps depend on shared code.

### What moves to `@billing/shared`

| Source path | Package export | Notes |
|---|---|---|
| `src/shared/domain/types.ts` | `@billing/shared/types` | No deps — move first |
| `src/shared/domain/strings.ts` | `@billing/shared/strings` | No deps |
| `src/shared/domain/format.ts` | `@billing/shared/format` | No deps |
| `src/shared/domain/catalog.ts` | `@billing/shared/catalog` | No deps |
| `src/shared/lib/db.ts` | `@billing/shared/db` | Depends on Dexie |
| `src/shared/lib/storage.ts` | `@billing/shared/storage` | No deps |
| `src/shared/lib/resolveTenant.ts` | `@billing/shared/resolveTenant` | Depends on db |
| `src/shared/store/AuthContext.tsx` | `@billing/shared/AuthContext` | **Critical** — see note |
| `src/shared/store/StoresContext.tsx` | `@billing/shared/StoresContext` | |
| `src/shared/store/ProductsContext.tsx` | `@billing/shared/ProductsContext` | |
| `src/shared/store/ToastContext.tsx` | `@billing/shared/ToastContext` | |
| `src/shared/brand.ts` | `@billing/shared/brand` | |

> **Context singleton rule:** React Context only works across a boundary if both sides use the **exact same React instance**. Configure `shared: { react: { singleton: true }, 'react-dom': { singleton: true } }` in every federation config. Without this, `useAuth()` returns `undefined` in sub-apps.

### `packages/@billing/shared/package.json`

```json
{
  "name": "@billing/shared",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    "./types":         "./src/domain/types.ts",
    "./strings":       "./src/domain/strings.ts",
    "./db":            "./src/lib/db.ts",
    "./AuthContext":   "./src/store/AuthContext.tsx",
    "./StoresContext": "./src/store/StoresContext.tsx"
  },
  "peerDependencies": {
    "react": "^18",
    "dexie": "^4"
  }
}
```

### What moves to `@billing/ui`

```
src/shared/atoms/       → @billing/ui/atoms
src/shared/molecules/   → @billing/ui/molecules
src/shared/organisms/   → @billing/ui/organisms
src/shared/templates/   → @billing/ui/templates
src/shared/feedback/    → @billing/ui/feedback
src/shared/errors/      → @billing/ui/errors
```

---

## Phase 2 — Split POS App (Day 5)

### 2.1 New project structure

```
apps/pos/
  src/
    CashierApp.tsx        ← expose this
    AdminApp.tsx          ← expose this
    PosShell.tsx
    pages/
  package.json
  vite.config.ts
  tsconfig.json
```

### 2.2 `apps/pos/vite.config.ts`

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'posApp',
      filename: 'remoteEntry.js',
      exposes: {
        './CashierApp': './src/CashierApp',
        './AdminApp':   './src/AdminApp',
      },
      shared: {
        react:            { singleton: true, requiredVersion: '^18' },
        'react-dom':      { singleton: true, requiredVersion: '^18' },
        'react-router-dom': { singleton: true },
        dexie:            { singleton: true },
        'dexie-react-hooks': { singleton: true },
      },
    }),
  ],
  build: {
    target: 'esnext',       // required for federation
    minify: true,
    cssCodeSplit: true,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../packages/@billing/shared/src'),
    },
  },
});
```

### 2.3 Auth in the POS app

POS needs `useAuth()`. Two options:

**Option A — Shell passes auth via props (simpler)**
```tsx
// shell exposes an auth token; POS reads it from window or a custom event
```

**Option B — Shared singleton context (recommended)**
```tsx
// PosApp.tsx — sub-app wraps itself with the shared providers
// Shell has already mounted AuthContext; sub-app re-uses the same instance
// because react is a singleton in federation config
import { AuthContext } from '@billing/shared/AuthContext';

// No extra provider needed — the singleton React instance means
// the context value from Shell's <AuthProvider> is already available.
export const CashierApp: FC = () => {
  const { currentUser } = useAuth(); // ← reads from Shell's AuthProvider ✓
  ...
};
```

---

## Phase 3 — Split Vendor + Storefront Apps (Days 6–7)

Follow the same pattern as Phase 2 for:

- `apps/vendor/` — exposes `./VendorApp`
- `apps/storefront/` — exposes `./StorefrontApp`

Storefront has one extra concern: it's **public** (no auth required). Its CSP, caching headers, and CDN rules should be configured separately from the authenticated apps.

---

## Phase 4 — Update the Shell (Day 8)

### 4.1 `apps/shell/vite.config.ts`

```ts
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      remotes: {
        posApp:        'https://pos.yourplatform.com/assets/remoteEntry.js',
        vendorApp:     'https://vendor.yourplatform.com/assets/remoteEntry.js',
        storefrontApp: 'https://storefront.yourplatform.com/assets/remoteEntry.js',
      },
      shared: {
        react:              { singleton: true, requiredVersion: '^18' },
        'react-dom':        { singleton: true, requiredVersion: '^18' },
        'react-router-dom': { singleton: true },
        dexie:              { singleton: true },
        'dexie-react-hooks':{ singleton: true },
      },
    }),
  ],
  build: { target: 'esnext' },
});
```

### 4.2 `apps/shell/src/Shell.tsx` — swap imports

```ts
// Before
const CashierApp    = lazy(() => import('@apps/pos/PosApp').then(m => ({ default: m.CashierApp })));
const AdminApp      = lazy(() => import('@apps/pos/PosApp').then(m => ({ default: m.AdminApp })));
const VendorApp     = lazy(() => import('@apps/vendor/VendorApp').then(m => ({ default: m.VendorApp })));
const StorefrontApp = lazy(() => import('@apps/storefront/StorefrontApp').then(m => ({ default: m.StorefrontApp })));

// After
const CashierApp    = lazy(() => import('posApp/CashierApp'));
const AdminApp      = lazy(() => import('posApp/AdminApp'));
const VendorApp     = lazy(() => import('vendorApp/VendorApp'));
const StorefrontApp = lazy(() => import('storefrontApp/StorefrontApp'));
```

Everything else in `Shell.tsx` stays unchanged — routes, guards, providers.

### 4.3 TypeScript declarations for remote modules

Add `apps/shell/src/remotes.d.ts`:

```ts
declare module 'posApp/CashierApp' {
  import type { FC } from 'react';
  const CashierApp: FC;
  export default CashierApp;
}
declare module 'posApp/AdminApp' {
  import type { FC } from 'react';
  const AdminApp: FC;
  export default AdminApp;
}
declare module 'vendorApp/VendorApp' {
  import type { FC } from 'react';
  const VendorApp: FC;
  export default VendorApp;
}
declare module 'storefrontApp/StorefrontApp' {
  import type { FC } from 'react';
  const StorefrontApp: FC;
  export default StorefrontApp;
}
```

---

## Phase 5 — CI/CD Per Sub-App (Days 9–10)

Each app gets its own GitHub Actions workflow:

```yaml
# .github/workflows/deploy-pos.yml
on:
  push:
    paths: ['apps/pos/**', 'packages/@billing/shared/**']
jobs:
  deploy:
    steps:
      - run: pnpm --filter pos build
      - run: # upload dist/ to CDN at https://pos.yourplatform.com
```

Key point: `packages/@billing/shared/**` triggers ALL app rebuilds since they all depend on it.

---

## Phase 6 — Production HTTP Headers (Day 10)

Set these on each app's CDN/server. **Never use `<meta>` CSP.**

### Shell (`app.yourplatform.com`)
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://pos.yourplatform.com https://vendor.yourplatform.com https://storefront.yourplatform.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https://images.unsplash.com;
  connect-src 'self' https://pos.yourplatform.com https://vendor.yourplatform.com https://storefront.yourplatform.com;
  frame-ancestors 'none';

Cache-Control: no-store          # HTML — never cache
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
```

### Sub-app assets (`pos.yourplatform.com/assets/*`)
```
Cache-Control: public, max-age=31536000, immutable   # content-hashed filenames
Access-Control-Allow-Origin: https://app.yourplatform.com
```

### `remoteEntry.js` specifically
```
Cache-Control: public, max-age=60    # short TTL — shell re-fetches latest on reload
```

---

## Known Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| React loaded twice | `useAuth()` returns `undefined` — silent breakage | `singleton: true` + `requiredVersion` in every shared config |
| `remoteEntry.js` cached too long | Shell loads stale sub-app | Short TTL (60s) on remoteEntry, long TTL on hashed assets |
| Shared DB instance | Two apps writing to same IndexedDB table | Keep Dexie + all DB writes in shell only; expose read/write via context |
| TypeScript across boundary | No type safety on remote props | `remotes.d.ts` declarations; consider a shared contract package |
| Storefront public CSP | Same CSP as authenticated apps | Separate CDN origin, separate CSP — storefront is public, others are not |
| Build order dependency | `@billing/shared` must build before apps | CI: build shared first, then apps in parallel |

---

## Rollback Plan

Because the shell still uses `React.lazy() + Suspense`, you can revert any sub-app to the monolith pattern by changing one line in `Shell.tsx` back to a local import. The `<Suspense fallback={<AppSplash />}>` wrapper already handles both remote and local loading.

---

## Quick Reference — Commands

```bash
# Build everything
pnpm -r build

# Build only pos
pnpm --filter pos build

# Dev — run all apps simultaneously
pnpm --filter shell dev &
pnpm --filter pos dev &       # runs on port 5001
pnpm --filter vendor dev &    # runs on port 5002
pnpm --filter storefront dev  # runs on port 5003

# Type-check all packages
pnpm -r exec tsc --noEmit
```
