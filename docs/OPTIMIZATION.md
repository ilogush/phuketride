# Optimization Plan

## Goal
Prepare the project for stable production operation with centralized quality/security checks and predictable deploy flow.

## ✅ Выполнено (Iteration 1 — Audit & Refactor)

| Задача | Статус |
|---|---|
| Очистка build-артефактов, gitignore | ✅ |
| Перемещение layout-хуков в `app/hooks/` | ✅ |
| `ErrorBoundary` в `app-layout.tsx` | ✅ |
| `getScopedDb` — рефакторинг всех роутов | ✅ |
| Серверная пагинация + поиск: `models`, `colors`, `hotels` | ✅ |
| `useDictionaryFormActions` — устранение дублирования CRUD логики | ✅ |
| `AppLoadContext` type + React Router module augmentation | ✅ |
| Устранение `context as any` во всех роутах | ✅ |
| Унификация типа `Brand` → `AdminBrandRow` | ✅ |
| `ScopedDb` расширен: `models.listPage`, `colors.listPage`, `hotels.count` | ✅ |
| `admin-dictionaries.server.ts`: `loadAdminModelsPage`, `countAdminModels`, `loadAdminColorsPage`, `countAdminColors` | ✅ |
| Документация обновлена (паттерны, структура, примеры) | ✅ |
| `PRODUCTION_READINESS.md` (устаревший) — удалён | ✅ |

## 🔄 В работе / Следующий приоритет

### Iteration 2 — Data Integrity & Forms

| Задача | Приоритет |
|---|---|
| `useActionData` для form validation (вместо `redirectWithError` при валидации) | P0 |
| Transaction guardrails — review оставшихся complex mutations | P1 |
| PII audit в audit logs (не логировать sensitive client data) | P1 |
| Cache TTL strategy — для KV (пережить isolate restarts) | P2 |

### Iteration 3 — Performance & CI

| Задача | Приоритет |
|---|---|
| Loading indicators стандартизированы (useNavigation + submit buttons) | P1 |
| Brands: серверная пагинация (сейчас `pagination={false}`) | P2 |
| CI pipeline: PR auto-checks | P2 |
| Accessibility audit (a11y:audit в CI) | P2 |

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
- Scoped DB: весь DB доступ идёт через `getScopedDb` → `ScopedDb` in `app/lib/db-factory.server.ts`.
- Pagination: стандарт через `getPaginationFromUrl` из `app/lib/pagination.server.ts`.
- Dictionary CRUD: через `useDictionaryFormActions` hook.

## Success Criteria
- CI gate is green on all required checks.
- Deploy gate is green including deploy-mode pre-launch.
- No missing required docs/rules artifacts.
- Production deploy has validated secrets and migration status.
- Нет `context as any` в codebase.
- Нет прямого D1 доступа в route-файлах (только через ScopedDb).
