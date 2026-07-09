# QuickBill → **KartWise** — Product & Technical Plan v2

> **Status:** Draft v2 · **Owner:** h · **Last updated:** 2026-07-09
> **Supersedes:** [PLAN.md](./PLAN.md) (kept for history — see §16 diff)
>
> Pivot: from **"cloud POS for one physical shop"** to **"unified retail OS — in-store billing + customer-facing online delivery — one tenant, one catalog, one inventory."**

---

## 0. Why we're rewriting the plan

`PLAN.md` scoped a **B2B SaaS POS**. One user surface: the cashier terminal. The customer never touched the software; they walked to the counter, paid, walked out.

The market has moved. Every kirana we'd sell into is now watching Blinkit eat their walk-in traffic. **Selling them a POS that _only_ solves the counter is selling them yesterday's problem.** The competitive angle in 2026 is:

> "One system that runs your counter **and** puts your shop online for delivery — without you paying Blinkit 25% commission."

That's a genuinely new product, not a POS with a bolted-on cart. Which means the plan needs to grow a second head:

| Old (v1) | New (v2) |
|---|---|
| 1 user surface (cashier) | **3 user surfaces** (cashier terminal, customer storefront, fulfillment console) |
| 1 role tree (vendor / admin / cashier) | **6 roles** (+ picker, rider, customer) |
| No orders — only sales | Sales **and** orders (different lifecycles) |
| Storage-only (Dexie) demo viable | Storefront needs a real backend on day one (multi-device, payment, address, live status) |
| One data model | Two aligned models (POS transaction vs delivery order) |
| Break-even: 1 tenant × ₹1,500/mo | Break-even: 1 tenant × ₹2,999/mo + per-order fee |

---

## 1. Renaming — the app is not "QuickBill" anymore

### Naming criteria
- Reads well in English + Hindi/Kannada speaker's mouth (target: Indian SMB retail)
- `.com` and `.in` available (must-have)
- Suggests **both** billing/retail AND online commerce — not just one
- Trademark-clean in class 9 (software) and class 35 (retail services)
- ≤ 8 letters, one word if possible (URL and shop-signage friendly)

### Candidates

| Name | Vibe | .com/.in | Notes |
|---|---|---|---|
| **KartWise** ⭐ | Retail-first, "smart cart" | likely | Front-runner. "Kart" = commerce, "Wise" = analytics/insight. Works for both counter + delivery. |
| **ShopBridge** | Bridge between in-store & online | likely | Very literal, slightly enterprise-flavored |
| **DukaanOS** | "Dukaan" (shop) + OS positioning | check | Culturally native, but "Dukaan" (Y Combinator) already claimed that word in India — trademark risk |
| **NearBuy** | Hyperlocal-delivery flavor | doubtful | `nearbuy.com` was a Groupon India spin-out; likely conflict |
| **StorePath** | Journey-of-a-shop | likely | Bland |
| **Tillzo** | Modern take on "till" (cash drawer) | probable | Too POS-centric, misses delivery angle |
| **Kirana+** | Direct-to-persona | trademark hell | Emoji-heavy; "Kirana" is generic |

**Recommendation:** `KartWise`. Substituted throughout the rest of this doc; final call after a `.com`/USPTO/IPIndia sweep.

**Repo rename plan:** `Billing/` → `kartwise/`; `cashier-app/` → `kartwise-web/`; `cashier-api/` → `kartwise-api/`. Deferred to Phase 0 close (§8).

---

## 2. Product Vision (v2)

**KartWise is a retail operating system for physical shops that also want to sell online — without paying a 25% aggregator tax.**

Three surfaces, one backend, one catalog, one inventory:

1. **Counter** — the current cashier terminal. Ring up walk-ins.
2. **Storefront** — a customer-facing web/PWA app the shop hands out via QR / WhatsApp / signage. Customers browse the same catalog, place delivery or pickup orders.
3. **Fulfillment** — a tablet-optimized console for pickers and riders. Order queue, pick list, out-for-delivery, proof-of-delivery.

