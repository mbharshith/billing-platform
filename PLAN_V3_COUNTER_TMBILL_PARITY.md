# CounterApp → Bill Parity Plan (v3)

> **Source of truth:** `AlAdams.docx` — 116-screen walkthrough of Bill back-office
> (`backoffice.Bill.com/admin/*`) running against the "Al Adams Non Veg Restaurant" tenant.
> **Status:** Draft · **Owner:** h · **Last updated:** 2026-07-12
> **Supersedes for feature scope:** `PLAN.md` §5 and `PLAN_V2.md` §7.
> **Does NOT change:** microfrontend architecture (see `MICROFRONTEND_MIGRATION.md`),
> brand system, or fixtures policy.

---

## 0. TL;DR

Bill is a **restaurant-flavoured, multi-outlet POS + back-office** with ~100 admin
screens across 16 top-level sections. Our current CounterApp has **10** pages.
This plan enumerates every Bill surface, marks what we already ship, and slices
the delta into **7 shippable phases** — each phase is 1-2 weeks and leaves the app
in a demoable state.

**Total delta: ~85 new screens, ~40 new domain entities, 6 new role-scoped nav sections.**
We do NOT try to build all of it. §9 lists what we deliberately skip and why.

---

## 1. What Bill actually is (from the doc)

### Tenant context
- Single tenant demo: "Al Adams Non Veg Restaurant"
- Currency: INR (`Rs`), region: India
- Vertical: **Restaurant / F&B** (not grocery — the doc has "Dine In" table depts,
  "Kitchen Department", KDS user types, ZATCA Saudi tax reports, etc.)

### 16 top-level nav sections (verbatim from image1 sidebar)

| # | Section | Sub-count | Notes |
|---|---|---|---|
| 1  | Revenue Dashboard          | 1  | Landing page. KPI tiles + hourly bar chart. |
| 2  | Live Order Tracking        | 1  | Real-time online-order feed. |
| 3  | POS Configuration          | ~11 | Markets, brands, outlets, table mgmt, discounts, promos, tax. |
| 4  | Menu Management            | 7  | Outlet menu, master menu, modifiers, categories, nutrition, bulk upload. |
| 5  | Online Order               | 2  | Order list + digital order settings. |
| 6  | Delivery Platforms         | 1  | Zomato / Swiggy / etc. link table. |
| 7  | Reports                    | ~22 | See §3 for the list. |
| 8  | Centralized Ordering Hub   | 1+ | Cross-outlet order routing. NEW badge. |
| 9  | CRM Hub                    | ~3 | Customer relationship / loyalty. NEW badge. |
| 10 | WhatsApp Marketing         | 1+ | Broadcasts + templates. NEW badge. |
| 11 | Inventory Management       | ~13 | Raw materials, vendors, procurement, stock transfer. |
| 12 | Accounting                 | ~4 | Expense, cash summary, bank, user accounts. NEW badge. |
| 13 | Third Party Integrations   | 1  | ERP / accounting / delivery API keys. |
| 14 | Get Bill Apps            | 1  | Upsell page (POS app / KDS / Captain app). |
| 15 |                | ~2 | Audit + sync history. |
| 16 | Settings                   | ~5 | Profile, payment gateway, webhooks, sessions, logout. |

### Persona split observed in doc

| Persona | Surface | Existing in CounterApp? |
|---|---|---|
| **Owner / Admin** | Full back-office (all 16 sections) | Partial — 5 admin pages |
| **Biller / Cashier** | POS terminal (implied, not shown in doc) | Yes — CashierPage |
| **Captain** | Table-service order-taker (Captain app) | No |
| **KDS** | Kitchen display | No |
| **OrderX** | Central order routing | No |
| **TMS** | Table Management System | No |

The doc only shows the **back-office web console**. It does NOT show the actual
POS terminal, the Captain tablet app, or the KDS. Our existing CashierPage stays
as-is; the delta is almost entirely on the admin/back-office side.

---

## 2. Full Bill screen inventory vs. what we have

Legend:  = ships in CounterApp today ·  = partial ·  = missing · ⏸ = deliberately out of scope

