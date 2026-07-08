# QuickBill — Refactor & Roadmap

_Last update: 2026-07-08_

## 1. Competitor landscape

| Segment | Product | Angle |
|---|---|---|
| SMB retail (global) | **Square POS** | Card-reader hardware, free tier, marketplace |
| SMB retail (global) | **Shopify POS** | Multi-location, BOPIS, tap-to-pay iPhone |
| Restaurant | **Toast**, **Petpooja** | KDS, table management, split checks |
| Enterprise retail | **Lightspeed / Vend** | Matrix items, PIM, purchase orders |
| Payments-first | **Zettle by PayPal**, **Clover** | Card readers, app marketplace |
| India — SMB ledger | **KhataBook** | Digital udhaari, WhatsApp reminders |
| India — GST invoicing | **Vyapar**, **Marg ERP** | GST, batch tracking, expiry |
| India — F&B | **Petpooja**, **Restora** | Delivery integrations |

## 2. What QuickBill has today

- Multi-tenant + role-based access (master / cashier)
- Cashier terminal, catalog, customers, sales history, drill-down
- Cash / card / **lending** (BNPL) payments
- Dashboard KPIs + top-sellers
- Multi-currency, dark mode, signup, tenant onboarding
- Everything client-side (`localStorage`), no backend required to demo

## 3. Feature gaps ranked by impact

### Tier 1 — table-stakes for a real POS

| Gap | Why it matters | Effort |
|---|---|---|
| **Barcode scan input** (keyboard wedge → auto-add) | Cashier flow is 3× slower without it | S |
| **Receipt delivery** (WhatsApp / email / SMS / print) | Currently on-screen only | M |
| **Refund + void with reason code** (partial voids, restock) | Regulatory + accounting need | M |
| **Discounts** (% or ₹, cart-level & line-level, coupons) | Every promo depends on it | M |
| **Split payment** (part cash + part card) | Extremely common in retail | S |
| **Tax per product** (produce tax-free, cigs high-tax) | Currently flat 18% for the whole cart | S |
| **Stock qty + low-stock alerts** | Prevents overselling | S |
| **Cash drawer open/close reconciliation** (X/Z-report) | Standard retail closing procedure | M |

### Tier 2 — growth-stage

| Gap | Why | Effort |
|---|---|---|
| **Purchase orders + suppliers + GRN** | Real inventory flow needs upstream too | L |
| **Inventory adjustments** (breakage / expiry / transfer) | Shrinkage tracking | M |
| **Expenses ledger** (rent, salary, utilities) | Real net-profit reports | S |
| **Loyalty points / rewards** | Retention driver | M |
| **CSV import for catalog / customers** | Onboarding accelerator | S |
| **Multi-outlet under one master** | We're single-store-per-master today | L |
| **Reports** — daily / weekly / GST / P&L | Table-stakes for accountants | M |

### Tier 3 — modern edges

| Gap | Why | Effort |
|---|---|---|
| **Offline mode with sync** | Wi-Fi drops in real shops | M–L |
| **UPI / QR payment** (India-critical) | Cashless India | M |
| **WhatsApp receipts + credit reminders** | India-critical, sticky | S |
| **Public online storefront** (BOPIS) | Shopify-style angle | L |
| **AI insights** ("Sunday sales dropping — run a promo") | Real differentiator | M |
| **Cross-tab reactivity** (add sale in tab A, tab B updates) | Fixes a UX papercut | S |

## 4. Scalability — where we bleed today

Every context provider does this on mount:

```
localStorage.getItem('sales')     // 200 KB blob
   ↓ JSON.parse                    // sync, blocks main thread
   ↓ useState<Sale[]>(all)         // holds everything in memory
   ↓ .filter(s => s.storeId === X) // O(n) on every re-render
```

Concrete pain points:
1. **All-or-nothing loads** — dashboard for tenant A parses tenant B's sales too
2. **No indexes** — every filter is a linear scan (`.filter(...)`)
3. **5 MB hard cap** on localStorage
4. **Sync API** — big writes block the frame
5. **No cross-tab awareness** — writes don't propagate
6. **No versioning** — schema evolution corrupts old snapshots
7. **`money()`-style helpers** used to be hidden globals — cured by `useMoney()`, similar cures needed for other domain helpers (tax, invoice numbering, permissions per row)

