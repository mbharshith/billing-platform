# VelocityPod — Engineering Guardrails

> **The rulebook.** Written for principal-engineer standards. One document, exhaustive coverage.
>
> - **`RULE`** = hard requirement. Violate → PR rejected.
> - **`GUIDELINE`** = strong default. Violate → owes an explanation in PR description.
> - **`SHOULD`** = best practice. Violate → note it in code review.
>
> This file is intentionally dense. Read it once; reference it forever.

---

## Table of Contents

| # | Section |
|---|---|
| 0  | First Principles |
| 1  | UI & Design System |
| 2  | Frontend Engineering |
| 3  | Backend Engineering |
| 4  | API Design |
| 5  | Data & Persistence |
| 6  | Security |
| 7  | Observability & Operations |
| 8  | Performance & Efficiency |
| 9  | Testing Strategy |
| 10 | Accessibility (WCAG 2.2 AA) |
| 11 | Internationalization & Localization |
| 12 | Configuration & Secrets |
| 13 | Documentation & Knowledge |
| 14 | Git, Reviews & Postmortems |
| 15 | Dependencies & Supply Chain |
| 16 | Release, Deployment & Rollback |
| 17 | Naming & File Structure |
| 18 | Anti-Patterns (Never Do These) |
| 19 | Pre-Commit & Pre-Merge Checklists |
| 20 | Enforcement Matrix |
| 21 | When to Break a Rule |

---

## 0. FIRST PRINCIPLES

The Zen of Python applies to every file — Java, TypeScript, SCSS, YAML.

| Principle | How it shows up here |
|---|---|
| **SOLID** | One class = one reason to change. Depend on abstractions. Interface segregation over god-services. |
| **DRY** | Constants in one file. Colors in tokens. Copy in `strings.ts`. Never duplicate a magic string. |
| **YAGNI** | Don't build a framework for a two-page app. Delete code the moment it stops earning rent. |
| **KISS** | Hash routing until nested routes justify react-router. `useState` until state is shared. |
| **POLA** | Least astonishment: freshly-edited items surface first; failed deletes leave the dialog open. |
| **Blast-radius containment** | Per-page ErrorBoundary; feature-first packages; layer isolation. One feature's bug can't cascade. |
| **Fail loud in dev, fail safe in prod** | axe-core throws overlays in dev; production shows an LD Alert with retry. |
| **Boring tech wins** | H2, Spring Boot, React, RTK. No exotic libraries without a written justification. |
| **Reversibility over cleverness** | Small commits, feature flags, env-var swaps. Roll forward AND back. |
| **The architecture enforces correctness** | Package-private layers, strict TS, LD prop invariants. Code review is for judgment, not linting. |

---

## 1. UI & DESIGN SYSTEM

### Living Design first
- `RULE` Use LD before writing custom. `Button`, `Card`, `Alert`, `Modal`, `Snackbar`, `IconButton`, `Body`, `Heading`, `Table`, `Menu`, `AlertDialog` — from vendored `src/components/` or npm `@walmart-web/livingdesign-components`.
- `RULE` `src/components/` is vendored LD — **NEVER edit files there**pgrade by re-vendoring, not patching.
- `RULE` Extend LD at the composition level (wrapper in `features/*/components/`). Never fork a primitive.
- `RULE` LD Snackbar via `useSnackbar()` — no hand-rolled toast infrastructure.
- `GUIDELINE` If LD is missing something, file a request to the LD team AND wrap the gap in a feature-local component so future replacement is a one-file swap.

### Design tokens — the ONLY source of colors, spacing, type
- `RULE` **All colors** via `--wm-*` custom properties in `frontend/src/app/theme/walmart-tokens.css`. Zero hex codes in components or feature SCSS.
- `RULE` **All spacing** via `--wm-space-*` tokens. No raw pixel values for padding, margin, gap.
- `RULE` **All typography** via `--wm-font-*` (sizes) and `--ld-font-family-*` (families).
- `RULE` **All radii, shadows, z-indexes** via `--wm-radius-*`, `--wm-shadow-*`, `--wm-z-*`.
- `RULE` Semantic tokens over primitive tokens. Use `--wm-text-subtle`, not `--wm-gray-100`. New surfaces get semantic aliases.
- `GUIDELINE` New tokens land in `walmart-tokens.css` once and are used everywhere. Don't re-declare per feature.

### No inline styles (with two documented exceptions)
- `RULE` No `style={{}}` for visuals — colors, typography, borders, radii, shadows, backgrounds — all in `.scss`.
- `EXCEPTION 1` Page-level layout wrappers may use inline `padding`/`margin`/`gap` (per `spacing.md`).
- `EXCEPTION 2` JS-computed dynamic values pass through CSS custom properties:
  ```tsx
  <div style={{ '--fill': `${pct}%` } as React.CSSProperties} className="wm-bar" />
  ```
  ```scss
  .wm-bar { width: var(--fill); background: var(--wm-blue-100); }
  ```

### Theming & dark mode
- `RULE` Dark mode requires zero component changes. Every semantic token has a `[data-theme="dark"]` override.
- `RULE` No `if (theme === 'dark')` in component code. CSS does it.
- `RULE` System-preference detection lives at the app root, not in features.

