# Deploy Runbook

## Preconditions
- GitHub environment secrets configured:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
  - `SESSION_SECRET` (min 32 chars)
- Remote D1 access available.

## Release Flow
1. Trigger `Deploy` workflow with target environment (`staging` or `production`).
2. `deploy-gate` runs:
   - `npm run typecheck`
   - `npm run rules:check`
   - `npm run test`
   - `npm run build`
   - `npm run a11y:audit`
   - `npm run security:audit:live`
   - `npm run pre-launch:deploy`
3. If gate passes, workflow runs:
   - `npm run db:migrate:remote`
   - `wrangler deploy`
   - `wrangler secret put SESSION_SECRET`

## Rollback
1. Re-deploy previous known-good commit.
2. Verify critical routes:
   - `/login`
   - `/cars`
   - `/contracts`
   - `/bookings`
3. Run smoke checklist from deploy workflow output.

## Post-Deploy Validation
- Authentication works (login/logout).
- Admin mod-mode scope works.
- Cross-tenant access is rejected.
- Public checkout pricing is correct.
- No critical errors in telemetry/logs.
