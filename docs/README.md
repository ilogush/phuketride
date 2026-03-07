# PhuketRide Docs

## Что это

PhuketRide — SSR-приложение на React Router + Cloudflare Workers для управления арендой автомобилей.
Система сочетает:

- публичную витрину и checkout;
- защищённую dashboard-часть для admin/partner/manager;
- multi-tenancy через `company_id`;
- D1 как primary database;
- R2 для файлов и изображений.

## Что оставлено в docs

- `docs/README.md` — единая точка входа: архитектура, бизнес-правила, доступ, стек, roadmap.
- `docs/DATABASE.md` — таблицы, инварианты данных, миграционная дисциплина.
- `docs/OPTIMIZATION.md` — план оптимизации и execution tracking.
- `docs/DEPLOY.md` — deploy/rollback процедуры.

Всё остальное удалено как дубли, локальные заметки или устаревшие артефакты.

## Технологический стек

- Frontend: React 19, React Router 7, Tailwind CSS 4
- Runtime: Cloudflare Workers
- Database: Cloudflare D1 (remote only — локальный state запрещён)
- Storage: Cloudflare R2
- Validation: Zod
- UI icons: Heroicons

## Источники истины

- маршруты: `app/routes.ts`
- auth/session: `app/lib/auth.server.ts`
- tenant access / ownership: `app/lib/security.server.ts`, `app/lib/mod-mode.server.ts`
- scoped DB factory: `app/lib/db-factory.server.ts` → `getScopedDb`, `ScopedDb`
- checkout pricing: `app/routes/cars.$id.checkout.tsx`
- observability / telemetry: `app/lib/telemetry.server.ts`
- repo-layer hot lists: `app/lib/users-repo.server.ts`, `app/lib/cars-repo.server.ts`, `app/lib/contracts-repo.server.ts`, `app/lib/payments-repo.server.ts`, `app/lib/bookings-repo.server.ts`
- CODEX rules: `RULES.txt`, `scripts/check-codex-rules.mjs`

## Архитектурная позиция

Целевая архитектура проекта:

- `server-first`: бизнес-правила, pricing, access control, ownership checks и state transitions живут на сервере;
- `thin routes`: route-файлы только принимают request, вызывают сервисы и собирают UI;
- `repo-backed lists`: hot dashboard списки и count/status queries живут в `app/lib/*-repo.server.ts`;
- `scoped-db-first`: весь DB доступ через `getScopedDb()` → `ScopedDb`, не напрямую через `D1Database`;
- `feature modules`: основная логика постепенно уходит из `app/routes/*` в `app/features/*`;
- `centralized policy`: auth/RBAC/tenant ownership остаются централизованными;
- `performance-first`: приоритет у D1 query count, индексов, hot loader/action путей и SSR payload.

## Паттерны, которым НАДО следовать

### DB доступ в loaders/actions

```typescript
// ✅ ПРАВИЛЬНО — всегда через getScopedDb
export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context);
    const data = await sdb.models.listPage({ limit: 20, offset: 0 });
    // ...
}

// ❌ НЕПРАВИЛЬНО — прямой D1 доступ из route
const db = context.cloudflare.env.DB;
const result = await db.prepare("SELECT ...").all();
```

### ScopedDb методы

Каждый domain имеет scoped методы в `app/lib/db-factory.server.ts`:

| Домен | Методы |
|---|---|
| `sdb.hotels` | `list(options?)`, `count(search?)` |
| `sdb.models` | `list()`, `listPage(options?)`, `count(search?)` |
| `sdb.colors` | `list()`, `listPage(options?)`, `count(search?)`, `getById(id)` |
| `sdb.brands` | `list()`, `getById(id)` |
| `sdb.locations` | `getAll()` |
| `sdb.districts` | `getAll()` |

### Серверная пагинация

```typescript
// Используем getPaginationFromUrl для стандартных параметров
import { getPaginationFromUrl } from "~/lib/pagination.server";

const { page, pageSize, offset } = getPaginationFromUrl(url, { defaultPageSize: 20 });
const [items, totalCount] = await Promise.all([
    sdb.models.listPage({ limit: pageSize, offset, search }),
    sdb.models.count(search),
]);
```

### CRUD хуки

```typescript
// ✅ Используй useDictionaryFormActions вместо дублирования логики
import { useDictionaryFormActions } from "~/hooks/useDictionaryFormActions";

const { handleFormSubmit, handleDelete } = useDictionaryFormActions({
    editingItem,
    setIsFormOpen,
    setEditingItem,
});
```