### Responsive design
- `RULE` Mobile-first breakpoints: base → `md` (768px) → `lg` (1024px) → `xl` (1280px).
- `RULE` No fixed pixel widths for containers — use `%`, `rem`, `max-width` in tokens.
- `RULE` Touch targets ≥ 44×44px on mobile.
- `GUIDELINE` Test at 320px width. If it breaks, the layout is fragile.

### Icons
- `RULE` LD icons first. Custom SVGs go in `AppIcons.tsx` — single source of truth, `currentColor` for stroke/fill so tints work.
- `RULE` `<img>` for icons is forbidden. Use inline SVG.
- `RULE` Every icon has a text alternative — visible label or `aria-label` on the parent button.

### Copy & strings
- `RULE` All user-facing text lives in `strings.ts` per feature. No inline literals in JSX for labels, messages, tooltips, aria-labels.
- `RULE` Snackbar messages, empty-state copy, error text — all in `strings.ts`. Copy changes are one-file diffs.
- `GUIDELINE` Sentence case for actions ("Save changes"), title case for headings ("Policy HQ"). Consistent throughout.
- `GUIDELINE` Error messages start with what happened, not what the user did wrong. "Couldn't save. Try again." not "You submitted an invalid form."

---

## 2. FRONTEND ENGINEERING

### TypeScript
- `RULE` `strict: true`. `tsc -b` passes clean before every commit.
- `RULE` **Zero `any`.** Not in props, not in casts, not in `catch`. Use `unknown` and narrow.
- `RULE` No `@ts-ignore`. Use `@ts-expect-error` with a comment + ticket link if truly unavoidable.
- `RULE` Public shapes are `interface`; unions and utility types are `type`.
- `RULE` Discriminated unions for state machines (`{ status: 'idle' } | { status: 'loading' } | { status: 'error', message: string }`), not boolean flags.
- `GUIDELINE` Prefer `readonly` on props and state. Immutability is a feature.

### State management
- `RULE` **All API calls via RTK Query.** No `fetch()`, no `axios` in components.
- `RULE` **Components are Redux-unaware.** Typed `useAppDispatch` / `useAppSelector` from `app/store/hooks.ts`. Prefer custom hooks that hide store access entirely.
- `RULE` `providesTags` / `invalidatesTags` on every RTK Query endpoint — cache invalidation isn't optional.
- `RULE` `keepUnusedDataFor: 0` on any endpoint whose data mutates frequently (policies, mod queue).
- `GUIDELINE` **State locality ladder**: `useState` → `useReducer` → Redux slice → RTK Query. Climb one rung only when justified.
- `GUIDELINE` Optimistic updates for delete/toggle actions with automatic rollback via RTKQ's `onQueryStarted`.

### Component contracts
- `RULE` One default export per file. Named exports for helpers, types, sub-components.
- `RULE` Files ≤ 600 lines. Refactor at 400.
- `RULE` Props no more than 2 levels of drilling. Deeper needs a hook or context.
- `RULE` Every feature lives in `src/features/<featureName>/` — its own `components`, `hooks`, `api`, `model`, `strings`. Cross-feature imports go via `_shared/`.
- `RULE` Every page is wrapped in `ErrorBoundary` keyed by route.
- `RULE` No side effects in render. Effects belong in `useEffect` with a proper dep array.
- `RULE` Every effect has a cleanup or a written justification for why none is needed.
- `GUIDELINE` Prefer composition (`children`, render props) over configuration (dozens of boolean props).
- `GUIDELINE` Container/presentational split when logic complexity grows past `useMemo`.

### Loading, empty, error states
- `RULE` Every data-fetching page renders **all four states**: loading skeleton, empty, error, success. No conditional `data && ...` that hides errors.
- `RULE` Skeletons match final layout dimensions to prevent CLS.
- `RULE` Empty states include a next action ("+ Add policy", "Import from CSV").
- `RULE` Errors are recoverable. "Try again" is a button, not a suggestion.

### Forms
- `RULE` Controlled inputs by default. `defaultValue` only for genuinely uncontrolled trees.
- `RULE` Validation runs client-side AND server-side. Client-side is a UX affordance, not a security boundary.
- `RULE` Submit buttons disabled while in-flight. Prevent double-submit.
- `RULE` Field-level errors under the field. Form-level errors above the submit button.

### Routing & navigation
- `RULE` Hash routing until nested routes exist. Adding pages: update `App.tsx` route switch.
- `RULE` Route changes reset scroll to top.
- `RULE` Route changes reset the ErrorBoundary via `key={route}`.
- `RULE` Every route has a unique document title (`<title>` update).

### Feedback patterns
- `RULE` Async errors from **mutations** → Snackbar.
- `RULE` Async errors from **initial page load** → inline LD Alert (Snackbar too easy to miss on a blank page).
- `RULE` **Render/lifecycle exceptions** → per-page ErrorBoundary. Last-resort net, not first-line defense.
- `RULE` Loading > 500ms shows a skeleton. Loading > 2s shows a progress indicator.
- `GUIDELINE` Success toasts only for actions that leave the user's screen or need confirmation. Silent success for obvious edits.

---

## 3. BACKEND ENGINEERING