### 2.1 Revenue & live-ops

| Bill screen | Ours | Notes |
|---|---|---|
| Revenue Dashboard (KPI tiles + hourly chart + payment split) |  `DashboardPage` has KPI tiles; needs hourly chart + payment split |
| Live Order Tracking (real-time online orders) |  | Requires online-order pipeline first (§4 Phase 3) |

### 2.2 POS Configuration (11 screens)

| Bill screen | Ours | Notes |
|---|---|---|
| Market (top-level tenant grouping) |  | New entity above `Store` |
| Brand (per-market brand) |  | New entity |
| Outlet (≈ our `Store`) |  `StorePage` covers 1 store; need multi-outlet list |
| Cluster (group of outlets) |  | New entity |
| Outlet Designation |  | Role/title master |
| Outlet User (≈ our `User`) |  `UsersPage` — needs POS/OrderHub type & access-code col |
| Outlet Payment Mode |  | Configurable payment methods per outlet |
| Order Type Configuration (Dine-in / Takeaway / Delivery / etc.) |  | Master data |
| Order Type GL Mapping |  | Accounting glue |
| Master Configuration |  | Currency / timezone / date-format |
| Tax Product Group |  | Groups products under a tax slab |
| Tax Configuration |  flat 18% in settings; needs multi-slab |
| Kitchen Department |  | For KDS routing |
| Table Department (Dine In / Takeaway / …) |  | Table-type master |
| Table Management (floor plan) |  | Restaurant-only surface |
| Discount |  | % / ₹, cart / line level, coupon codes |
| Customize Discount |  | Per-user / per-role discount caps |
| Additional Charges (packing / service / delivery) |  | |
| Buy X Get Y (promotion engine) |  | |

### 2.3 Menu Management (7 screens)

| Bill screen | Ours | Notes |
|---|---|---|
| Outlet Menu (POS default / digital default flags) |  `ProductsPage` is a flat list; no menu concept |
| Unified Master Menu |  | |
| Option Group (size / temperature / add-ons) |  | |
| Modifier Groups |  | |
| Item Notes |  | |
| Categories |  in `catalog.ts` as string enum; need CRUD table |
| Nutrition Configuration |  | |
| Upload Menu in Bulk (CSV) |  | |

### 2.4 Online Order + Delivery (3 screens)

| Bill screen | Ours | Notes |
|---|---|---|
| Orders (online-order list) |  `SalesPage` handles walk-in only |
| Digital Order Settings |  | |
| Delivery Platforms (Zomato / Swiggy link table) |  | Stub only — real integration is out of scope §9 |

### 2.5 Reports (22 screens)

All  except `SalesPage` which covers the "sales list" role of Biller Wise Summary.

| Report | Ours | Report | Ours |
|---|---|---|---|
| Payment Report        |  | Discount Report          |  |
| Expense Tracking      |  | Biller Wise Summary      |  |
| Order Type Report     |  | Delivery Report          |  |
| Category Report       |  | Day Wise Summary         |  |
| Kitchen Dept Report   |  | Customer Queries         |  |
| Coupon History        |  | Bill Print Report        |  |
| Due Payment Report    |  | Applied Charges          |  |
| Start/Close Day       |  | ZATCA (Saudi VAT)        | ⏸ regulatory, out of scope |
| Shift Wise Report     |  | Logistic Report          |  |
|                       |    | Order Transition Report  |  |
|                       |    | ERP Sync History         | ⏸ integration-dependent |
|                       |    | Jordan History           | ⏸ regulatory |
|                       |    | UPI Report               |  |

### 2.6 CRM, WhatsApp, Centralized Ordering Hub

| Bill screen | Ours | Notes |
|---|---|---|
| Centralized Ordering Hub |  | Only meaningful with multi-outlet + online orders |
| CRM Hub (customer 360 / loyalty / segments) |  `CustomersPage` is a flat list + lending; no loyalty |
| WhatsApp Marketing (broadcasts / templates) |  | Gateway integration ⏸ out of scope §9 |