**Design principles (unchanged from v1) + new:**
5. **One catalog, one stock number.** A tomato sold at the counter must decrement the same row as a tomato ordered online. No parallel inventories.
6. **Storefront must feel like Blinkit, not like a form.** Sub-2s LCP, offline browse, one-tap reorder, live order tracking.
7. **Delivery is opt-in per tenant.** A pilot kirana that just wants a counter can turn off the whole storefront module and pay the POS-only tier.

---

## 3. Competitive Landscape

The 2026 map. We are **not** competing head-on with any of these — we're arming the shops they threaten.

### 3A. Q-commerce / online grocery aggregators (they own the demand)

| Player | Model | Delivery ETA | Commission to shop | Where they hurt |
|---|---|---|---|---|
| **Blinkit** (Zomato) | Dark-store, 1P inventory | 10–15 min | N/A (they own stock) | Owns eyeballs; every kirana loses ~20% of top-line to them |
| **Zepto** | Dark-store, 1P | 10 min | N/A | Fastest UX; strong Bangalore/Mumbai |
| **Swiggy Instamart** | Dark-store, 1P + partner-store hybrid | 15–20 min | 20–30% on partner SKUs | Bundled with food delivery habit |
| **BigBasket** (Tata) | Hybrid: scheduled + BB Now (10 min) | 10 min – next day | 15–25% partner fee | Weekly-shop use case |
| **DMart Ready** | Click-and-collect + slotted delivery | 4h – next day | Owned inventory | Price leader; weakest UX |
| **JioMart** | Kirana-partnered (still) + 1P | 1–3 days | ~10% | Distribution reach, weak app |
| **Amazon Fresh** | 1P + Amazon logistics | 2h – next day | N/A | Metro premium |
| **ONDC storefronts** (Paytm, Magicpin, MyStore) | Federated | Varies | 2–7% + logistics | ⭐ **Massive opportunity — we plug into ONDC as a Seller Node.** |

**Insight:** every aggregator monetizes by **owning demand and renting it back to shops at 20–30%**. We flip the script: shops own their own storefront, pay us a flat SaaS fee, keep 100% of GMV. ONDC unbundles discovery from fulfillment, so a KartWise shop can be discoverable on Paytm/Magicpin **without** giving up the customer relationship.

### 3B. POS + storefront combos (our real category)

| Player | Strength | Weakness → our wedge |
|---|---|---|
| **Shopify POS** | Beautiful storefront; global | ₹4k–₹20k/mo, USD-priced, not built for kirana-scale (100 SKUs, no bank card) |
| **Square + Square Online** | Free POS, free storefront | US/UK only, no India presence |
| **Petpooja** | F&B-only; delivery integrations | Doesn't do grocery / general retail |
| **Vyapar / Marg** | Deep GST invoicing | Zero customer-facing storefront |
| **Dukaan (YC)** | Cheap DTC storefront | No POS, no inventory, no pickup, generic |
| **Bikayi** | WhatsApp-first storefront | Discontinued 2024 (worth learning from their post-mortem) |

**Our wedge:** the **only** product a ₹5-lakh/mo turnover kirana can adopt in a weekend that gives them (a) a modern counter, (b) their own delivery-capable storefront, and (c) ONDC-federated discovery — for under ₹5k/mo.

### 3C. Delivery/ops-only tools (we integrate, don't compete)

| Player | What they do | We use them for |
|---|---|---|
| **Shiprocket / Delhivery / Porter** | Last-mile courier | Fallback rider when shop has no in-house delivery |
| **Dunzo (defunct) / Rapido / Borzo** | Hyperlocal instant | Same |
| **Razorpay / Cashfree / PhonePe PG** | Payment gateway | Storefront checkout |
| **Google Maps / MapmyIndia** | Geocoding, ETAs | Address entry + rider tracking |

---

## 4. Personas & Roles (v2)

