# TMBill Al-Adams Parity — Implementation Gap Analysis

> Comparison of **what's implemented in KartWise** vs the **TMBill Al Adams Non Veg** walkthrough (`AlAdams.docx`, 116 screenshots from `backoffice.tmbill.com`).
>
> Last updated: 2026-07-12 · Against commit `c82c88f`.

---

## Legend

| Label | Meaning |
|:-:|---|
| `DONE` | **Implemented** — real CRUD, seed data, DataTable, form modal, activate/delete flow |
| `STUB` | **Stubbed** — route exists, sidebar link exists, seed data may exist, but page shows placeholder |
| `MISS` | **Missing entirely** — no route, no domain type, no seed data |
| `SKIP` | **Skip / not planned** — cosmetic, promo, or platform-specific (e.g. Get TMBill Apps) |

---

## Top-level navigation (TMBill's 16 sections)

| # | TMBill section | Status | Location / notes |
|:--|---|:-:|---|
| 1 | **Revenue Dashboard** | `STUB` | `/admin` — existing `DashboardPage` (basic metrics; missing per-payment-mode breakdown + hourly revenue chart) |
| 2 | **Live Order Tracking** | `STUB` | `/admin/live-orders` — StubPage |
| 3 | **POS Configuration** | `DONE*` | See section POS Config below — 8/13 sub-items done |
| 4 | **Menu Management** | `DONE*` | See section Menu below — 5/7 sub-items done |
| 5 | **Online Order** | `STUB` | Partial — see section Online below |
| 6 | **Delivery Platforms** | `DONE` | `/admin/aggregators` CRUD works, but per-outlet platform-publish flow missing |
| 7 | **Reports** | `STUB` | 7 report routes exist as StubPage; 15+ TMBill reports not scaffolded |
| 8 | **Centralized Ordering Hub** (NEW) | `MISS` | Multi-outlet order routing — no route, no domain |
| 9 | **CRM Hub** (NEW) | `DONE*` | Have Customers/Groups/Loyalty/Coupons/Feedback; missing Segments, Campaigns, SMS templates |
| 10 | **WhatsApp Marketing** (NEW) | `MISS` | Zero coverage |
| 11 | **Inventory Management** | `STUB` | See section Inventory below — 3/10 sub-groups — massive gap |
| 12 | **Accounting** (NEW) | `MISS` | Zero coverage — no ledger, expense, journal, P&L |
| 13 | **Third Party Integrations** | `MISS` | Zero coverage — no Tally/Zoho/GST/payment-gateway hooks |
| 14 | **Get TMBill Apps** | `SKIP` | Marketing promo — not needed |
| 15 | **Logs** | `STUB` | We have `auditLog` table in DB but no viewer UI |
| 16 | **Settings** | `DONE*` | `/admin/settings` exists but only tenant settings — no user-preferences, notification prefs, printer prefs |

**Score: 4 done (partial) · 8 stubbed · 4 missing entirely · out of 16 sections**

---

## POS Configuration — 13 TMBill sub-screens

TMBill nests these under `POS Configuration` (expandable):

| Sub-menu / screen | Status | KartWise route / notes |
|---|:-:|---|
| Outlet Configuration | `DONE` | Have `Markets` + `Brands` + `Outlets` — over-modelled vs TMBill's flat outlet list |
| Master Configuration - Tax Product Group | `MISS` | Group multiple tax slabs into a bundle applied to menu categories |
| Master Configuration - Tax Configuration | `DONE` | `/admin/tax-slabs` |
| Master Configuration - Kitchen Department | `DONE*` | We have `KotStation` model but TMBill separates "kitchen department" (routing rule) from "KOT station" (printer) |
| Master Configuration - Table Department | `MISS` | Dine-in / Takeaway / Delivery classification for tables — currently a hardcoded enum |
| Master Configuration - Table Management | `DONE` | `/admin/tables` + `/admin/sections` |
| Discount | `DONE` | `/admin/discounts` |
| Customize Discount | `MISS` | Rule-based discount ("First bill of day", "Every 3rd order") — separate from named Discount |
| Additional Charges | `DONE` | `/admin/charges` |
| Buy X Get Y | `STUB` | We have `bogo` as a Discount `type` but no rule editor (item selector for X and Y) |
| Payment Modes | `DONE` | `/admin/payment-modes` |
| Order Types | `DONE` | `/admin/order-types` |
| Reasons | `DONE` | `/admin/reasons` |
| Print & Terminal Settings | `STUB` | Have `OutletSettings` domain type + seed row + StubPage; needs form UI |

