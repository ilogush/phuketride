---
description: Rule for interacting with the D1 Database and repository layer.
---

# Database Access & Interfaces

- **D1DatabaseLike**: Use this interface in common repositories to ensure compatibility between standard D1 and simulated database objects.
- **D1Database**: Use the global `D1Database` type ONLY when calling low-level Cloudflare APIs or third-party functions that explicitly require it. All DB interaction should happen via repositories in `sdb` (e.g., `sdb.cars.getById`).
- Use `sdb.rawDb` only for complex queries that don't fit in repositories yet.
- Repository signatures must follow: `function name(db: D1DatabaseLike, ...args)`.
- **D1 Discipline**: Always use remote D1 (`--remote`). Never rely on local SQLite state in `.wrangler/state`.
- **Loader Side Effects**: GET loaders must NEVER perform write operations to D1.
- **Migrations**: If SQL files in `migrations/*` are added or changed, they must be applied immediately to remote D1.
- **Query limits**: Always use `QUERY_LIMITS` from `~/lib/query-limits` for list queries.
- **db-factory**: Always use `createScopedDb` to initiate repository instances.
- **Repositories**: All repository functions must accept `D1DatabaseLike` as an argument to maintain flexibility and testability.