### Типизация context

```typescript
// ✅ context уже typed через app/types/react-router.d.ts — НЕ НУЖЕН context as any
export async function loader({ request, context }: LoaderFunctionArgs) {
    const { sdb } = await getScopedDb(request, context); // context типизирован!
}
```

## Бизнес-инварианты

- Любая tenant-specific запись должна резолвиться к `company_id`.
- `partner` и `manager` работают только внутри своей компании.
- `admin` может действовать глобально, но не должен обходить серверные access checks.
- Публичный checkout не является источником истины для цены.
- Финансовые значения должны рассчитываться на сервере.
- Audit logging обязателен для критичных действий, но не должен открывать лишние PII.
- Sensitive dashboard routes недопустимо защищать только фактом логина.

## Уровни доступа

Маршруты объявляются только в `app/routes.ts`.

Основные зоны:

- `public`: `/`, `/company/:slug`, `/cars/:id`, `/cars/:id/checkout`, marketing pages;
- `admin`: компании, глобальные справочники, отчёты, логи;
- `partner/manager`: `cars`, `bookings`, `contracts`, `calendar`, `settings`;
- `user`: `my-bookings`, `my-contracts`, `my-payments`, `notifications`.

## Правила работы

- D1: только remote, локальный state не является источником истины
- dashboard sensitive routes: только через auth/rbac/ownership checks
- финансовые значения checkout нельзя доверять клиенту
- документация должна обновляться вместе с крупными изменениями логики
- `context as any` запрещён — используй типизированный `AppLoadContext` через module augmentation

## Query Budget

Максимальное количество D1 queries для ключевых экранов:

### Dashboard Lists (Hot Paths)

- Cars list: 4 queries max
- Contracts list: 4 queries max
- Bookings list: 4 queries max
- Users list: 3 queries max
- Dictionary pages (brands/models/colors/hotels): 2 queries max (list + count)

### Detail Pages

- Car detail: 2-3 queries max
- Contract detail: 2-3 queries max
- Booking detail: 1-2 queries max

### Public Pages

- Car checkout: 3-4 queries max
- Search cars: 2-3 queries max

### Правила

- Используйте JOINs вместо N+1 queries
- Кэшируйте dictionaries (brands, models, colors, districts, etc.)
- Избегайте sequential queries где возможен Promise.all
- Для списков всегда используйте repo layer
- Всегда добавляйте серверную пагинацию (`listPage` + `count`)

## Базовые команды

```bash
npm run typecheck
npm run test
npm run rules:check
npm run build
```

## Деплой

```bash
npm run deploy
```

Deploy допускается только после успешных `rules:check`, `typecheck`, `test`, миграций и build.

## Структура проекта

```
app/
├── components/
│   ├── dashboard/      # UI компоненты для admin-панели
│   └── public/         # UI компоненты для публичного сайта
├── features/           # Feature modules (thin route → feature pattern)
├── hooks/              # Переиспользуемые React хуки
│   ├── useDictionaryFormActions.ts   # CRUD для dictionary pages
│   ├── useAppLayoutModMode.ts
│   ├── useAppLayoutSidebar.ts
│   └── useAppLayoutWelcomeToast.ts
├── lib/                # Server-side utilities и repo layer
│   ├── db-factory.server.ts          # ScopedDb factory (ГЛАВНЫЙ DB entrypoint)
│   ├── admin-crud.server.ts          # Admin mutation helpers
│   ├── admin-dictionaries.server.ts  # Dictionary queries с пагинацией
│   ├── pagination.server.ts          # Стандартная пагинация из URL
│   └── ...
├── routes/             # React Router route modules
├── schemas/            # Zod schemas (централизованные)
└── types/
    ├── context.ts      # AppLoadContext (typed Cloudflare context)
    ├── react-router.d.ts  # Module augmentation — types context
    └── auth.ts
```

## Документация

Актуальная документация:

- `docs/README.md` - архитектура, правила, roadmap (этот файл)
- `docs/DATABASE.md` - schema, индексы, миграции
- `docs/OPTIMIZATION.md` - план оптимизации и execution tracking
- `docs/DEPLOY.md` - deploy/rollback procedures

Обновление документации обязательно при изменениях в:
- Auth/access policy
- Database schema
- API contracts
- Deployment procedures
- Security policies
- Новые паттерны (DB access, pagination, hooks)