### Six roles now

| Role | Surface | Scope | Sample actions |
|---|---|---|---|
| **vendor** (SaaS owner) | `/vendor/*` | cross-tenant | provision/suspend tenants, view fleet metrics |
| **admin** (shop owner) | `/*` counter shell | one tenant | edit catalog, prices, delivery-slot config, staff |
| **cashier** | `/cashier` only | one tenant | ring up walk-ins |
| **picker** 🆕 | `/fulfillment` on tablet | one tenant | see order queue, pick items, pack, mark ready |
| **rider** 🆕 | `/rider` on phone | one tenant (or freelance pool later) | claim order, out-for-delivery, POD |
| **customer** 🆕 | `/shop/<tenant-slug>/*` | one tenant per session | browse, cart, order, track, reorder |

### Persona-level use cases

**Walk-in shopper (existing):** unchanged — cashier flow.

**Online-delivery customer:**
1. Scans shop's QR poster or clicks WhatsApp link → `shop.kartwise.in/<tenant-slug>`
2. Browses catalog (offline-capable PWA)
3. Adds to cart, enters address (geocoded), picks time slot (or "ASAP")
4. Pays via UPI intent / card / **Cash on Delivery**
5. Sees live status: `PLACED → ACCEPTED → PICKING → READY → OUT_FOR_DELIVERY → DELIVERED`
6. Rates the order; can re-order in 2 taps

**Picker (shop staff on a tablet):**
1. Sees incoming order queue sorted by delivery-slot urgency
2. Prints/reads pick list (SKU + shelf hint + qty)
3. Marks each line **picked / substituted / out-of-stock** (customer approves substitution via push)
4. Packs, marks `READY_FOR_PICKUP`

**Rider (shop staff or external courier):**
1. Sees `READY` orders on phone, claims one (or is auto-assigned)
2. Navigates via Google Maps deep-link
3. On arrival, taps **Delivered** + captures OTP / photo POD
4. Cash orders: records ₹ collected → auto-reconciles to a cash-drawer entry

**Shop owner / admin (existing role, expanded):**
- All old POS controls +
- Configure delivery zones (pincode allow-list, radius, per-zone fees)
- Configure time slots ("10–11 AM: 8 slots max")
- Toggle SKU-level flags: `sellOnline`, `substitutable`, `packOfWeight`
- Reports: online vs counter mix, cancellation reasons, avg fulfillment time

---

## 5. Product Surfaces & Routing

Three logical apps, **one repo, one build system**, code-split at route level.

```
kartwise-web/                         (Vite React SPA, hash → BrowserRouter)
├── /login, /signup                   public
├── /vendor/*                         VendorRoute       — SaaS owner
├── /  → /cashier, /sales, /products, /customers, /users, /settings, /store, /dashboard
│                                     Counter shell     — admin + cashier
├── /fulfillment/*    🆕              FulfillmentRoute  — admin + picker
│   ├── /queue                        live order feed
│   ├── /orders/:id                   pick-and-pack detail
│   └── /slots                        slot capacity board
├── /rider/*          🆕              RiderRoute        — admin + rider (mobile-optimized)
│   ├── /available                    unclaimed READY orders
│   ├── /active                       my current runs
│   └── /orders/:id                   navigate, POD
└── /shop/:tenantSlug/*   🆕          Public (no auth)  — customer storefront
    ├── /                             catalog home
    ├── /c/:category
    ├── /p/:sku
    ├── /cart
    ├── /checkout                     address + slot + payment
    ├── /orders/:id                   live tracking
    └── /account                      order history, addresses
```

**Why one repo, three shells:** shared design system, shared API client, shared types. Cost of splitting into three repos in Phase 0 = zero benefit, huge coordination tax. We revisit only if the customer-facing bundle needs to ship separately (probably never — code-split handles it).

