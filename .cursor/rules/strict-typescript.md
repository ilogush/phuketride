```
---
description: Rule for strict typing across the application, specifically focusing on Cloudflare's `context` and avoiding `as any`.
---

# Strict TypeScript & Context Typing

- Always use `AppLoadContext` for route arguments to ensure type safety.
- NEVER use `as any` for database or context objects.
- Use `getScopedDb(request, context)` to access the scoped database layer.
- Ensure all repository functions use `D1DatabaseLike` for the first argument.
- **Thin Route Standard**: Route modules must remain thin. Business logic, complex SQL, and data mapping should be moved to `app/lib/*` or `app/features/*`.
- **Validation**: Every `action` and `loader` that receives input must use Zod schemas from `app/schemas` and `parseWithSchema` helper.
- **Language**: Public UI text must be in English. Internal documentation, code comments, and rules should be in Russian.
- **File Length Limits**: Keep files within budget: routes/features <= 800 lines, components <= 600 lines.
- Define explicit interfaces for database rows and avoid using `any` or `any[]` for data returned from the database.
```
