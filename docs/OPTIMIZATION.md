# Optimization

## Runtime

- Run `npm run analyze:performance` before major releases to catch slow loader trees.
- Run `npm run analyze:queries` when list pages or dashboards start showing D1 latency regressions.
- Use `npm run monitor:queries` for live query telemetry checks during debugging.

## Build

- `npm run build` is the release build gate and should stay green before `npm run deploy`.
- `npm run typecheck` regenerates Cloudflare and route types, so it is the safest pre-deploy correctness pass.

## Data

- Remote D1 is the source of truth.
- Use `npm run clean:remote-only` to remove local worker/build artifacts if local state starts masking production issues.
