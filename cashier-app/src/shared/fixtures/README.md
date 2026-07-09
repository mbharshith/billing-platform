#  Fixtures — the scrap-me folder

Everything under `src/shared/fixtures/` is **fake demo data**. It exists
so the app runs standalone against IndexedDB with a believable multi-tenant
story on first load. **None of it is production data.**

## What's here

| File | Content | Bytes |
|---|---|---|
| `stores.ts`    | 3 seed tenants (Myntra Mumbai / Flipkart Bengaluru / Walmart Springfield) + their well-known IDs |
| `users.ts`     | 7 demo credentials — one admin + one cashier per tenant, plus the SaaS vendor account |
| `customers.ts` | 7 demo customers scattered across the 3 tenants |
| `products.ts`  | 31 demo SKUs, thematic per tenant (apparel / electronics / grocery) |
| `sales.ts`     | Deterministic seeder that fabricates ~30 sales per tenant across the last 60 days |
| `settings.ts`  | Default store-profile fallback used by `SettingsContext.reset()` |
| `index.ts`     | Barrel — everything re-exported from one place |

## How to scrap it (when the real backend is live)

```bash
# 1. Delete the whole folder
rm -rf src/shared/fixtures/

# 2. Delete these two import sites — they're the only entry points:
#    - src/shared/lib/db-bootstrap.ts  (seed-empty-tables branch)
#    - src/shared/store/SalesContext.tsx  (buildDemoSales call)
#    - src/shared/store/SettingsContext.tsx  (DEFAULT_SETTINGS import)
```

That's it. Nothing in `src/apps/*`, `src/shell/`, `src/shared/atoms|molecules|
organisms|feedback|errors|templates|domain|hooks|store` references anything
here — the fixtures folder is an **isolated leaf**. Grep proves it:

```bash
grep -r "@shared/fixtures" src/  # returns exactly 3 hits
```

## Design rules for this folder

1. **Zero business logic** — pure data + a deterministic seeder.
2. **No exports leak upward** — nothing outside `db-bootstrap`, `SalesContext`,
   or `SettingsContext` may import from `@shared/fixtures`. Add a lint rule
   if we ever get one.
3. **Deterministic** — the sales seeder uses a fixed seed so demos are
   reproducible across reloads.
4. **Multi-tenant obvious** — the three seed tenants are picked to look
   dramatically different (₹ apparel · ₹ electronics · $ grocery) so the
   tenant-isolation story is unmistakable in a 10-second demo.
