# Dependency Upgrade Plan

## Objective
Upgrade dependencies in controlled waves with zero production regression.

## Current Status Snapshot
Use `npm outdated` before each wave and regenerate this table.

## Wave 1: Patch/Minor (Safe)
1. Update tooling/runtime-compatible packages:
   - `wrangler`
   - `@cloudflare/vite-plugin`
   - `@types/node`
   - `@types/react`
   - `@types/react-dom`
   - `tailwindcss`
   - `@tailwindcss/vite`
2. Run checks:
   - `npm run typecheck`
   - `npm test`
   - `A11Y_FAIL_LEVEL=medium npm run a11y:audit`
   - `npm run security:audit:live`
3. Deploy to staging and run smoke checks.

## Wave 2: Framework Minor
1. Upgrade:
   - `react-router` and `@react-router/dev` in lockstep
2. Validate route generation/typegen/build compatibility.
3. Run full quality gate and staging deploy.

## Wave 3: Major Migration (`zod` v4)
1. Create dedicated migration PR for schema/API changes.
2. Migrate incrementally by domains:
   - auth/session schemas
   - public forms
   - admin forms
3. Add/adjust tests for parsing/validation edge cases.
4. Run full quality gate and staged rollout.

## Rollback Rules
- Keep each wave in a separate PR.
- If any regression appears in staging or production, rollback by reverting that single wave commit.

## Definition of Done
- All waves merged.
- CI/deploy gates green.
- No new security/a11y findings.
- No production error-rate regression after 24h monitoring.