### 2.7 Inventory Management (13 screens)

Restaurant-grade inventory (raw material → recipe → sold item):

| Bill screen | Ours |
|---|---|
| Locations                            |  |
| Raw Material Category                |  |
| Raw Material Units                   |  |
| Raw Material Group                   |  |
| Raw Material Tax                     |  |
| Inventory Items                      |  |
| Vendor Management                    |  |
| Manual Stock Management              |  |
| Indent Management                    |  |
| Procurement (PO)                     |  |
| Operations                           |  |
| Stock Transfer (Requisition / Transfer / Received / Return) |  |

### 2.8 Accounting, Third-party, Logs, Settings

| Bill screen | Ours | Notes |
|---|---|---|
| Expense Management       |  | |
| Cash Summary (Cash Audit + Cash History) |  | Extension of Start/Close Day |
| Bank Configuration       |  | |
| User Account Management (accounting users) |  `UsersPage` collapses this into staff |
| Third Party Integrations |  | API-key vault |
| Get Bill Apps          | ⏸ | Upsell surface — not a feature |
| Logs (audit + sync)      |  `AuditContext` exists; no viewer page |
| Profile                  |  lives under user menu; needs dedicated page |
| Payment Gateway Config   |  | Real gateway keys ⏸; UI only |
| Webhook Configuration    |  | |
| User Session             |  | Active-session list + revoke |

**Score:** ~10 , ~10 , ~85 , ~5 ⏸.

---

## 3. Design decisions before we start coding

### 3.1 Rename the sub-app?
`CounterApp` currently splits into `CashierApp` + `AdminApp` under `/velvet/cashier`
and `/velvet/admin`. Bill has three physical apps (POS / KDS / Captain) + a
web back-office. **Recommendation:** rename the admin route tree from a flat
`AdminApp` into a nav-tree that mirrors Bill's 16 sections. Cashier stays put.

### 3.2 Where does restaurant-vs-retail branch?
Our fixtures assume retail (products, not menu items with modifiers). Bill is
restaurant-first. **Recommendation:** add a `tenant.vertical: 'retail' | 'restaurant'`
flag; hide restaurant-only surfaces (Table Mgmt, KDS, Modifier Groups) when
`vertical === 'retail'`. This is the same lever KartWise/PLAN_V2 already contemplates.

### 3.3 Data model growth
New entities (rough count): Market, Brand, Cluster, Outlet (rename Store),
Designation, PaymentMode, OrderType, TaxSlab, TaxProductGroup, KitchenDept,
TableDept, Table, Discount, Coupon, AdditionalCharge, Promotion, Menu,
MenuCategory, MenuItem, ModifierGroup, Modifier, Nutrition, OnlineOrder,
DeliveryPlatform, Vendor, RawMaterialCategory, RawMaterialUnit, RawMaterial,
InventoryItem, Indent, PurchaseOrder, StockTransfer, StockReceipt, Expense,
CashAudit, CashTransaction, BankAccount, AuditLog, Webhook, ApiKey, Session,
LoyaltyProgram, Segment, Broadcast.

**Recommendation:** add these to `src/shared/domain/types.ts` **in the phase they
first ship** — do NOT front-load a giant type file. Each phase owns its slice.

### 3.4 Fixtures policy
Existing fixture rule (per repo memory): exactly 3 files import `@shared/fixtures`.
Every new entity needs a `SEED_*` fixture in `src/shared/fixtures/`. This does
NOT need a new importer — the same `db-bootstrap.ts` gets one more line per entity.
Post-Phase-1, the count stays 3.

### 3.5 File-size ceiling
600-line ceiling per repo rules. Every "list + detail" page pair is comfortably
150-250 lines when using the shared `DataTable` + `PageHeader` molecules. Only
Cashier and Dashboard are at risk of blowing past — leave them alone this pass.

---

## 4. Phased rollout — 7 phases, each demoable

Each phase adds nav entries, seed data, pages, and contexts. Every phase ends
with `pnpm build` green and the app looking like a coherent product — never
a half-wired nav item.