**Bundle strategy:**
- Counter shell: current bundle, admin + cashier chunks (~150 KB gz)
- Fulfillment: lazy chunk, only picker devices load it (~40 KB gz)
- Rider: lazy chunk, mobile-first, ultra-minimal (~30 KB gz)
- Storefront: **separate entry** (`src/storefront/main.tsx`) — must be sub-100 KB gz for first paint under 2s on 3G. Shares design tokens + a subset of atoms only.

---

## 6. Data Model (v2)

Everything from v1 stays. New collections added:

```
tenants
├── users              (existing + new roles: picker, rider, customer)
├── stores             (existing)
├── products           (existing + new fields: sellOnline, substitutable, onlinePrice?, imageUrl, weightGrams, packOfWeight)
├── customers          (existing — now dual-use: walk-in ledger + online buyers)
├── sales              (existing — counter walk-ins only)
├── customerPayments   (existing)
│
├── orders             🆕 online delivery/pickup orders
├── orderLines         🆕 sub-doc or FK — with pickStatus per line
├── addresses          🆕 customer-owned, geocoded
├── deliveryZones      🆕 per tenant — pincode/radius rules
├── deliverySlots      🆕 per tenant, per day — capacity board
├── riderAssignments   🆕 order↔rider join with lifecycle timestamps
├── stockLedger        🆕 immutable movement log (sale, order-reserve, pick, adjust, receive)
└── auditEntries       (existing, extended with order.* actions)
```

### The critical new entity — `Order`

```ts
export interface Order {
  readonly id: string;
  readonly orderNo: string;                    // human-friendly, per tenant
  readonly tenantSlug: string;                 // for URL/lookup
  readonly storeId: string;
  readonly customerId: string;
  readonly channel: 'storefront' | 'whatsapp' | 'ondc' | 'phone';
  readonly fulfillment: 'delivery' | 'pickup';
  readonly status: OrderStatus;                // see §7 state machine
  readonly slotId: string | null;              // null for pickup or ASAP
  readonly deliveryAddress: Address | null;    // null for pickup
  readonly deliveryFee: number;
  readonly lines: readonly OrderLine[];
  readonly subtotal: number;
  readonly tax: number;
  readonly total: number;
  readonly paymentMethod: 'upi' | 'card' | 'cod' | 'wallet';
  readonly paymentStatus: 'pending' | 'authorized' | 'captured' | 'refunded' | 'failed';
  readonly paymentRef: string | null;          // Razorpay orderId etc.
  readonly assignedRiderId: string | null;
  readonly placedAt: Iso8601;
  readonly acceptedAt: Iso8601 | null;
  readonly pickedAt:   Iso8601 | null;
  readonly readyAt:    Iso8601 | null;
  readonly outAt:      Iso8601 | null;
  readonly deliveredAt:Iso8601 | null;
  readonly cancelledAt:Iso8601 | null;
  readonly cancelReason: string | null;
  readonly rating: 1 | 2 | 3 | 4 | 5 | null;
  readonly customerNote: string | null;
}

export interface OrderLine {
  readonly productId: string;
  readonly sku: string;
  readonly name: string;
  readonly requestedQty: number;
  readonly pickedQty: number;                   // may be < requested (partial)
  readonly substitutedProductId: string | null;
  readonly unitPrice: number;
  readonly lineTotal: number;
  readonly pickStatus: 'pending' | 'picked' | 'substituted' | 'unavailable';
}
```

### Stock ledger (the reconciliation truth)

We stop mutating `product.stock` in place. Every movement writes an immutable ledger row:

```ts
export interface StockMovement {
  readonly id: string;
  readonly productId: string;
  readonly storeId: string;
  readonly delta: number;                       // negative = out, positive = in
  readonly reason: 'sale' | 'order_reserve' | 'order_release'
                 | 'order_pick' | 'adjustment' | 'receive' | 'return';
  readonly refType: 'sale' | 'order' | 'adjustment' | 'grn';
  readonly refId: string;
  readonly at: Iso8601;
  readonly by: string;                          // userId
}
```