### Layering — non-negotiable
- `RULE` **Controller → Service → Store → Repository → DB.** Never skip. Never invert.
- `RULE` Controllers are thin: parse, delegate, return. No business logic. No DB access.
- `RULE` Services are `@Transactional` and JPA-unaware. Talk to `PolicyStore`, not `EntityManager`.
- `RULE` Stores are the anti-corruption layer. Convert entities → DTOs before returning.
- `RULE` **Entities NEVER leave the repository layer.** No entity type on any controller signature, service return, or DTO field.
- `RULE` Package-private by default. `public` only on the contract seam (service interfaces, DTOs, controllers).

### DTOs & entities
- `RULE` **DTOs are Java records.** Immutable, Jackson-native, no Lombok.
- `RULE` **Entities are classes** with private final fields where possible. Mappers (`fromDto`, `applyDto`, `toDto`) live on the entity — one place to change.
- `RULE` **Lombok is on the classpath but forbidden.** Reject `@Data`, `@Getter`, `@Setter` in reviews.
- `RULE` No mutable DTOs. No setters. Ever.
- `RULE` DTO field names match JSON field names — no `@JsonProperty` renaming without a written reason.

### Business logic
- `RULE` Service methods do one verb: `create`, `update`, `deactivate`, `resolve`. Compose small verbs.
- `RULE` Domain enums for finite state (`PolicyStatus`, `Severity`) — never string comparisons.
- `RULE` Time is a dependency. Inject `Clock` — never call `Instant.now()` directly. Tests get `Clock.fixed(...)`.
- `RULE` IDs are generated in ONE place per aggregate (`PolicyStore.nextId()`). Format changes = one file.

### Concurrency
- `RULE` No shared mutable state in services. Fields are `final` and immutable, or protected by the DB.
- `RULE` `@Transactional(readOnly = true)` on queries. Skip only with justification.
- `RULE` Long-running operations don't block request threads. Use `@Async` or a message queue.
- `GUIDELINE` Prefer optimistic locking (`@Version`) over pessimistic. Pessimistic locks are a last resort.

### Exception handling
- `RULE` 404 via `ResponseStatusException(NOT_FOUND, "policy " + id + " not found")`.
- `RULE` 400 via `@Valid` — Spring handles the response automatically.
- `RULE` 500-class exceptions surface with a correlation ID and don't leak stack traces to the client.
- `RULE` Business-rule violations use domain-specific exceptions handled by a single `@ControllerAdvice`.
- `RULE` Never swallow exceptions. `catch { /* ignore */ }` is a bug — log or rethrow with context.

---

## 4. API DESIGN

### REST discipline
- `RULE` Resource-oriented URLs. Nouns, not verbs. `/policies/{id}`, not `/getPolicy`.
- `RULE` HTTP verbs mean what they say: GET is safe + idempotent; PUT is idempotent; POST creates; DELETE removes.
- `RULE` Status codes: **200** OK, **201** Created (with Location header when useful), **204** No Content (on delete), **400** validation, **404** not found, **409** conflict, **422** unprocessable, **429** rate-limited, **5xx** server bug.
- `RULE` Plural for collections (`/policies`), singular for actions (`/policies/{id}/prompt-template`).
- `RULE` Query params for filter/sort/paginate. Path params for identity.
- `GUIDELINE` Nested resources at most 2 levels deep. `/policies/{id}/appeals/{appealId}` — no further.

### Contracts
- `RULE` Every endpoint has `@Operation(summary, description)` + `@Tag`. Verified against `/v3/api-docs`.
- `RULE` Every path/query parameter has `@Parameter(description, example)`.
- `RULE` Request/response schemas are records with JSR-380 constraints (`@NotBlank`, `@Size`, `@Positive`).
- `RULE` Backward-compatible changes only in the current major version. New fields are optional. Removed fields require a version bump.
- `RULE` Enums serialize as strings, not ordinals. Consumers should never depend on Java ordering.

### Pagination, filtering, sorting
- `RULE` Paginated endpoints return `{ items, page, size, total }`. Zero-indexed pages. Max size capped (default 100).
- `RULE` Sort keys are documented. Unknown keys degrade to a default; don't return 400.
- `RULE` Multi-value filters use repeated query params (`?status=ACTIVE&status=DRAFT`), not comma-separated.
- `GUIDELINE` Cursor pagination for large or frequently-updated collections; offset pagination is fine for admin tables.

### Idempotency & concurrency
- `RULE` PUT is idempotent — same request repeated gives same result.
- `RULE` POST endpoints that could be retried accept an `Idempotency-Key` header. Duplicate keys within a window return the original response.
- `RULE` Use ETags / `If-Match` for conflict detection on updates when concurrent editing is possible.

### Errors
- `RULE` Error responses follow a consistent shape: `{ status, error, message, path, timestamp, correlationId }`.
- `RULE` No stack traces in production responses. Include a correlation ID the user can quote to support.
- `RULE` Validation errors list every field failure, not just the first.

---

## 5. DATA & PERSISTENCE