**Score: 8 done · 2 stubbed · 3 missing**

---

## Menu Management — 5 TMBill sub-screens + attributes

| TMBill screen | Status | KartWise route / notes |
|---|:-:|---|
| Menu Categories | `DONE` | `/admin/menu-categories` — with sort order + KOT station routing |
| Menu Items (Products) | `DONE` | `/admin/products` — existing ProductsPage (has image, SKU, price, category, stock) |
| Item Variants | `DONE` | `/admin/variants` |
| Item Modifiers | `DONE` | `/admin/modifiers` (single/multi type, options with price delta) |
| Combos | `DONE` | `/admin/combos` |
| Menu Attributes (Veg/Non-veg tag, Spicy tag, Allergen tags) | `MISS` | Al Adams uses veg/non-veg badges heavily on receipts + menu cards |
| Menu Availability Timings (Breakfast/Lunch/Dinner slots) | `MISS` | TMBill items can be limited to time-of-day |
| Bulk Menu Import (Excel/CSV) | `MISS` | No import UI |
| Menu Sync (push to Zomato/Swiggy) | `MISS` | Aggregator config exists but menu-sync trigger absent |

**Score: 5 done · 4 missing**

---

## Online Order — 3 TMBill screens

| TMBill screen | Status | Notes |
|---|:-:|---|
| Orders (all aggregator orders unified) | `STUB` | `/admin/online-orders` = StubPage. Existing `/admin/sales` shows sales but doesn't filter by channel=aggregator |
| Digital Order Settings | `MISS` | Auto-accept, cancellation window, item-out-of-stock behaviour per aggregator |
| Live Order Tracking | `STUB` | Need a kanban with rider / status columns |

**Score: 0 done · 2 stubbed · 1 missing**

---

## Delivery Platforms — 3 TMBill screens

| TMBill screen | Status | Notes |
|---|:-:|---|
| Aggregator Config (Zomato/Swiggy/UberEats/Dunzo/Own) | `DONE` | `/admin/aggregators` — provider, commission %, auto-accept |
| Delivery Zones | `DONE` | `/admin/delivery-zones` — pincodes, min-order, fee, ETA |
| Platform Menu Publish (per-outlet publish state) | `MISS` | TMBill shows "Outlet List" with Published-At timestamp — we lack the publish workflow |

**Score: 2 done · 1 missing**

---

## Reports — 22 TMBill reports

| Category | TMBill reports | KartWise status |
|---|---|:-:|
| Sales | Sales Summary, Bill-wise Sales, Item-wise Sales, Category-wise Sales, Day/Month/Year sales | `STUB` x1 (`reports/sales`) |
| Product | Product Mix, Top 20 items, Non-moving items, Menu Category Report | `STUB` x1 (`reports/products`) |
| Time-based | Hourly Sales, Day-part sales, Peak-hour heatmap | `STUB` x1 (`reports/hourly`) |
| Discounts | Discount usage, Coupon redemption, Free-item report | `STUB` x1 (`reports/discounts`) |
| Tax | GST summary, HSN-wise tax, Tax invoice register | `STUB` x1 (`reports/tax`) |
| Cashier | Cashier-wise sales, Cash-drawer report, Shift report, Void/refund log | `STUB` x1 (`reports/cashier`) |
| Wastage | Wastage by ingredient, Wastage by shift, Cost-impact report | `STUB` x1 (`reports/wastage`) |
| Inventory | Stock summary, Low-stock, Batch expiry, Reorder alerts, Consumption vs sales | `MISS` x5 |
| Payments | Payment mode breakdown, Aggregator settlement, Zomato/Swiggy commission | `MISS` x3 |
| Customers | Top customers, New vs returning, Frequency, Lifetime value | `MISS` x4 |
| KOT | KOT wait-time, KOT cancellation, KOT-to-bill ratio | `MISS` x3 |
| Comparative | Outlet-wise sales, YoY, MoM, WoW | `MISS` x4 |

**Score: 0 real · 7 stubs · 15+ missing**

---

## Centralized Ordering Hub (NEW) — 100% missing

Multi-outlet order routing (order rings at HQ, gets pushed to the nearest outlet).

