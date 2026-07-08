# Cashier POS — Product & Technical Plan

> **Status:** Draft v1 · **Owner:** h · **Last updated:** 2026-07-06
>
> A pragmatic, bootstrap-friendly plan for launching a billing/POS SaaS with 1 client, designed to scale to hundreds without a rewrite.

---

## 1. Executive Summary

Build a **cloud-hosted cashier/billing SaaS** for small-to-mid retail stores. Launch with a single pilot client at near-zero infrastructure cost (< ₹1,500/month), prove product-market fit, then scale infra in lockstep with revenue.

**Non-goals:** enterprise-scale from day one, replicating full-fledged ERPs, competing with Square/Shopify head-on.

**North-star metric:** paying tenants with > 70% gross margin per tenant.

---

## 2. Product Vision

A modern, opinionated point-of-sale system for physical retail:

- **Cashier terminal** — ring up sales, take cash / card / lending payments
- **Inventory** — live stock movement, low-stock alerts
- **Customer ledger** — mobile-based lookup, lending balance, payment history
- **Reports** — daily revenue, top products, lending outstanding
- **Multi-user** — admin + cashier roles per store
- **Multi-tenant SaaS** — one deploy serves many stores

**Design principles:**

1. **Boring tech wins** — Postgres/Mongo, Express, React. No exotic frameworks.
2. **Portable everything** — Docker + env vars → runs on laptop, Hetzner, AWS, WCNP.
3. **Pay for time, not scale** — free tiers everywhere until revenue justifies otherwise.
4. **Design for the second client on day one** — `tenantId` in every row from the start.

---

## 3. Target Customers & Use Cases

### Primary personas

| Persona | Pain today | What we sell them |
|---|---|---|
| **Kirana / mid-size grocery** (owner-operator) | Excel + calculator + paper credit book; no visibility | Digital POS + credit tracking + reports |
| **Small pharmacy / bakery / boutique** | Legacy Windows POS with clunky UX | Modern cloud POS, works on any browser |
| **Multi-outlet chain (2–10 stores)** | Siloed data per store, no consolidated view | Multi-store dashboard |

### Core use cases (MVP)

1. **Ring up a sale** — cashier scans/taps items, checks out
2. **Take cash / card / lending payment** — lending requires mobile capture
3. **Record customer payment** against outstanding lending balance
4. **View daily sales dashboard** — revenue, unit count, top products
5. **Check inventory** — remaining stock, low-stock alerts
6. **Manage products** — add/edit/deactivate SKUs
7. **Manage staff** — invite cashiers, revoke access
8. **Print/email receipt** — customer-facing document

### Deferred (Phase 2+)

- Barcode scanner integration (hardware)
- GST invoicing / e-invoice compliance
- Multi-branch inventory transfers
- Vendor / purchase order management
- Loyalty programs
- Public customer app

---

## 4. Tech Stack (with rationale)

| Layer | Choice | Why |
|---|---|---|
| **Frontend** | React 18 + TypeScript + Vite | Modern, fast, atomic-design-friendly. TypeScript keeps us honest. |
| **Styling** | CSS modules + design tokens (app-tokens.css pattern) | Zero runtime cost. Fully portable. §1 guardrails compliant. |
| **State** | Context + useReducer (Phase 0) → Redux Toolkit + RTK Query when we add backend | State-locality ladder. Don't pay for Redux before we need it. |
| **Backend** | Node.js 20 + Express + TypeScript | Ubiquitous, hire-able, small memory footprint, Docker-friendly. |
| **Database** | MongoDB (Atlas) | Schema flexibility for products/sales/receipts. Free tier generous. |
| **Auth** | Own JWT (bcrypt-hashed passwords) | No Firebase lock-in. Portable to any deploy. |
| **Validation** | Zod | One schema → runtime validation + TS types. |
| **Logging** | Pino + correlation IDs | Structured JSON logs. Fast. Ships to any aggregator. |
| **Security** | Helmet + CORS allowlist + express-rate-limit | Standard hardening. Env-driven. |
| **Container** | Docker + docker-compose | Runs identically from laptop to prod. Zero lock-in. |
| **Deploy target** | Hetzner VPS (₹450/mo) → later: WCNP / AWS / GCP | Cheapest safe path. Docker means migration = one `compose up`. |
| **CI/CD** | GitHub Actions | Free tier ample for one repo. |
| **Monitoring** | Sentry (free) + UptimeRobot (free) | ₹0. Enough signal until we have real traffic. |

