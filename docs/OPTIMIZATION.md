# Optimization Plan

## Goal
Prepare the project for stable production operation with centralized quality/security checks and predictable deploy flow.

## Current Priorities
1. Centralized CI checks: typecheck, rules, tests, build, accessibility, live security audit.
2. Centralized deploy gate: same checks as CI + deploy-mode pre-launch verification.
3. Runtime hardening: mandatory `SESSION_SECRET`, validated before deploy.
4. Accessibility baseline: keep `npm run a11y:audit` blocking in CI.
5. Security baseline: run `npm run security:audit:live` against a real local preview.

## Baseline Commands
```bash
npm run typecheck
npm run rules:check
npm run test
npm run build
npm run a11y:audit
npm run security:audit:live
npm run pre-launch
npm run pre-launch:deploy
```

## Centralization Decisions
- Live security audit runner is centralized in `scripts/ci/run-live-security-audit.sh`.
- CI and deploy gate both call the same `npm run security:audit:live` command.
- Pre-launch verification is mode-based (`local` and `deploy`) to avoid local false failures and keep deploy strict.

## Success Criteria
- CI gate is green on all required checks.
- Deploy gate is green including deploy-mode pre-launch.
- No missing required docs/rules artifacts.
- Production deploy has validated secrets and migration status.
