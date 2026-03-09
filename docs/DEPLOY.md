# Deploy

## Preconditions

- `npm test`
- `npm run build`
- `npm run rules:check`
- `npm run typecheck`
- `npm run db:migrate:remote`

## Release

Run:

```bash
npm run deploy
```

The deploy script runs policy checks, type generation, remote D1 migrations, deploy-mode verification, and `wrangler deploy`.

## Secrets

- `SESSION_SECRET` must be present in the deploy environment because `pre-launch:deploy` validates it before publish.
- Confirm Cloudflare auth with `wrangler whoami` if deploys start failing outside the app checks.