### Explicitly rejected (with reasons)

| Rejected | Why not |
|---|---|
| **Firebase / Firestore** | Vendor lock-in, painful for transactional data, chatty read costs, no clean SQL-style joins for reports |
| **Kubernetes** | One container. YAGNI. Overkill until 20+ services. |
| **GraphQL** | REST + Zod is simpler for our surface. Revisit if we ever have 3+ consumer apps. |
| **Serverless / Lambda** | Cold starts hurt POS UX; per-request pricing is unpredictable at scale |
| **Microservices** | Modular monolith first. Extract services only when a specific one is genuinely a bottleneck. |
| **Datadog / New Relic** | ₹5k+/mo, unnecessary at our scale |

---

## 5. Architecture Overview

### High-level

```
┌─────────────────────┐            ┌─────────────────────────┐
│  React SPA (Vite)   │  ──HTTPS──▶│  Express API (Node 20)  │
│  atomic design      │            │  Zod validation         │
│  hash routing       │            │  JWT auth, RBAC         │
└─────────────────────┘            │  Correlation IDs        │
                                   │  Pino logs              │
                                   └─────────┬───────────────┘
                                             │
                                    ┌────────▼────────┐
                                    │   MongoDB       │
                                    │   (Atlas M0)    │
                                    └─────────────────┘
```

### Repository layout

```
Billing/
├── GUARDRAILS.md          engineering rulebook
├── PLAN.md                this document
├── cashier-app/           React frontend (built)
│   ├── src/
│   │   ├── components/    atoms/molecules/organisms/templates
│   │   ├── pages/
│   │   ├── domain/        types, strings, formatters, mock catalog
│   │   ├── store/         Context + useReducer
│   │   └── styles/        tokens.css, globals.css
│   └── package.json
└── cashier-api/           Express backend (scaffolded)
    ├── src/
    │   ├── config/        env, db, logger, openapi
    │   ├── middleware/    auth, validate, errorHandler, correlationId
    │   ├── common/        errors, asyncHandler, pagination
    │   ├── features/      auth, products, customers, sales, reports, health
    │   └── main.ts
    ├── Dockerfile
    └── docker-compose.yml
```

### Multi-tenancy strategy (baked in day one)

- Every business entity carries `tenantId: string`
- JWT includes `tenantId` — middleware injects into every query
- Single Mongo database, shared collections, indexed on `{ tenantId, ...}`
- **Never** query without a `tenantId` filter — enforce via base service class
- Migration to per-tenant databases is possible later; single-tenant retrofit into multi-tenant is a rewrite → do it now

---

## 6. Phased Roadmap

| Phase | Trigger | Clients | Duration | Infra budget |
|---|---|---|---|---|
| **0 — Pilot** | Product ready for 1 friendly client | 1 | 1–3 months | < ₹1,500/mo |
| **1 — Early revenue** | 3+ paying clients, MRR > ₹15k | 3–10 | 3–6 months | ₹3,000/mo |
| **2 — Growth** | MRR > ₹1L, need reliability | 10–100 | 6–12 months | ₹30,000/mo |
| **3 — Scale** | MRR > ₹10L, enterprise deals in pipeline | 100+ | ongoing | ₹1–2L+/mo |

### Phase 0 (current focus) — deliverables