Missing screens: `Hub Dashboard`, `Order Routing Rules`, `Outlet Distance Config`, `Delivery Zone Overlap`.

---

## CRM Hub (NEW)

| TMBill screen | Status | Notes |
|---|:-:|---|
| Customers (list, detail) | `DONE` | `/admin/customers` + `/admin/customers/:id` (existing) |
| Customer Groups | `DONE` | `/admin/customer-groups` |
| Loyalty Tiers | `DONE` | `/admin/loyalty` |
| Coupons | `DONE` | `/admin/coupons` |
| Feedback | `DONE` | `/admin/feedback` |
| Segments (behaviour-based cohorts) | `MISS` | e.g. "Ordered 3+ times in last month" |
| Campaigns (bulk SMS/email) | `MISS` | Campaign builder + audience picker |
| SMS/Email templates | `MISS` | Reusable templates for OTP, bill, offer |
| Birthday/Anniversary automation | `MISS` | Auto-trigger rules |

**Score: 5 done · 4 missing**

---

## WhatsApp Marketing (NEW) — 100% missing

TMBill exposes: `Templates`, `Broadcast`, `Automated Journeys`, `Chat inbox`, `WhatsApp Business API config`.

We have zero — needs a whole new domain (WhatsAppTemplate, Broadcast, Journey, ChatMessage).

---

## Inventory Management — 10 TMBill sub-groups (HUGE gap)

TMBill's Inventory sidebar (from image80 in the doc):

| Sub-group | TMBill screens | Status |
|---|---|:-:|
| Locations | Warehouse list, transfer-in/out points | `MISS` |
| Raw Material Management | Ingredients (`DONE`), Categories, Units of Measure, Conversion factors | `DONE*` (only Ingredients) |
| Vendor Management | Vendor Details (`DONE` as Suppliers), Payments Receivable | `DONE*` (missing Payments Receivable ledger) |
| Manual Stock Management | Opening stock, Manual add/deduct, Stock adjustment | `MISS` |
| Indent Management (NEW) | Indent requests from outlets to central warehouse | `MISS` |
| Procurement | Purchase Orders (`STUB`), GRN (Goods Receipt Note), Purchase Invoice, PO approval workflow | `STUB` (only PO stub, no GRN) |
| Operations | Production Batch, Recipe consumption, Semi-finished goods | `MISS` |
| Stock Transfer | Inter-outlet transfer, Transfer approval | `MISS` |
| Inventory Reports | Stock report, Consumption, Wastage (`DONE`), Vendor-wise purchase | `DONE*` (only Wastage) |
| Recipes | Recipe editor with BoM | `STUB` (seed data exists) |

**Score: 0 fully done · 5 partial · 5 fully missing**

**This is the single biggest gap in the app.**

---

## Accounting (NEW) — 100% missing

Inferred from other restaurant SaaS + the fact that TMBill Accounting is an expandable section:
- Chart of Accounts
- Journal Entries
- Expense Categories
- Expenses (record)
- Vendor Bills (payable)
- Customer Invoices (receivable)
- Trial Balance
- P&L Statement
- Balance Sheet
- GST Reports (GSTR-1, GSTR-3B)
- Bank Reconciliation
- Cash Book

**Zero coverage.** Needs its own domain module + probably a double-entry ledger.

---

## Third Party Integrations — 100% missing

TMBill supports: Tally, Zoho Books, Petpooja, Payment Gateways (Razorpay/Paytm), SMS Gateways, Email SMTP, Google Reviews, GST filing tools.

**Zero coverage.** Needs an `Integrations` page + credential-vault UI + per-integration test-connection.

---

## Logs — 100% missing UI

We have `auditLog` table in DB with (`at`, `actorUsername`, `targetStoreId`, `action`) — but no viewer UI.

Missing: Audit log viewer, Login history, Failed login attempts, API request log, KOT print log, Bill re-print log.

---

## Settings — TMBill sub-items

Currently `/admin/settings` = tenant-level settings. TMBill exposes much more:

| TMBill setting | Status | Notes |
|---|:-:|---|
| Restaurant Profile | `DONE` | `/admin/store` |
| Tax settings | `DONE` | via Tax Slabs page |
| Print settings | `STUB` | `OutletSettings` seeded, no form yet |
| Notification preferences (Email/SMS/Push) | `MISS` | |
| Currency & locale | `DONE` | Per-outlet currency exists |
| Backup & restore | `MISS` | Local IDB export/import missing |
| API keys / Webhook settings | `MISS` | |
| User preferences (theme, default page) | `DONE*` | Theme toggle exists |
| Data purge / Reset demo data | `DONE*` | Exists but not exposed in settings page |