### Schema
- `RULE` Migrations via Flyway or Liquibase in production. `ddl-auto: update` is a dev-only shortcut.
- `RULE` Every table has a PK, a `created_at`, an `updated_at`. Timestamps in UTC.
- `RULE` Enums stored as strings (`VARCHAR`), never ordinals. Renaming an enum value is a migration.
- `RULE` Soft-delete via `deleted_at` when history matters; hard-delete when it doesn't. Decide up-front, document the choice.
- `RULE` Every FK has an index. Every column filtered/sorted in queries has an index.
- `GUIDELINE` UUIDs for public IDs when guessability matters. Sequential IDs (`POL-013`) for admin-only.

### Query hygiene
- `RULE` No N+1 queries. Fetch joins or batch fetches for associations rendered together.
- `RULE` No `SELECT *` for large rows. Project to a DTO when only a subset is needed.
- `RULE` No unbounded queries. Always paginate. Every `findAll()` for an admin table must have a max-size guard.
- `RULE` Slow queries (> 200ms) are logged and reviewed. Add an index or rewrite.

### Transactions
- `RULE` Service methods define transaction boundaries. Never `@Transactional` on a controller.
- `RULE` `readOnly = true` for queries. Reduces Hibernate flushes and enables read replicas.
- `RULE` Transactions are short. Never wrap network calls or file I/O in a DB transaction.
- `RULE` Cross-aggregate consistency uses events, not distributed transactions.

### Data migrations
- `RULE` Migration scripts are additive-first: add columns/tables, dual-write, backfill, then remove old.
- `RULE` Never delete a column in the same release that stops writing to it. Two-release cycle minimum.
- `GUIDELINE` Backfills over 1M rows run in batches; log progress; support resumption.

---

## 6. SECURITY

### Authentication & authorization
- `RULE` Use Walmart SSO / OAuth2 in production. Local dev may run open — annotate it.
- `RULE` Authorization checks happen in the service layer, not the controller. Services are the enforcement seam.
- `RULE` Deny by default. Every endpoint has an explicit role/scope requirement.
- `RULE` Never trust client-supplied user IDs. Derive identity from the auth token.

### Input validation
- `RULE` Every request body: `@Valid` + JSR-380 constraints.
- `RULE` Path/query parameters: validate types and ranges. Reject unknown enum values with 400.
- `RULE` File uploads: whitelist MIME types, cap size, scan for malware.

### Injection & escaping
- `RULE` No raw SQL. JPQL `@Query` or Spring Data method names only.
- `RULE` No dynamic query building via string concatenation. Use `CriteriaBuilder` or parameterized JPQL.
- `RULE` HTML rendered from user input goes through DOMPurify or React's default escaping. Never `dangerouslySetInnerHTML` on untrusted data.
- `RULE` Command-line invocations from Java use `ProcessBuilder` with a list, never `Runtime.exec(String)`.

### Secrets & credentials
- `RULE` Never commit secrets, credentials, tokens, or `.env` files. `.gitignore` covers them.
- `RULE` Secrets come from CCM / environment variables. Reference via `@Value("${app.foo}")`.
- `RULE` Rotate secrets on a schedule and on personnel changes.
- `RULE` Log redaction: never log tokens, passwords, credit cards, SSNs, or session cookies.

### CORS, CSRF, headers
- `RULE` CORS origins come from `APP_CORS_ALLOWED_ORIGINS`. Wildcards are forbidden in production.
- `RULE` CSRF protection on all state-changing endpoints if session cookies are used.
- `RULE` Set security headers: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (or CSP `frame-ancestors`), `Referrer-Policy: strict-origin-when-cross-origin`.
- `RULE` Cookies: `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict` when possible).

### Frontend security
- `RULE` No `eval`, no `Function()` constructor. ESLint blocks both.
- `RULE` No third-party scripts loaded outside the CSP allowlist.
- `RULE` `localStorage` / `sessionStorage` never store tokens, PII, HIPAA data, or anything a JS bug could exfiltrate.
- `RULE` `postMessage` handlers validate `event.origin`.

### Data privacy
- `RULE` PII (name, email, SSN, phone, address) is classified. Access is logged.
- `RULE` No PII in URLs, logs, or exception messages. Use IDs and correlation tokens.
- `RULE` Right-to-delete requests are supported end-to-end. Test annually.
- `RULE` GDPR/CCPA: honor data-subject requests within SLA. Data export in a portable format.

### Dependency vulnerabilities
- `RULE` Snyk (or equivalent) scans on every PR. Critical + High severity block merge.
- `RULE` No unpinned dependency versions in production builds. Lock files committed.

---

## 7. OBSERVABILITY & OPERATIONS

### Logging
- `RULE` Structured logs (JSON in prod, human-readable in dev). Fields: `timestamp`, `level`, `logger`, `message`, `correlationId`, `userId` (if authed), custom context.
- `RULE` Log levels: `ERROR` (something broke), `WARN` (unexpected but recoverable), `INFO` (state changes worth noting), `DEBUG` (dev only). Never log at `INFO` in a hot loop.
- `RULE` Every incoming request logs `method`, `path`, `status`, `duration_ms`, `correlationId`. Health/actuator endpoints excluded.
- `RULE` Correlation IDs propagate: incoming header → MDC → outgoing calls → log fields.
- `RULE` Never log secrets, tokens, PII, or full request bodies for auth endpoints.