- [x] React frontend with cashier + dashboard pages (atomic design)
- [x] Brand-agnostic design tokens
- [ ] Express API — auth, products, customers, sales, reports (scaffolded, in progress)
- [ ] MongoDB seeding with sample tenant + admin user
- [ ] Docker Compose for one-command local run
- [ ] Frontend wired to backend (replace mock catalog with API calls)
- [ ] Deploy to Hetzner VPS (or Render free tier for pilot)
- [ ] Custom domain + Cloudflare SSL
- [ ] Pilot client onboarded, first real sale recorded
- [ ] Feedback loop: bug list, feature requests captured
- [ ] Basic Terms of Service + Privacy Policy

### Phase 1 — additions

- [ ] Multi-store per tenant
- [ ] Barcode scanner support (browser USB HID)
- [ ] Print receipt via thermal printer (browser print CSS + ESC/POS if needed)
- [ ] GST-compliant invoice format
- [ ] Automated daily Mongo backup to Backblaze B2
- [ ] Sentry paid tier if noise justifies
- [ ] First support docs (Notion or GitBook free)
- [ ] LLP registration + current account
- [ ] Client MSA template (lawyer-vetted)
- [ ] Pricing page + self-serve signup (or manual onboarding still fine)

### Phase 2 — reliability & growth

- [ ] Mongo Atlas M10 (or M20) replica set
- [ ] Redis for session/cache
- [ ] 2+ API instances behind a load balancer
- [ ] Blue-green or rolling deploys with zero downtime
- [ ] Full audit trail on money-touching operations
- [ ] Role customization per tenant
- [ ] Basic role-based reports (cashier sees own sales, admin sees all)
- [ ] Feature flags (Unleash / Flagsmith free tier)
- [ ] E2E tests (Playwright) for top user flows
- [ ] First support hire or CS tool (Chatwoot / Freshdesk free)

### Phase 3 — enterprise/scale

- [ ] Multi-region deployment (DR)
- [ ] SSO integration (SAML / OIDC) for enterprise clients
- [ ] SOC 2 Type I readiness
- [ ] Dedicated infra tier for large clients
- [ ] SLA-backed uptime commitments
- [ ] SRE + on-call rotation

---

## 7. Budget by Phase (INR)

### Phase 0 — Tier 2 recommended (~₹10–15k / year)

**One-time**
| Item | Cost |
|---|---|
| `.com` domain × 2 years | ₹1,600 |
| Logo (DIY or basic Fiverr) | ₹0–2,000 |
| ToS + Privacy Policy (Termly / Iubenda / template) | ₹0–3,000 |
| **Subtotal one-time** | **₹1,600–6,600** |

**Monthly recurring**
| Item | Cost |
|---|---|
| Hetzner CX11 VPS (Docker Compose host) | ₹450 |
| MongoDB Atlas M0 (free) | ₹0 |
| Frontend on Vercel/Cloudflare Pages (free) | ₹0 |
| Backblaze B2 backup storage | ₹80 |
| Zoho Mail Lite (professional email) | ₹85 |
| Cloudflare, Sentry, UptimeRobot (all free tiers) | ₹0 |
| Resend/Brevo transactional email (free tier) | ₹0 |
| **Subtotal recurring** | **~₹615/mo** |

**Year 1 all-in: ~₹9,000–13,000 (excl. dev time)**

Break-even: **1 client at ₹1,500/mo covers costs with margin.**

### Phase 1 — realistic bootstrap with legal (~₹55k–90k / year)

Add:
- LLP registration: ~₹10,000 one-time
- MSA / contract template: ₹8k–15k one-time
- CA retainer + GST filings: ~₹1,500/mo
- Zoho Books paid: ~₹750/mo
- Mongo Atlas M10 (when needed): ₹700/mo
- Sentry / observability upgrades: ₹0–800/mo

### Phase 2 — ~₹30,000/mo infra, target MRR > ₹1L

See section 6.

### Phase 3 — ₹1L+/mo infra, target MRR > ₹10L

See section 6.

---

## 8. Unit Economics

### Pricing assumptions

| Tier | Target segment | Price/mo | Included |
|---|---|---|---|
| **Starter** | Single-store shop | ₹1,499 | 1 store, 3 users, unlimited txns |
| **Growth** | Multi-store SMB | ₹4,999 | 5 stores, 15 users, reports |
| **Business** | 10+ store chain | ₹14,999 | Unlimited stores, priority support |