`product.stock` becomes a **projection**: `SUM(delta) WHERE productId = X`. Cached, invalidated on write. This finally solves the counter-vs-online race: the storefront reserves stock at cart lock; the counter can still oversell only if the reservation TTL expires. No more parallel inventories.

---

## 7. Order Lifecycle (state machine)

```
                                     ┌─── cancel (by customer, before ACCEPTED)
                                     │
  PLACED ──accept──► ACCEPTED ──pick──► PICKING ──packed──► READY
                                                                │
                                                                ├──delivery──► ASSIGNED ──pickup──► OUT_FOR_DELIVERY ──deliver──► DELIVERED
                                                                │                                                      │
                                                                └──pickup──►                        ─pickup by cust──► DELIVERED
                                                                                                                       │
                                                                                                                       └─► RATED (optional)

  Any state ──shop-cancel──► CANCELLED (reason required, refund triggered if paid)
```

Rules encoded:
- `PLACED → CANCELLED` allowed for customer (5-min grace)
- After `ACCEPTED`, only shop can cancel (with refund + reason)
- `OUT_FOR_DELIVERY → DELIVERED` requires POD (OTP or photo)
- `DELIVERED → REFUNDED` only via admin, writes reverse stock movement + refund PG call

State transitions live in `kartwise-api/src/features/orders/lifecycle.ts` — one file, one source of truth, unit-tested exhaustively.

---

## 8. Architecture (v2)

The single biggest change: **the backend is no longer optional.**

v1 could demo entirely from `localStorage`/Dexie. v2 cannot — an online-delivery flow needs:
- Server-authoritative order state (customer's phone and shop's tablet must agree)
- Payment gateway callbacks (Razorpay webhooks land server-side)
- Push notifications (order status updates)
- Multi-device sync (customer places on phone, shop sees on tablet, rider sees on phone)

### Stack additions to v1

| Layer | v1 choice | v2 addition |
|---|---|---|
| Backend | Express + Node 20 (unchanged) | + **Fastify migration considered** for perf; benchmark before committing |
| DB | MongoDB Atlas (unchanged) | + **Redis** for order queue, slot locks, stock reservation TTLs |
| Real-time | none | **Server-Sent Events** (not WebSockets — one-way is enough, cheaper). Order status stream. |
| Payments | none | **Razorpay Standard Checkout** + webhook handler. Cashfree as fallback. |
| Push | none | **FCM (web push)** for storefront + rider apps |
| Geocoding | none | **Mapbox** (₹0 tier: 100k calls/mo) with MapmyIndia fallback for Indian-address fidelity |
| Storage | none (image URLs later) | **Cloudflare R2** for product images (₹0 egress) |
| Search | Dexie `.filter` | **Meilisearch** (self-hosted single node) for storefront catalog search — Mongo `$text` too weak for typo-tolerant grocery search |
| Delivery integration | none | **Shiprocket API** for on-demand courier when no in-house rider |
| ONDC | none | Deferred to Phase 2 — architected as a **channel adapter** (`channel: 'ondc'` already in Order) |

### Repo layout (v2)

```
kartwise/
├── GUARDRAILS.md
├── PLAN.md                v1 (kept)
├── PLAN_V2.md             this doc
├── kartwise-web/
│   └── src/
│       ├── counter/       (old cashier-app minus storefront)
│       ├── fulfillment/   🆕
│       ├── rider/         🆕
│       ├── storefront/    🆕 separate entry, minimal bundle
│       ├── shared/        design tokens, atoms used everywhere
│       └── api/           typed API client (auto-gen from Zod)
├── kartwise-api/
│   └── src/
│       └── features/
│           ├── auth, products, customers, sales   (existing)
│           ├── orders/       🆕 lifecycle + queries
│           ├── slots/        🆕
│           ├── zones/        🆕
│           ├── payments/     🆕 razorpay adapter + webhooks
│           ├── stock/        🆕 ledger + projections
│           ├── notifications/🆕 fcm + email + whatsapp
│           └── channels/     🆕 storefront | whatsapp | ondc adapters
└── infra/
    ├── docker-compose.yml
    ├── nginx/               🆕 route splitting (shop.*, app.*, api.*)
    └── terraform/           deferred to Phase 2
```

