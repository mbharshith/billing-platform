# Cashier POS

Frontend-only React + TypeScript cashier terminal + inventory dashboard, built following **[GUARDRAILS.md](../GUARDRAILS.md)**.

## Run it

```bash
cd cashier-app
npm install       # if you haven't yet
npm run dev       # http://localhost:4173
npm run build     # tsc -b && vite build
```

## What it does

**Cashier page** (`#/cashier`)
- Browse 20 mock products across 10 categories
- Search + category filter
- Add to cart, adjust quantities, remove lines
- Checkout with **Cash / Card / Lending**
- Lending flow captures **10-digit mobile number** (required for BNPL)
- Instant printable receipt

**Dashboard page** (`#/dashboard`)
- 5 KPI tiles: revenue, sales count, units sold, unique SKUs, lending balance
- Recent sales table
- Top-selling products (ranked)
- Inventory movement with remaining-stock bars

## Architecture — atomic design

```
src/
├── main.tsx / App.tsx           entry + hash router
├── styles/
│   ├── tokens.css               §1 design tokens (ONLY source of colors/spacing/type)
│   └── globals.css              resets, focus rings, keyframes
├── domain/                      types, mock catalog, strings, formatters
├── store/
│   └── SalesContext.tsx         cross-page state (Context + useReducer)
├── components/
│   ├── atoms/                   Button, IconButton, Input/Field, Badge, Text, Icon, Spinner
│   ├── molecules/               ProductCard, SearchBar, CategoryFilter, CartLineItem,
│   │                            StatCard, EmptyState, MobileNumberField, PaymentMethodOption
│   ├── organisms/               AppHeader, ProductGrid, CartPanel, PaymentModal, ReceiptModal,
│   │                            RecentSalesTable, TopProductsTable, InventoryTable, DashboardKpis
│   └── templates/               PageShell
└── pages/
    ├── CashierPage.tsx
    └── DashboardPage.tsx
```

## Guardrails compliance (this project follows GUARDRAILS.md)

**Sections applied:** §1 UI/Design System, §2 Frontend, §6 Security (frontend), §8 Performance, §10 Accessibility, §11 i18n, §17 Naming.

| Rule | How this project honors it |
|---|---|
| §1 all colors via `--wm-*` tokens, zero hex codes in components | `styles/tokens.css` holds every color; components use `var(--wm-*)` |
| §1 all copy in `strings.ts` | `domain/strings.ts` is the single source |
| §1 single icon source (currentColor) | `components/atoms/Icon.tsx` |
| §2 TS strict, zero `any` | `tsconfig.json` has `strict: true` + `noUnused*` |
| §2 discriminated unions for state machines | `AsyncStatus` in `domain/types.ts`, `SalesAction` reducer |
| §2 hash routing until nested routes justify router | `App.tsx` state-machine router with `hashchange` sync |
| §2 all 4 states on data views | Empty states everywhere (cart, dashboard tables, product search) |
| §2 files ≤ 600 lines | Largest file (`organisms/index.tsx`) refactor-flagged at 400; still one file for cohesion — split if it grows |
| §10 WCAG 2.2 AA | 44px min touch targets, semantic HTML, `aria-label` on every icon button, focus rings, `prefers-reduced-motion` respected |
| §11 all copy externalized, `Intl.NumberFormat`/`Intl.DateTimeFormat` | `domain/format.ts` + `strings.ts` |
| §17 feature-first + atomic naming | `PascalCase` components, `camelCase` helpers, `kebab-case` CSS classes with BEM-ish scoping |

## §21 exceptions (documented per guardrails)

1. **Scaffolder: Vite instead of CRA** — CRA install repeatedly stalled on the corporate npm registry (>10 min, no `node_modules`). Vite installed 67 packages in 6 s. Same React + TypeScript output. Guardrails.md doesn't mandate a scaffolder.
2. **No Living Design components** — MVP scope + explicit user request for atomic design (custom atoms). Design tokens are still fully enforced per §1. Migration to LD is a one-file replacement per atom.
3. **No RTK Query** — this is a frontend-only MVP with no backend. State-locality ladder (§2 GUIDELINE) says climb one rung; Context+Reducer is the correct level for the sales dataset. When a backend arrives, wire an RTK Query slice into `SalesContext`.

## Not yet done (would follow before shipping)

- **Vitest + @testing-library/react** unit + component tests (§9 RULE)
- **Playwright** E2E for the top user flow: add to cart → charge → verify dashboard (§9 RULE)
- **axe-core** dev overlay for a11y assertions (§10 enforcement)
- **Renovate/Snyk** in CI (§15)