### Phase 1 — POS Configuration (foundation) · **~2 weeks · 12 screens**
The whole "how does this tenant run" layer. Everything downstream depends on it.

New pages:
- `AdminApp` sidebar redesign — collapse existing 5 links into new top-level
  nav tree matching Bill's 16 sections. Only "POS Configuration" is populated
  this phase; others show a coming-soon tile.
- Markets · Brands · Outlets (list + edit) · Clusters · Designations
- Payment Modes · Order Types (+ GL mapping stub)
- Tax Slabs · Tax Product Groups
- Discounts (+ Customize Discount caps) · Additional Charges

Domain: `Market`, `Brand`, `Cluster`, `Designation`, `PaymentMode`, `OrderType`,
`TaxSlab`, `TaxProductGroup`, `Discount`, `AdditionalCharge`.

Wire-in: Cashier reads Payment Modes from this config (currently hard-coded);
Sales apply Additional Charges (line total already supports it via `settings.tax`).

### Phase 2 — Menu Management (restaurant model) · **~1.5 weeks · 7 screens**
Ships the restaurant vertical.

- Categories CRUD (replace string enum)
- Modifier Groups · Modifiers · Item Notes · Nutrition
- Outlet Menu (map items → outlet with POS/digital flags)
- Bulk CSV Upload

Domain: `Menu`, `MenuCategory`, `MenuItem`, `ModifierGroup`, `Modifier`, `Nutrition`.

Wire-in: Cashier `ProductGrid` reads from active outlet menu, respects modifiers
(new "modifier picker" modal in Cashier — small addition, existing pattern).

### Phase 3 — Table Management + KDS-lite · **~1.5 weeks · 6 screens**
Turns the app from "grocery counter" into "restaurant terminal".

- Kitchen Departments · Table Departments · Table Management (floor plan)
- Kitchen Display View (read-only route, `/admin/kds`)
- Cashier gets a "Dine-in" toggle → assigns order to table; stays open until closed.

Domain: `KitchenDept`, `TableDept`, `Table`, `TableOrder` (open-tab concept
that lives longer than a `Sale`).

### Phase 4 — Online Orders + Live Tracking · **~2 weeks · 5 screens**
Bridges to KartWise (PLAN_V2) storefront.

- Live Order Tracking (real-time feed — polling MVP, WebSocket later)
- Online Orders list + detail
- Digital Order Settings (delivery radius, cutoff hours, …)
- Delivery Platforms link table (Zomato/Swiggy — stub, no real API)
- Centralized Ordering Hub (multi-outlet routing rules)

Domain: `OnlineOrder`, `DeliveryPlatform`, `RoutingRule`.

### Phase 5 — Reports pack · **~2 weeks · 15 screens**
The heavy but formulaic phase. Every report is `Filter bar → DataTable → CSV export`.
Use one `ReportShell` layout component; each report is a config object + column set.

Ships: Payment · Expense · Order Type · Category · Kitchen Dept · Coupon History
· Due Payment · Start/Close Day · Shift Wise · Discount · Biller Wise · Delivery
· Day Wise Summary · Bill Print · Applied Charges · UPI · Logistic · Order Transition.

Skip: ZATCA · Jordan · ERP Sync History (see §9).

### Phase 6 — Inventory Management (F&B raw materials) · **~2 weeks · 12 screens**
The full raw-material → recipe → sold-item chain.

- Locations · Vendors
- Raw Material: Category · Units · Group · Tax · Items
- Manual Stock · Indent · Procurement · Operations
- Stock Transfer (Requisition / Transfer / Received / Return)

Domain: 12+ new entities. This is the biggest data-model growth phase.

### Phase 7 — CRM + Accounting + Settings polish · **~1.5 weeks · 15 screens**
Long tail. Everything left.

- CRM Hub (customer 360, segments, loyalty points)
- WhatsApp Marketing UI (compose + template list; sending stub §9)
- Expense Mgmt · Cash Summary (Audit + History) · Bank Config
- Third Party Integrations (API-key vault UI)
- Logs viewer (already have `AuditContext` — just needs a page)
- Settings: Profile · Payment Gateway Config · Webhook Config · Sessions