### DNS / subdomain layout

- `app.kartwise.in` → counter + fulfillment + rider (auth-required)
- `shop.kartwise.in/<slug>` → per-tenant storefront (public)
- `api.kartwise.in` → backend
- `admin.kartwise.in` → vendor console (v-level auth)
- Custom domains later (Phase 2): tenant can point `shop.<their-brand>.in` at us via CNAME + Let's Encrypt automation

---

## 9. Multi-tenancy (v2 tweaks)

Same tenant-per-row model as v1. New per-tenant config knobs (all `tenants.settings.*`):

```ts
{
  onlineDeliveryEnabled: boolean,          // master switch
  deliveryModes: ('delivery' | 'pickup')[],
  paymentModes: ('upi'|'card'|'cod'|'wallet')[],
  minOrderValue: number,
  freeDeliveryAbove: number,
  slotConfig: { openHour, closeHour, slotMinutes, capacityPerSlot },
  courierFallback: 'none' | 'shiprocket' | 'porter',
  ondcEnabled: boolean,                     // Phase 2
  storefrontTheme: { primary, logo, tagline }
}
```

Onboarding a new tenant now asks 3 more questions during setup wizard; if `onlineDeliveryEnabled=false` the whole storefront app is 404 for that slug. **Delivery is an add-on, not a forced upgrade.**

---

## 10. Fulfillment Models (per tenant preference)

| Model | Who picks | Who delivers | Typical shop |
|---|---|---|---|
| **Shop-front, in-house rider** | Shop staff | Shop's own delivery boy | Kirana with 1–2 riders |
| **Shop-front, courier fallback** | Shop staff | Shiprocket/Porter API-called | Bakery, boutique — occasional delivery |
| **Pickup only (BOPIS)** | Shop staff | Customer walks in | Pharmacy, electronics |
| **Dark-store** | Dedicated pickers | Riders (in-house or pooled) | Rare in our SMB segment; Phase 3 |

Storefront UX adapts to the shop's chosen model. Pickup-only tenants never show delivery-address fields.

---

## 11. Payments

Storefront checkout flow (v2):

```
Cart → Address → Slot → Payment method:
  ├─ UPI (default, ~70% of Indian retail)  → Razorpay UPI intent → deep-link Paytm/PhonePe/GPay
  ├─ Card                                   → Razorpay Standard Checkout
  ├─ Wallet                                 → Razorpay Wallets
  └─ Cash on Delivery (COD)                → order placed with paymentStatus=pending; rider collects
```

**Reconciliation:** every payment event (created / authorized / captured / refunded) is a row in `payments` collection, linked to the order. Nightly job cross-checks with Razorpay settlement report. Mismatches raise a vendor-visible alert.

**COD risk mitigation:**
- Configurable COD ceiling per tenant (default ₹2,000)
- Repeat-COD-cancellers blocked automatically after 3 no-shows (customer-level flag)

---

## 12. Delivery Slots + Rider Assignment

**Slots** are per-tenant, per-day, capacity-limited. Model:

```ts
interface DeliverySlot {
  id: string;
  tenantId: string;
  date: string;                   // YYYY-MM-DD
  startsAt: Iso8601;
  endsAt: Iso8601;
  capacity: number;
  bookedCount: number;
  status: 'open' | 'closed' | 'full';
}
```

Auto-generated 7 days ahead from `slotConfig`. Locked in Redis during checkout (60-second reservation).

**Rider assignment** — three modes (per tenant):

1. **Pull:** riders see queue, self-claim (default for small shops)
2. **Round-robin push:** system assigns next `READY` order to next available rider
3. **Manual:** admin drags-and-drops in fulfillment console

