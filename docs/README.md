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
- `docs/OPTIMIZATION.md` — единый исполняемый план оптимизации и модернизации.

Всё остальное удалено как дубли, локальные заметки или устаревшие артефакты.

## Технологический стек

- Frontend: React 19, React Router 7, Tailwind CSS 4
- Runtime: Cloudflare Workers
- Database: Cloudflare D1
- Storage: Cloudflare R2
- Validation: Zod
- UI icons: Heroicons

## Источники истины

- маршруты: `app/routes.ts`
- auth/session: `app/lib/auth.server.ts`
- tenant access / ownership: `app/lib/security.server.ts`, `app/lib/mod-mode.server.ts`
- checkout pricing: `app/routes/cars.$id.checkout.tsx`
- observability / telemetry: `app/lib/telemetry.server.ts`
- repo-layer hot lists: `app/lib/users-repo.server.ts`, `app/lib/cars-repo.server.ts`, `app/lib/contracts-repo.server.ts`, `app/lib/payments-repo.server.ts`, `app/lib/bookings-repo.server.ts`
- CODEX rules: `CODEX_RULES.txt`, `scripts/check-codex-rules.mjs`

## Архитектурная позиция

Целевая архитектура проекта:

- `server-first`: бизнес-правила, pricing, access control, ownership checks и state transitions живут на сервере;
- `thin routes`: route-файлы только принимают request, вызывают сервисы и собирают UI;
- `repo-backed lists`: hot dashboard списки и count/status queries живут в `app/lib/*-repo.server.ts`;
- `feature modules`: основная логика постепенно уходит из `app/routes/*` в `app/features/*`;
- `centralized policy`: auth/RBAC/tenant ownership остаются централизованными;
- `performance-first`: приоритет у D1 query count, индексов, hot loader/action путей и SSR payload, а не у случайных клиентских микрооптимизаций.
- dashboard не должен тянуть вторичные client-side polling виджеты, если те же данные могут быть собраны server-first в основном loader.

Рекомендуемый стек уже есть в проекте и должен быть сохранён:

- Cloudflare Workers + D1 + R2;
- React 19 + React Router 7;
- TypeScript + Vite;
- Tailwind 4;
- Zod.

Не нужно добавлять новые слои без доказанной пользы:

- не добавлять Redux/Zustand по умолчанию;
- не добавлять ORM по умолчанию;
- не строить отдельный API-слой между route и domain service без явной причины;
- не делать миграцию на UI kit ради "современности".

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

Обязательные правила:

- для admin-sensitive страниц нужен role gate;
- для tenant detail/action маршрутов нужна ownership validation;
- API-like routes требуют schema validation и policy checks;
- query params не могут быть единственным механизмом доступа.

## Правила работы

- D1: только remote, локальный state не является источником истины
- dashboard sensitive routes: только через auth/rbac/ownership checks
- финансовые значения checkout нельзя доверять клиенту
- документация должна обновляться вместе с крупными изменениями логики

## Перед изменениями

1. Свериться с `CODEX_RULES.txt`.
2. Проверить затрагиваемые docs.
3. Для auth/checkout/bookings/contracts/users/companies/logs сначала проверить security impact.

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