### After Phase 7
Everything from AlAdams that we chose to build is shipped. What's left is §9.

---

## 5. Cross-cutting engineering work (parallel to phases)

| Item | When | Effort |
|---|---|---|
| Sidebar redesign — collapsible tree, active-section highlight | Phase 1 | S |
| `ReportShell` layout component + generic CSV export hook | Phase 5 | S |
| `Filter` bar molecule (date-range + outlet + free-text) — reused everywhere | Phase 1 | S |
| Rename `Store` → `Outlet` across codebase (with re-export shim) | Phase 1 close | S |
| Add `tenant.vertical` flag and use it to hide restaurant-only nav | Phase 2 | XS |
| Live-order WebSocket (upgrade from polling) | Post Phase 4 | M |
| Split `CounterShell` if it crosses 400 lines | as needed | XS |

---

## 6. What we are NOT touching

- `MICROFRONTEND_MIGRATION.md` topology — still shell + sub-apps.
- `brand.ts` / theme system — brand identity is stable.
- Fixtures policy — still exactly 3 importers of `@shared/fixtures`.
- Cashier core ring-up flow — stays as it is, only gets:
  (a) modifier picker (Phase 2), (b) dine-in toggle (Phase 3),
  (c) Payment Modes/Charges from config instead of hard-coded (Phase 1).
- Storefront (`StorefrontApp`) — separate scope, driven by PLAN_V2.

---

## 7. Success criteria per phase

Every phase must end with:
1. `pnpm build` succeeds, no new TypeScript errors.
2. Nav entries land on **real pages**, never "coming soon" (except phases that
   haven't happened yet — those show a coming-soon tile with `NEW` badge).
3. Each new list page uses `DataTable` + `Filter` + `PageHeader`. No bespoke tables.
4. Each new entity has ≥3 seed rows in fixtures.
5. Guardrails file lines: no page over 300 lines, no shared module over 600.
6. Screenshot walkthrough matches Bill layout within reason (nav in same order,
   filter+list pattern preserved). Pixel-perfect NOT required.

---

## 8. First-move: what I need from you

Before I start Phase 1 I need three decisions:

1. **Vertical:** Do we build restaurant-first (matches Bill exactly, easier to
   demo the doc back to you) or keep retail-first (matches PLAN_V2 KartWise
   direction, adds restaurant as an opt-in later)? I recommend **restaurant-first
   with retail fallback via `tenant.vertical` flag** — best of both.
2. **Rename `Store` → `Outlet`?** Bill uses "Outlet" everywhere. Doing the
   rename in Phase 1 costs ~30 min and unlocks vocabulary consistency for the
   next 6 phases.
3. **Phase order:** current order is dependency-driven (Config → Menu → Table →
   Online → Reports → Inventory → CRM). If you want to demo something specific
   sooner (e.g. Live Order Tracking, or a specific report), we can front-load
   its phase — I'll flag the extra scaffolding cost.

Once these three are settled, I start Phase 1 the next turn.

---

## 9. Explicitly out of scope

| Item | Why | Revisit trigger |
|---|---|---|
| Real payment gateway (Razorpay/Stripe) integration | Business + legal setup | First paying tenant |
| Real WhatsApp Business API | Meta approval + template review | Post-launch |
| Real Zomato / Swiggy Partner API | Partner onboarding fee, per-outlet auth | On-demand |
| ZATCA (Saudi VAT) report | Country-specific, needs cert | Saudi tenant onboards |
| Jordan History report | Country-specific | Jordan tenant onboards |
| ERP Sync History (Tally / SAP push) | Integration-specific | First customer asks |
| Multi-currency at Market level | KartWise §12 owns this | Second country |
| Real KDS hardware protocol | Bluetooth printer / thermal printer wire | Pilot tenant |
| SSO (Google / Microsoft) | Auth phase | Post-MVP |
| Mobile Captain app (native) | Ships web-responsive version instead | Pilot feedback |

---

_End of PLAN_V3. Ready to execute on your OK to §8._
