# Optimization Backlog

## Scope
- Baseline date: 2026-03-05
- Status snapshot:
  - Type safety debt: high (`any` usage is widespread).
  - SQL consistency debt: high (`SELECT *` and large static limits in many routes).
  - Route complexity debt: high (several 500-1100 line route files).
  - Operational maturity: medium-low (CI/testing/linting incomplete).

## P0 (Do First)

1. Type safety in critical flows
- Files first:
  - `app/lib/auth.server.ts`
  - `app/routes/contracts.new.tsx`
  - `app/routes/contracts.$id.edit.tsx`
  - `app/routes/bookings.create.tsx`
- Tasks:
  - Replace `any` with route-local typed row interfaces.
  - Normalize conversion boundaries (`Number`, `String`, nullability).
  - Add Zod parse for action payloads where missing.
- Exit criteria:
  - Zero `any` in listed files.
  - Typecheck passes.

2. Remove `SELECT *` from critical queries
- Tasks:
  - Replace wildcard projections with explicit columns.
  - Keep query shape minimal and stable for each view/action.
- Exit criteria:
  - No `SELECT *` in auth/contracts/bookings/payments critical routes.

3. Move database logic to service/repository layer
- Tasks:
  - Extract reusable query units to `app/lib/*` server modules.
  - Keep route files focused on orchestration + response mapping.
- Exit criteria:
  - At least contracts/bookings/auth split into route + data service.

4. Break down large route files
- Priority files:
  - `app/routes/settings.tsx`
  - `app/routes/contracts.new.tsx`
  - `app/routes/contracts.$id.edit.tsx`
- Exit criteria:
  - UI blocks and query logic split into composable modules.
  - Each route file under ~400 lines target.

5. Remove runtime DDL from handlers
- Tasks:
  - Keep schema creation in migrations only.
  - Runtime handlers should only read/write.
- Exit criteria:
  - No `CREATE TABLE` in request handlers.

6. CI gate on each PR
- Tasks:
  - Run `npm ci`, `npm run typecheck`, `npm run build`.
- Exit criteria:
  - CI required for merge to main.

## P1 (Next)

7. Add ESLint + Prettier and scripts
- Add `lint`, `lint:fix`, `format` scripts and baseline config.

8. Add test baseline
- Unit tests for pricing, validation, auth helpers.
- Integration tests for high-risk loaders/actions (contracts/bookings/payments).

9. Standardize pagination and limits
- Replace hardcoded large limits with paginated query parameters.
- Define default/max limits centrally.

10. Index and query-plan audit for D1
- Validate real query patterns against indexes.
- Add missing indexes for hot paths.

11. Cache strategy for public read-heavy routes
- Target routes:
  - `/`
  - `/company/:slug`
  - `/cars/:id`
- Introduce short TTL + stale-while-revalidate strategy.

12. Client bundle optimization
- Lazy-load heavy dashboard modules where possible.
- Audit oversized chunks and shared dependencies.

13. Unified error handling for loaders/actions
- Standard JSON error contract for API routes.
- Consistent redirect/error UX for page routes.

## P2 (Stabilization)

14. Observability
- Add structured logging, route/action latency, and slow query reporting.

15. Session hardening
- Add cookie signing secret rotation process.
- Confirm secure settings in production deployment profile.

16. Architecture docs/ADR
- Document data-layer patterns, route conventions, and SQL standards.

## Current Iteration (Completed in this pass)
- Added CI workflow (`.github/workflows/ci.yml`) for typecheck + build.
- Removed runtime DDL from `app/routes/api.search-events.tsx`.
- Added migration for `district_search_events`.
- Replaced wildcard user query in `app/lib/auth.server.ts` with explicit columns.