Assume most clients start on Growth (₹5k/mo blended average).

### Cost per client (blended)

| Clients | Monthly infra | Cost / client | Gross margin @ ₹5k ARPU |
|---|---|---|---|
| 1 | ₹615 | ₹615 | 88% |
| 5 | ₹700 | ₹140 | 97% |
| 10 | ₹2,500 | ₹250 | 95% |
| 50 | ₹15,000 | ₹300 | 94% |
| 100 | ₹30,000 | ₹300 | 94% |
| 500 | ₹80,000 | ₹160 | 97% |

**Gross margin stays > 88% throughout.** Excellent SaaS economics.

Real costs eating margin at scale: **support + sales + engineering headcount**, not infra.

---

## 9. Multi-Tenancy Strategy

### Data model

```
tenants
├── users        (belongs to tenant)
├── stores       (belongs to tenant)
├── products     (belongs to tenant, unique sku per tenant)
├── customers    (belongs to tenant, unique mobile per tenant)
├── sales        (belongs to tenant + store)
└── payments     (belongs to tenant + customer)
```

### Isolation rules

- Every Mongoose query passes through a helper that injects `{ tenantId }` from the request context
- Middleware extracts `tenantId` from the JWT and puts it on `req.tenant`
- Index every collection on `{ tenantId, ...primaryKey }` for query performance
- No cross-tenant admin panel until Phase 3 (single-tenant admin view sufficient for pilots)

### Onboarding a new tenant

1. Admin POSTs `/api/v1/tenants` with name + admin user details
2. Backend creates: tenant doc + admin user + default store + seeds sample products
3. Returns temporary password via email
4. Admin logs in, changes password, invites cashiers

---

## 10. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Pilot client churns | Medium | High | Weekly feedback loop, easy exit, no long contract |
| Data loss / corruption | Low | Catastrophic | Daily automated backup + monthly restore test |
| Security breach / password leak | Medium | High | Bcrypt hashing, JWT with short expiry, rate limiting, no PII in logs |
| Regulatory (GST, DPDP) | Medium | Medium | LLP + CA from Phase 1; DPDP-compliant privacy policy |
| Founder burnout (solo dev) | High | Catastrophic | Weekly cap on features shipped; automate what's automatable |
| Wrong pricing (too cheap → no margin) | High | High | Publish price → measure conversion; iterate every 30 days |
| Feature creep from client | High | Medium | Written roadmap; every request rated {ship, backlog, no} |
| Infra outage during business hours | Low | High | UptimeRobot alerts to phone; documented rollback via `docker compose down` + previous image tag |
| Vendor lock-in creep | Low | Medium | Regular audit: "if we lost X provider tomorrow, how bad?" |
| Competitor cuts price | Medium | Low | Own the niche (specific vertical); don't compete on price |

---

## 11. Migration Paths (Portability)

Design tenets that keep the exit door open at all times:

| From | To | Effort |
|---|---|---|
| Hetzner VPS | AWS EC2 / GCP CE / Azure VM | 1 day (Docker Compose ports directly) |
| Docker Compose | Kubernetes / ECS | ~1 week (need Helm charts / task definitions) |
| MongoDB Atlas M0 → M10 → M20 | Same vendor, one-click |
| MongoDB → self-hosted | Managed → mongodump/restore | ~2 days |
| MongoDB → Postgres (if needed) | Bigger — 2–4 weeks | schema mapping + rewrite queries |
| Vercel/Cloudflare Pages | Any static host + CDN | half day |
| Own auth → Auth0/Clerk | Migration script + user re-enrollment | 1 week |
| Own API → serverless | Refactor per-endpoint | project |

**Nothing in the stack is a one-way door.**

---

## 12. Current Status

### Built 