### Metrics
- `RULE` Expose `/actuator/prometheus` in prod. RED metrics (Rate, Errors, Duration) per endpoint.
- `RULE` Business KPIs (policies created per day, moderation SLA compliance) surface as metrics too.
- `RULE` Alert on error rate > 1% for 5min, p99 latency > SLA, saturation > 80%.
- `GUIDELINE` Dashboards live in code (Grafana JSON in the repo), not in someone's browser.

### Tracing
- `RULE` Distributed tracing via OpenTelemetry when the app calls > 1 downstream. Every span carries the correlation ID.
- `GUIDELINE` Trace sample rate: 100% in dev/staging, 5–10% in prod with 100% on errors.

### Health checks
- `RULE` `/actuator/health` returns liveness (is the JVM alive) separate from readiness (can it serve traffic).
- `RULE` Liveness probe checks nothing external. Readiness probe checks DB + downstream deps.
- `RULE` Startup probe covers slow init so k8s doesn't kill during boot.

### Frontend observability
- `RULE` Client errors → error tracker (Sentry or equivalent) with source maps for readable stacks.
- `RULE` Web Vitals (LCP, INP, CLS) collected in prod. Regressions block deploy.
- `RULE` User actions (button clicks, form submits) tracked via a single `analytics.track()` façade. Never call the vendor SDK directly from components.

### Runbooks & on-call
- `RULE` Every alert has a runbook linked from the alert message. If there's no runbook, the alert shouldn't exist.
- `RULE` Every service has an owner and a paging rotation.
- `GUIDELINE` Blameless postmortems within 5 business days of any Sev-1/2. Action items tracked in Jira.

---

## 8. PERFORMANCE & EFFICIENCY

### Frontend budgets
- `RULE` **Initial JS bundle ≤ 200 KB gzipped** for the shell. Feature bundles code-split.
- `RULE` **LCP ≤ 2.5s** on median hardware over 4G.
- `RULE` **INP ≤ 200ms**. Long tasks (> 50ms) are split or moved off the main thread.
- `RULE` **CLS ≤ 0.1**. Skeletons match final layout.
- `RULE` Images have explicit `width`/`height` or `aspect-ratio`. Use `loading="lazy"` below the fold.
- `RULE` Route-level code splitting via dynamic `import()`. No 5MB single bundles.
- `GUIDELINE` Memoize expensive components with `React.memo` when profiler shows re-render cost > render cost.

### Backend budgets
- `RULE` **p50 < 100ms, p99 < 500ms** for read endpoints under normal load.
- `RULE` **DB connection pool ≥ 2× expected concurrency**. Never let requests queue on connections.
- `RULE` **Cache reads that are expensive and rarely mutated.** Cache invalidation via tags, not TTL alone.
- `RULE` Response payloads paginated to ≤ 100 items. Never return unbounded lists.

### Rendering optimizations
- `RULE` List virtualization for > 500 items (react-window or equivalent).
- `RULE` Debounce user input (search, filter) at 200–300ms before firing network requests.
- `RULE` Server-side pagination + filtering + sorting for admin tables. Never ship 10k rows to the client.

---

## 9. TESTING STRATEGY

### The pyramid
- `RULE` **Unit** tests for pure functions and reducers. Fast, isolated, hundreds of them.
- `RULE` **Component** tests via `@testing-library/react` — behavior, not implementation. Query by role/label/text.
- `RULE` **Integration** tests for backend endpoints via `@SpringBootTest(webEnvironment = RANDOM_PORT)` + `TestRestTemplate`. Real HTTP against in-memory H2.
- `RULE` **E2E** tests via Playwright for the top 3 user flows. Run in CI on main, nightly on branches.
- `RULE` **Contract** tests where consumers matter. Pact or Spring Cloud Contract.

### Discipline
- `RULE` Every controller endpoint has a happy path AND a 404/400 test.
- `RULE` Every RTKQ mutation has a test verifying cache invalidation fires.
- `RULE` **Test count only grows.** Current baseline: 34 backend, 18 frontend, 52 total. Removing a test requires a replacement or a Jira comment.
- `RULE` Bug fixes ship with a regression test.
- `RULE` `mvn test`, `npx vitest run`, and `npm run build` all pass locally before push.

### Testability
- `RULE` Inject dependencies (`Clock`, HTTP clients, random generators). Never call statics in business logic.
- `RULE` Mock at architectural seams (HTTP, DB), not internal collaborators.
- `RULE` No sleeps in tests. Use polling assertions (`await waitFor(...)`) or fake timers.
- `RULE` Tests are deterministic. Flaky = broken = must-fix before next PR.

### Coverage as a signal
- `GUIDELINE` Aim for 80% line coverage on services and reducers. 100% on money-touching or safety-critical code.
- `GUIDELINE` Don't chase 100% — coverage is a floor, not a ceiling. Focus on branch coverage and mutation testing for critical paths.

---

## 10. ACCESSIBILITY (WCAG 2.2 AA)