All three write to `riderAssignments`. Rider ETA computed from `assignedAt + travelTime(store→address)` via Mapbox.

---

## 13. Roadmap (v2)

Reshuffled from v1 §6 to make room for delivery.

| Phase | Trigger | Clients | Duration | Infra budget |
|---|---|---|---|---|
| **0 — Counter pilot** (unchanged) | POS works end-to-end | 1 | done → wrap | < ₹1.5k/mo |
| **1 — Delivery MVP** 🆕 | Backend + storefront + orders + COD-only | 1 pilot | 4–6 weeks | ~₹3k/mo |
| **2 — Payments + polish** | UPI/card, slots, ratings, push | 3–5 | 4 weeks | ~₹5k/mo |
| **3 — Growth** | Multi-store, ONDC seller node, custom domains | 10–50 | 3–6 months | ~₹30k/mo |
| **4 — Scale** | Rider pool marketplace, dark-store mode | 100+ | ongoing | ₹1L+/mo |

### Phase 1 (Delivery MVP) — concrete backlog

**Backend (kartwise-api)**
- [ ] Finish existing Express endpoints (still not done from v1)
- [ ] `orders`, `slots`, `zones` feature modules
- [ ] Stock ledger + projection cache
- [ ] Razorpay adapter (skeleton, mocked in Phase 1 — COD only)
- [ ] SSE endpoint `/api/orders/:id/stream` for live status
- [ ] Seed script with a demo storefront tenant

**Frontend (kartwise-web)**
- [ ] Repo rename + folder reshuffle
- [ ] Extract storefront as a separate Vite entry
- [ ] Storefront pages: home, category, PDP, cart, checkout, tracking, account
- [ ] Fulfillment console (tablet): queue, pick screen
- [ ] Rider app (mobile): available/active/POD
- [ ] Admin: slot config, zone editor, sellOnline toggles
- [ ] Reports: online-vs-counter mix

**Ops**
- [ ] Register `kartwise.in`, `kartwise.com` (if available)
- [ ] Docker Compose adds Redis + Meilisearch
- [ ] Nginx routing (shop.* vs app.*)
- [ ] Cloudflare R2 bucket for product images
- [ ] FCM project set up for web push

### What we defer, hard

- **In-house rider marketplace / rider payouts** — Phase 4
- **ONDC seller node integration** — Phase 3 (but data model is ready)
- **Native mobile apps** — never for storefront (PWA); consider React Native for rider only after 20+ tenants ask
- **Live chat / WhatsApp bot for support** — Phase 3
- **Loyalty / referral / coupons** — Phase 2 tail
- **Multi-currency for storefront** — Phase 3 (single-currency per tenant works fine for India-first)

---

## 14. Risk Register (v2 additions)

Everything from v1 §10 still applies. New risks:

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Payment webhook missed → order stuck in `pending` | Medium | High | Idempotent handlers + hourly reconciliation cron against Razorpay REST |
| Storefront looks unprofessional → customer trusts Blinkit instead | High | High | Ship storefront design polish _first_, features _second_ |
| Stock oversell (counter + online race) | High | High | Ledger + reservation TTL + optimistic UI with rollback |
| COD cancellation abuse | Medium | Medium | Auto-block after N no-shows; COD ceiling per tenant |
| Rider goes offline mid-delivery | Medium | Medium | 15-min silent → nudge; 30-min → alert admin; POD mandatory |
| Shop can't handle first-day order surge | Medium | High | Slot capacity + soft-open onboarding; "pause new orders" kill switch |
| ONDC seller-node compliance drift | Low (until Phase 3) | Medium | Adapter isolation; delay adoption until spec stabilizes |
| GDPR/DPDP: customer PII on storefront | High | High | Encrypt-at-rest for addresses + phone; audit log; deletion API from day one |
| Aggregator retaliation (Blinkit undercuts) | Low | Medium | We don't compete on price — we compete on ownership |

---