- React + TypeScript + Vite frontend
- Atomic design: 8 atoms, 8 molecules, 8 organisms, 1 template, 2 pages
- Design token system (zero hex codes in components)
- Cashier page: product grid, cart, payment modal (Cash/Card/Lending), receipt
- Dashboard page: KPIs, recent sales, top products, inventory table
- Hash routing, keyboard a11y, focus rings, WCAG 2.2 AA touch targets
- 57 KB gzipped bundle, well under performance budget

### In progress 

- Express + Mongo backend (dependencies installed, main files not yet written)
- Docker Compose stack (compose file exists, needs backend code)

### Not started ⏳

- Frontend wiring to real API (currently uses mock catalog)
- Multi-tenancy layer
- Deployment to real hosting
- Domain + SSL
- Pilot client outreach

---

## 13. Immediate Next Steps (2-week sprint)

**Week 1 — backend + integration**
- [ ] Finish Express API: auth, products, sales, customers, reports endpoints
- [ ] Seed script with sample tenant, admin, cashier, 20 products
- [ ] Postman/HTTP collection for manual testing
- [ ] Add API client to React app (replace mock catalog with real fetch)
- [ ] Login screen + JWT storage
- [ ] Wire cashier flow end-to-end: login → ring up sale → see in dashboard

**Week 2 — deploy + polish**
- [ ] Buy domain + set up Cloudflare
- [ ] Deploy backend to Hetzner (or Render free) via Docker Compose
- [ ] Deploy frontend to Vercel / Cloudflare Pages
- [ ] Set up Sentry + UptimeRobot
- [ ] Write onboarding doc (5-page PDF/Notion)
- [ ] Reach out to 3 potential pilot clients with a demo link

---

## 14. Success Metrics (Phase 0)

| Metric | Target (3-month horizon) |
|---|---|
| Pilot clients live | ≥ 1 |
| Weekly active users | ≥ 3 |
| Sales recorded in system | ≥ 500 |
| Uptime | ≥ 99% |
| p95 API response time | < 500 ms |
| Front-end LCP | < 2.5 s |
| Critical bugs open | 0 |
| Customer NPS (informal) | ≥ 7 |
| Monthly infra spend | < ₹1,500 |
| Time from bug report → fix in prod | < 48 hrs |

---

## 15. Assumptions & Open Questions

### Assumptions
- Founder is solo dev with ~10 hrs/week
- Pilot client is a friendly, patient, feedback-giving user
- Indian retail context (INR, GST, kirana/small-shop vocabulary)
- Web-first UI (no native mobile in Phase 0)
- English UI only in Phase 0 (i18n framework in place for later)

### Open questions
- [ ] Pricing: freemium tier, or paid from day one?
- [ ] Hardware: do pilot clients need barcode scanners / thermal printers in v1?
- [ ] Payment gateway: Razorpay integration for subscriptions — Phase 0 or 1?
- [ ] Support model: email-only vs WhatsApp?
- [ ] Marketing: cold outreach, LinkedIn, or wait for referrals?
- [ ] Legal: LLP now or after first paying client?

---

## 16. Appendix — Cost Comparison Reference

### Firebase vs Own API — 1,000 stores, moderate real-time dashboard use

| Path | Annual cost |
|---|---|
| Firebase | ~₹1.44 crore |
| Own API on AWS | ~₹3.25 lakh |
| Own API on Indian cloud | ~₹2 lakh |
| Own API on Hetzner | ~₹1 lakh |
| Own API on WCNP (internal) | ~₹0 |

Firebase penalty at scale: **~44–100× more expensive** than a self-hosted stack for this workload.

### Firebase break-even
- **< 1,000 users, no live features** → Firebase probably cheaper
- **> 10,000 users OR heavy real-time** → Own API wins hard
- **Corporate / regulated** → Firebase blocked by policy anyway

### Datadog etc. — skip in Phase 0
- Sentry (free) + UptimeRobot (free) covers all Phase 0 observability needs
- Upgrade only when incidents outpace your ability to diagnose from logs

---

## 17. Change Log

| Date | Version | Change |
|---|---|---|
| 2026-07-06 | v1 draft | Initial plan document |

---

*This plan is a living document. Update it every time a major assumption changes, a phase completes, or a new risk emerges.*