- `RULE` **Contrast**: 4.5:1 for body text, 3:1 for UI controls and non-text. Verify every tint we add (amber-red is 5.5:1 body, 7.3:1 bold).
- `RULE` **Keyboard navigation** works for every flow the demo covers. Focus rings visible.
- `RULE` **Focus management**: modals trap focus and return it on close. Route changes move focus to the main heading.
- `RULE` **Every interactive element has an accessible name**: `a11yLabel`, `aria-label`, `aria-labelledby`, or visible text.
- `RULE` **Semantic HTML first**: `<button>` for clicks, `<a>` for navigation, `<nav>`, `<main>`, `<header>`, `<footer>`, `<h1>–<h6>` in order.
- `RULE` **Forms**: every input has a `<label>`. Errors announced via `aria-live="polite"`. Required fields marked in both text and `aria-required`.
- `RULE` **Live regions** for async updates: `aria-live="polite"` for status, `role="alert"` for errors.
- `RULE` **Motion**: respect `prefers-reduced-motion`. Purely decorative animation must be disable-able.
- `RULE` **Images**: meaningful ones have `alt`; decorative ones have `alt=""`.
- `RULE` **axe-core** `A11yDevAssertions` must not fire in dev. Violations block merge.
- `GUIDELINE` Test with a screen reader (VoiceOver on macOS, NVDA on Windows) before shipping new UI.

---

## 11. INTERNATIONALIZATION & LOCALIZATION

- `RULE` All user-facing strings live in `strings.ts` — future-proof for i18n even if we're English-only today.
- `RULE` No string concatenation for translated content. Use ICU MessageFormat placeholders when i18n lands.
- `RULE` No hardcoded date/number formats. Use `Intl.DateTimeFormat` and `Intl.NumberFormat`.
- `RULE` Layouts handle bidirectional text (RTL) via logical properties (`padding-inline-start`, not `padding-left`).
- `RULE` Time zones are explicit. Store UTC in the DB, format in the user's zone at the edge.
- `GUIDELINE` Plan for 30% text expansion when other languages arrive — no fixed-width UI text.

---

## 12. CONFIGURATION & SECRETS

- `RULE` Every configurable value is env-overridable via `@Value("${app.foo:default}")` or `@ConfigurationProperties`.
- `RULE` Sensible defaults in `application.yml`. Prod values injected by CCM / environment.
- `RULE` Twelve-Factor App compliance: config in the environment, not in code.
- `RULE` **Never commit secrets, `.env`, credentials, or PII files.** `.gitignore` covers them.
- `RULE` Feature flags for anything that might need a quick disable in prod. Flags read from CCM, not hardcoded.
- `RULE` Environment parity: dev / staging / prod use the same runtime, differ only in scale and data.
- `GUIDELINE` Configuration schema documented in `application.yml` comments so operators know what's tunable.

---

## 13. DOCUMENTATION & KNOWLEDGE

- `RULE` `AGENTS.md` is the living context file. Update it when tech stack, feature packages, or patterns change.
- `RULE` `README.md` covers: what it is, how to run, how to test, how to deploy. Kept ≤ 200 lines.
- `RULE` Every public API endpoint has `@Operation` — verified via `/v3/api-docs`.
- `RULE` Every non-trivial method has a Javadoc / JSDoc comment answering **WHY**, not what.
- `RULE` Architectural decisions recorded as ADRs in `docs/adr/NNNN-title.md`. One decision per file.
- `RULE` Diagrams in `docs/` as Mermaid or inline SVG. No proprietary formats.
- `GUIDELINE` If the same question comes up twice, add it to `AGENTS.md` or a Q&A doc.
- `GUIDELINE` Runbooks live alongside the code that could page you.

---

## 14. GIT, REVIEWS & POSTMORTEMS

### Commits
- `RULE` **Small, focused commits.** Roll forward and back with git — no 500-line WIP dumps.
- `RULE` **Conventional commit format**: `type(scope): summary`. Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `style`, `revert`.
- `RULE` Commit body explains WHY when the summary isn't obvious. Wrap at 72 chars.
- `RULE` Every commit passes CI locally before push. Broken commits never touch `main`.
- `RULE` No merge commits on `main` from feature branches. Rebase small; squash long series of WIPs.

### Branching
- `RULE` Branch off `main`. Name: `feat/short-desc`, `fix/short-desc`, `chore/short-desc`.
- `RULE` Feature branches live ≤ 5 days. Longer = split the work.
- `GUIDELINE` Trunk-based development. Feature flags over long-lived branches.

### Pull requests
- `RULE` PR description lists: **what changed, why, what was tested, screenshots for UI**.
- `RULE` One reviewer minimum. Two for security, data-model, or auth changes.
- `RULE` CI green before merge. No override without a written justification.
- `RULE` No secrets, PII, HIPAA data in any commit or PR description.
- `RULE` If the PR touches > 10 files, split it. Reviewers can't hold that much in their heads.
- `GUIDELINE` Author responds to review comments within 1 business day. Reviewers respond within 1 business day.

### Code review conduct
- `RULE` Review the code, not the coder. "This function..." not "you...".
- `RULE` Distinguish blockers (`RULE` violation), suggestions (`GUIDELINE`), and nits (style preference). Label them.
- `RULE` Explain WHY when requesting changes. "This is wrong" is not a review.
- `GUIDELINE` Approve with nits — don't block on stylistic preference.