---

## Cashier / POS terminal side (parallel to admin)

The doc's screens are 100% backoffice — but Al Adams shows implicitly what the cashier terminal must support:

| Feature | Status | Notes |
|---|:-:|---|
| Cashier terminal (touch POS grid) | `DONE` | `/cashier` — existing `CashierPage` |
| Table map with real-time status | `MISS` | We have `DiningTable` seed with `status` but no map view |
| KOT print / re-print | `MISS` | |
| Bill split (by items, by amount, by pax) | `MISS` | Existing checkout only supports single bill |
| Order type switch (Dine-in / Takeaway) | `DONE*` | `channel` field on Sale exists |
| Item modifier selection dialog | `MISS` | Modifiers seeded but not consumed by cashier |
| Combo selection | `MISS` | Combos seeded but not consumed |
| Discount apply mid-cart | `DONE*` | Existing checkout supports single-line discount |
| Manager override (PIN prompt for voids) | `MISS` | |
| Void / cancel with reason (uses Reasons Master) | `MISS` | |
| Bill hold & recall | `MISS` | |
| Kitchen Display System (KDS) | `STUB` | Route exists, no UI |

---

## Bottom line — what you can honestly say ships today

| Bucket | Real UI | Stubs | Notes |
|---|:-:|:-:|---|
| POS Config (Phase 1) | 8 | 2 | Missing Tax Product Group, Table Department, Customize Discount |
| Menu Management (Phase 2) | 5 | 0 | Missing bulk import, timings, veg/non-veg tag |
| Tables & KDS (Phase 3) | 3 | 1 | KDS itself is a stub — needs kanban UI |
| Online & Delivery (Phase 4) | 2 | 2 | Aggregator config works; live-order tracking + digital settings missing |
| Reports (Phase 5) | 0 | 7 | Need chart engine + real report queries |
| Inventory (Phase 6) | 3 | 2 | 5 whole TMBill sub-groups missing (Locations, Indent, Manual Stock, Ops, Stock Transfer) |
| CRM (Phase 7) | 5 | 0 | Missing Segments/Campaigns/Templates |
| **Missing top-level sections** | 0 | 0 | Centralized Ordering Hub, WhatsApp Marketing, Accounting, Third Party Integrations, Logs viewer |
| **Cashier UX gaps** | | | Table map, KOT print, bill split, manager override, modifier picker, combo picker, void-with-reason |

**Rough parity: ~40% of TMBill's screens have a route + UI · ~30% are stubs · ~30% missing entirely.**

The **admin console skeleton** is done — sidebar, layout, table + CRUD template, seed data, DB schema. What remains is:
1. **Filling in the ~30 stub routes** (mostly writing forms + wiring hooks)
2. **Adding ~40-50 net-new routes** for the missing top-level sections
3. **Building 15+ real reports** with charts + filters
4. **Extending cashier terminal** to consume modifiers/combos/table-map/void-with-reason
5. **Accounting module** — brand-new subsystem
6. **Third-party integrations shell** — credentials vault + connector plugins

---

## Suggested next-turn priorities (in ROI order)

1. **Inventory expansion** (biggest gap, high customer value) — Locations, Manual Stock, GRN, Stock Transfer
2. **Reports engine** — Sales, Product Mix, Hourly, Cashier, Tax reports with real charts (Chart.js already in the ecosystem)
3. **Cashier UX** — table map, modifier picker, combo picker, void-with-reason (uses existing Reasons Master)
4. **KDS kanban** — station-scoped, live-updating, colour-coded by wait time
5. **Accounting bootstrap** — Chart of Accounts + Expenses + Vendor Bills (minimum viable)
6. **WhatsApp / SMS templates** — simplest of the missing NEW sections
7. **Menu attributes** — veg/non-veg tag + availability timings (small effort, high visual impact)
8. **Logs viewer** — audit log already in DB, just need the read-only table page
9. **Centralized Ordering Hub** — needs prerequisite work in Inventory + Order routing algorithm
10. **Third Party Integrations** — mostly a plugin shell, real value depends on business relationships