## 5. Refactor strategy — "fewer endpoints, less storage"

### 5A. Storage → IndexedDB via Dexie (single dependency)

Replace 8 giant `useState` arrays with a typed Dexie DB. Each table indexed by `storeId` (+ compound indexes where needed).

```ts
// src/lib/db.ts
export const db = new Dexie('quickbill');
db.version(1).stores({
  stores:    'id, name',
  users:     'id, [storeId+username], storeId',
  products:  'id, [storeId+sku], storeId, category',
  customers: 'id, [storeId+phone], storeId',
  sales:     'id, [storeId+createdAt], storeId, cashierId, customerPhone',
});
```

**Wins:**
- Filters become B-tree lookups: `db.sales.where('[storeId+createdAt]').between([sid, start],[sid, end])` — O(log n)
- Storage limit jumps from 5 MB → ~10% of free disk (GBs)
- Async, non-blocking writes
- Native change-events → cross-tab reactivity via `BroadcastChannel`
- Built-in schema versioning + migrations

Contexts collapse from ~1000 LOC of ad-hoc CRUD to thin query hooks:

```ts
const { data: sales, isLoading } = useLiveQuery(
  () => db.sales
    .where('[storeId+createdAt]')
    .between([storeId, start], [storeId, end])
    .reverse()
    .offset(page * 20).limit(20)
    .toArray(),
  [storeId, start, end, page]
);
```

**Estimated LOC reduction:** ~1200 → ~350 across the 5 store contexts.

### 5B. Backend (when we add one) → single sync endpoint

Instead of 20 REST endpoints, one delta-sync endpoint:

```
POST /api/sync
Body:  { cursor: "abc123", changes: [<localChanges>] }
Reply: { cursor: "def456", changes: [<serverChanges>] }
```

Server just stores changes keyed by `(entity, id, updatedAt, deletedAt)`. Client applies remote changes, ships local ones. Classic CouchDB / RxDB replication protocol.

Advantages over REST-per-entity:
- **One contract** = one auth gate, one rate limiter, one observability path
- **Offline-first for free** — client works without network, syncs when back
- **Bandwidth-efficient** — only changed rows travel, gzipped batches
- **Multi-device** — same account on phone + tablet, both auto-sync
- **Auditable** — every change is a row in the log

### 5C. Reduce data-in-motion

- **Persisted receipts** — instead of storing every `saleLine.name/price` (denormalization at 200 bytes per line × 1000 sales), store only `productId`+`qty`+`priceAtSale`, resolve name at display time
- **Aggregates as views** — nightly rollup: `sales_daily(storeId, date, revenue, count)` written by client on close-day, dashboard reads the rollup not the raw sales
- **Sparse fields** — customers rarely change; only sync `updatedAt > lastSyncedAt`

### 5D. Front-end perf

- Route-based code splitting (Sales/Products/Dashboard as lazy chunks) — first paint ~50% faster
- Virtualize long tables (`@tanstack/react-virtual`)
- Move dashboard aggregations into a Web Worker so they don't block scroll

## 6. Recommended sequencing (my opinion)

1. **Storage refactor to Dexie/IndexedDB** — biggest architectural win, unblocks everything else. ~2 days.
2. **Feature: barcode scan + split payment + discounts + per-product tax** — 4 quick wins that make the app feel like a real POS. ~2 days.
3. **Feature: receipt delivery (WhatsApp/email/print) + refund flow** — customer-facing polish. ~1 day.
4. **Reports page** (daily/weekly/monthly + GST/tax + P&L). ~1 day.
5. **Backend `POST /sync` + optional cloud persistence** — turns a demo into a product. ~2 days.
6. **Offline mode + cross-tab reactivity + PWA install** — the "always works" feel. ~1 day.

Total to a genuinely competitive product: **~9 focused days.**

## 7. What NOT to do (YAGNI)

- Don't add REST-per-entity endpoints — go straight to the sync endpoint if we're adding a backend
- Don't build multi-outlet before we have real users asking for it
- Don't ship a full POS hardware SDK — the barcode-scanner keyboard wedge covers 90% of cases for free
- Don't build a public storefront until the in-store flow is bulletproof