### Postmortems
- `RULE` Blameless. Focus on system failures, not human failures.
- `RULE` Within 5 business days of any Sev-1/2.
- `RULE` Structure: timeline, root cause, contributing factors, action items with owners and dates.
- `RULE` Action items land in Jira within 48h of the postmortem meeting.

---

## 15. DEPENDENCIES & SUPPLY CHAIN

- `RULE` **Every new dependency requires a written justification** in the PR description. Weigh maintenance cost.
- `RULE` Prefer standard library / framework primitives before adding a dep.
- `RULE` Pin exact versions in lock files (`package-lock.json`, Maven `<version>`). No `^` or `~` ranges in production apps.
- `RULE` License audit: no GPL or AGPL in this codebase. MIT, Apache 2.0, BSD, ISC only unless legally cleared.
- `RULE` Renovate/Dependabot enabled. Security patches auto-PR'd within 24h.
- `RULE` Vulnerability scans (Snyk, or equivalent) on every PR. Critical/High block merge.
- `GUIDELINE` One-file "utility" dependencies (left-pad style) — copy the code instead.
- `GUIDELINE` Deprecate slowly: multi-release cycle with warnings before removal.

---

## 16. RELEASE, DEPLOYMENT & ROLLBACK

- `RULE` Semantic versioning: MAJOR.MINOR.PATCH. Breaking changes bump MAJOR.
- `RULE` Every release has a `CHANGELOG.md` entry: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.
- `RULE` Deploy via KITT / CI pipeline. No manual server pushes.
- `RULE` **Every deploy is rollback-able within 5 minutes.** Previous artifact kept for at least 7 days.
- `RULE` Canary / progressive rollout for anything touching hot paths. Auto-halt on error-rate breach.
- `RULE` Database migrations run BEFORE the app version that depends on them. Two-phase deploys for breaking schema.
- `RULE` Feature flags gate risky changes. Default off; enable in stages (5% → 25% → 100%).
- `RULE` Deploy Fridays are avoided by policy. Rollbacks are safe any day; new features aren't.

---

## 17. NAMING & FILE STRUCTURE

### Naming
- `RULE` **Java**: `PascalCase` types, `camelCase` methods/fields, `SCREAMING_SNAKE` constants.
- `RULE` **TypeScript/React**: `PascalCase` components/types, `camelCase` functions/vars, `SCREAMING_SNAKE` constants.
- `RULE` **Files**: components in `PascalCase.tsx`; hooks in `useCamelCase.ts`; utils in `camelCase.ts`.
- `RULE` **CSS classes**: `kebab-case`, BEM-ish scoping (`.wm-ppe__toolbar`).
- `RULE` **URLs**: `kebab-case` (`/policy-hq`, not `/policyHq`).
- `RULE` **JSON fields**: `camelCase` matching Java records / TS interfaces.
- `RULE` **DB tables/columns**: `snake_case`, singular table names (`policy`, not `policies`).
- `RULE` **Env vars**: `SCREAMING_SNAKE` with app prefix (`APP_CORS_ALLOWED_ORIGINS`).

### Names should
- Reveal intent (`nextId` beats `getNext`).
- Avoid abbreviations except industry-standard (`URL`, `HTTP`, `ID`).
- Use domain vocabulary (`policy`, `creative`, `moderation`), not framework terms.
- Distinguish boolean state (`isActive`, `hasError`, `canEdit`).

### File structure — feature-first
```
backend/src/main/java/com/walmart/velocitypod/
├── config/                    ← cross-cutting Spring config
├── controller/                ← legacy shared controllers only
├── model/                     ← legacy shared models only
├── service/                   ← legacy shared services only
└── <feature>/                 ← everything new goes here
    ├── api/                   ← @RestController
    ├── service/               ← @Service, @Transactional
    ├── repository/            ← @Entity + JpaRepository
    └── model/                 ← DTOs (records) + enums

frontend/src/
├── app/                       ← providers, store, theme, routing
├── components/                ← VENDORED LD — do not edit
├── common/                    ← cross-feature helpers
├── features/
│   ├── _shared/               ← cross-feature UI
│   └── <feature>/
│       ├── <Feature>Page.tsx
│       ├── api/               ← RTK Query slice
│       ├── components/        ← feature-local UI
│       ├── hooks/             ← feature-local hooks
│       ├── model/             ← types
│       └── strings.ts         ← all copy for the feature
├── hooks/                     ← global hooks
├── styles/                    ← global CSS + tokens
└── utils/                     ← global helpers
```

---

## 18. ANTI-PATTERNS — NEVER DO THESE