## 15. Success Metrics (Phase 1 close)

| Metric | Target |
|---|---|
| Tenants with storefront live | ≥ 1 |
| Storefront LCP (3G) | < 2.5 s |
| Orders placed via storefront | ≥ 100 |
| Order-to-delivered median time | < 45 min |
| Order cancellation rate | < 10% |
| Storefront checkout conversion (add-to-cart → placed) | > 40% |
| Stock oversell incidents | 0 |
| Payment reconciliation mismatch (₹) | 0 |
| Repeat customer rate (30-day) | > 20% |

---

## 16. Diff from v1 (what changes, what stays)

| Area | v1 says | v2 says |
|---|---|---|
| **Product scope** | Cloud POS | Retail OS: POS + customer storefront + fulfillment |
| **Name** | QuickBill | **KartWise** (subject to trademark check) |
| **User surfaces** | 1 (cashier) | 3 (counter, fulfillment, rider) + 1 public (storefront) |
| **Roles** | vendor/admin/cashier | + picker, rider, customer |
| **Entities** | products, sales, customers, users, stores | + orders, addresses, deliveryZones, deliverySlots, riderAssignments, stockLedger, payments |
| **Storage** | Dexie-only demo viable | Dexie for counter offline cache, **Mongo primary** required Day-1 |
| **Backend timing** | Deferred to "when we need it" | **Required for Phase 1** — storefront can't fake it |
| **Payment gateway** | Later | Phase 2 (Razorpay); COD in Phase 1 |
| **Real-time** | Not needed | SSE required for order tracking |
| **Pricing** | ₹1,499 Starter | ₹1,499 POS-only / ₹2,999 POS+Storefront / ₹4,999 + rider tools |
| **Break-even** | 1 client @ ₹1,500 | 1 client @ ₹2,999 (higher infra, higher price, same margin) |
| **Competitors** | Square, Shopify, KhataBook, Vyapar | **+** Blinkit, Zepto, Swiggy Instamart, BigBasket, ONDC, Dukaan |
| **Deferred** | Public storefront ("Phase 3") | **Storefront is the whole point** — moved to Phase 1 |
| **Not deferring anymore** |  | Storefront, orders, slots, zones, stock ledger, push, SSE |
| **Still deferring** |  Enterprise SSO, dark-store mode | Same + native apps, rider marketplace, loyalty, multi-currency storefront |

Things v1 got right that we keep verbatim:
- Multi-tenancy day one
- `tenantId` on every row
- Boring-tech stack
- Portability discipline (Docker Compose everywhere)
- Solo-dev risk mitigation
- Sentry + UptimeRobot for observability
- MongoDB choice
- LLP / legal timing

---

## 17. Open questions (need your call before coding starts)

1. **Name:** OK to proceed with `KartWise` pending trademark sweep, or want to explore more?
2. **India-first vs global-first storefront:** UPI + INR + DPDP as defaults (implying India-only Phase 1), or keep it currency/locale-neutral from day one? (v1 was neutral; v2 default is India-first because that's where q-commerce pain is loudest.)
3. **Delivery MVP scope:** COD-only for Phase 1 (fastest ship), or block on Razorpay integration too?
4. **Rider app in Phase 1 or Phase 2?** Feasible to run the pilot with the admin manually assigning riders (WhatsApp) and skip the rider app for 4 weeks — buys us 1 week.
5. **ONDC:** commit now to the seller-node adapter interface even without integrating, or truly defer to Phase 3?
6. **Repo split:** one repo three shells (my recommendation) vs splitting the storefront into its own repo now?
7. **Domain purchases:** shall I check availability + suggest a short-list?

---

## 18. Change Log

| Date | Version | Change |
|---|---|---|
| 2026-07-06 | v1 | Initial POS-only plan |
| 2026-07-09 | v2 | Pivot to POS + online delivery; rename to KartWise; new personas, entities, phases |

---

*Every assumption in this doc will be wrong within 90 days. Update as you learn.*