| Never | Instead |
|---|---|
| `useDispatch()` in a component | `useAppDispatch()` from `app/store/hooks.ts` |
| `useSelector(s => ...)` in a component | Typed `useAppSelector` or a custom hook |
| `fetch()` / `axios` in a component | RTK Query hook |
| `<div style={{ color: '#0071ce' }}>` | `.scss` file + `var(--wm-blue-100)` |
| `<button>` for a click target | `<Button variant="primary">` from LD |
| Custom toast component or Redux slice for toasts | `useSnackbar()` from `@walmart-web/livingdesign-components` |
| `const x: any` | Type it, or use `unknown` and narrow |
| `@ts-ignore` | Fix the type, or `@ts-expect-error` with a ticket |
| Editing `src/components/*` (vendored LD) | Extend at composition in `features/` |
| String literal `"Total Policies"` in code | `PolicyHqConstants.KPI_TOTAL_LABEL` |
| `PolicyEntity` in a service return type | `.toDto()` before returning |
| `@Data`, `@Getter`, `@Setter` (Lombok) | Java record or private final fields |
| Mutable DTO with setters | Java record |
| Business logic in a controller | Move to the service |
| Business logic in a repository | Move to the service; repositories are dumb data access |
| Raw SQL string in code | JPQL `@Query` or Spring Data method name |
| `Instant.now()` / `LocalDate.now()` in business logic | Inject `Clock` and call `LocalDate.now(clock)` |
| `@Transactional` on a controller | Move to service; controllers stay thin |
| Committing `.env`, credentials, or `data/*.mv.db` | Add to `.gitignore` (already covered) |
| Deleting a test without replacement | Add regression test or open a Jira and comment |
| `dangerouslySetInnerHTML` on untrusted data | DOMPurify sanitization first |
| `console.log` in shipped code | Use a logger; console-log ban via ESLint |
| `setTimeout` in tests to "wait for state" | `await waitFor(...)` or fake timers |
| Wildcard CORS (`*`) in production | Explicit origin list via env var |
| Unpaginated `findAll()` on an admin table | Enforce a max size or paginate |
| Config values hardcoded in Java/TS | `@Value` / env var / feature flag |
| Silent `catch { /* ignore */ }` | Log with context or rethrow |

---

## 19. PRE-COMMIT & PRE-MERGE CHECKLISTS

### Pre-commit (before every `git push`)
```bash
# Backend
cd backend && mvn test                     # 34/34 passing

# Frontend
cd frontend && npx vitest run              # 18/18 passing
cd frontend && npm run build               # includes tsc -b, clean
cd frontend && npm run lint                # eslint + prettier
```

Diff eyeball checks:
- [ ] No `any` types added
- [ ] No inline visual styles (colors, fonts, borders)
- [ ] No new hex codes — all colors via `--wm-*` tokens
- [ ] No new hardcoded user-facing strings — added to `strings.ts` / constants
- [ ] New endpoints have `@Operation` + `@Tag` + `@Parameter` annotations
- [ ] New DTOs are records
- [ ] Controllers stayed thin
- [ ] Tests added for new endpoints (happy + 404 minimum)
- [ ] Files ≤ 600 lines
- [ ] Commit message follows conventional format
- [ ] No secrets, PII, credentials in the diff

### Pre-merge (PR ready to land)
- [ ] All CI checks green
- [ ] At least one approving review (two for security/auth/data-model)
- [ ] PR description: what/why/tested/screenshots for UI
- [ ] Backward-compatible API changes only, or version bump documented
- [ ] Migration script tested against a copy of prod schema (for data changes)
- [ ] Rollback plan in the PR description (for anything user-visible)
- [ ] Runbook updated (for anything that can page you)
- [ ] AGENTS.md updated if patterns changed

---

## 20. ENFORCEMENT MATRIX

| Rule | Enforcement |
|---|---|
| No `any` in TS | `tsc -b` fails build |
| Missing types | `tsc -b` fails build |
| Layering violations (backend) | Package-private visibility — won't compile |
| Missing `@Valid` on request body | Runtime `ConstraintViolationException` |
| Missing LD `a11yLabel` on IconButton | LD prop type — won't compile |
| A11y violations (contrast, ARIA) | `A11yDevAssertions` overlays in dev |
| Malformed conventional commits | commitlint in pre-commit hook |
| ESLint errors (no-console, no-eval, etc.) | Lint step fails CI |
| Missing test for new endpoint | Coverage gate + reviewer flag |
| Missing `@Operation` on endpoint | Missing in `/v3/api-docs` — reviewer catch |
| Secret in commit | git-secrets pre-commit hook + Snyk scan |
| Vulnerable dependency | Snyk blocks merge on Critical/High |
| Slow query | Query log threshold — reviewed weekly |
| Bundle size regression | CI bundle-size check |
| LCP/INP/CLS regression | RUM monitoring alert |
| Everything else | Code review + this document |

The architecture does most of the enforcement. Reviewers focus on judgment calls — DRY, YAGNI, layering, and copy tone.

---

## 21. WHEN TO BREAK A RULE

Rarely. But when you must:

1. **Add a comment** at the site explaining WHY the exception exists.
2. **Link a Jira** if it's a temporary workaround.
3. **Mention it in the PR description** so reviewers don't miss it.
4. **Update this file** if the exception is going to recur — rules should reflect reality.

> Rules silently broken corrupt the system. Rules loudly broken teach us where the rulebook needs to change.

---

## Cross-references

- **`AGENTS.md`** — full living context: directory tree, type shapes, code templates, LLM contract.
- **`CHECKLIST.md`** — Definition of Done for a feature or PR.
- **`README.md`** — how to run, test, and deploy locally.
- **`DEMO_PREP.md`** — narrative walkthrough for demos.
- **`docs/adr/`** — architectural decision records.

---

*Last updated: 2026-07-01. This document evolves with the codebase. Amend it, don't work around it.*
