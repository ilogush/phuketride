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

## Query Budget

Максимальное количество D1 queries для ключевых экранов:

### Dashboard Lists (Hot Paths)

- Cars list: 4 queries max
  - list query (с JOIN на templates/brands/models/colors)
  - count query
  - status counts query
  - company data (cached)
  
- Contracts list: 4 queries max
  - list query (с JOIN на company_cars)
  - count query
  - status counts query
  - company data (cached)
  
- Bookings list: 4 queries max
  - list query (с JOIN на company_cars/templates)
  - count query
  - status counts query (если нужно)
  - company data (cached)
  
- Users list: 3 queries max
  - list query
  - count query
  - role counts query

### Detail Pages

- Car detail: 2-3 queries max
  - car data с JOINs (1 query)
  - related data если нужно (maintenance, contracts)
  
- Contract detail: 2-3 queries max
  - contract data с JOINs (1 query)
  - payments list (1 query)
  - related data если нужно
  
- Booking detail: 1-2 queries max
  - booking data с JOINs (1 query)
  - related data если нужно

### Public Pages

- Car checkout: 3-4 queries max
  - car data (1 query)
  - pricing calculation data (seasons, durations - cached)
  - company settings (cached)
  - availability check (1 query)
  
- Search cars: 2-3 queries max
  - cars list с filters (1 query)
  - count query (1 query)
  - dictionaries (cached)

### Settings & Admin

- Settings page: 5-6 queries max (допустимо больше из-за множества tabs)
  - company data
  - locations/districts (cached)
  - payment templates (cached)
  - currencies (cached)
  - tab-specific data
  
- Admin CRUD pages: 2-3 queries max
  - list query
  - count query
  - dictionaries (cached)

### Правила

- Используйте JOINs вместо N+1 queries
- Кэшируйте dictionaries (brands, models, colors, districts, etc.)
- Избегайте sequential queries где возможен Promise.all
- Для списков всегда используйте repo layer
- Detail queries должны получать все данные одним запросом с JOINs

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

## Beta Readiness Gate

Перед открытием beta для реальных пользователей должны быть выполнены следующие критерии:

### Security & Access (P0)

- ✅ Session/cookie contract зафиксирован и протестирован
  - Production cookie policy (`secure`, `sameSite`, `httpOnly`, `maxAge`)
  - Session lifecycle и logout invalidation работают корректно
  - Тесты на login/logout/session lifecycle проходят

- ✅ Access policy унифицирован
  - Sensitive routes используют централизованный access entrypoint
  - Ownership checks возвращают согласованные Response-ошибки
  - `modCompanyId` проходит через guard/validator с audit trail
  - Негативные access-path тесты покрывают cross-company и mod-mode cases

- ✅ Runtime security hardening
  - Security headers (CSP baseline, cache policy) внедрены
  - Response policy зафиксирована для SSR/API/assets routes
  - Production ErrorBoundary не показывает dev-oriented output
  - Policy documented и smoke-тесты проверяют headers

### Observability (P0)

- ✅ Telemetry baseline готов к production
  - Event taxonomy (`scope`, `event` namespaces) определена
  - Slow-path thresholds и severity tagging внедрены
  - Safe error/details serialization централизована
  - Telemetry события согласованы по формату

### Code Quality (P0)

- ✅ Критичные view-компоненты типизированы
  - Убраны остаточные `any` из `ContractEditPageView`, `MyContractDetailPageView`, `CarEditPageView`
  - Typed view models используются вместо mixed DTO
  - Parsing/normalization перенесены из UI в loader/service слой

- ✅ Regression test baseline
  - `npm run test` стабильно green
  - Тесты покрывают session/cookie contract
  - Тесты покрывают mod-mode access и cross-tenant rejection
  - Negative tests для checkout/payment sensitive paths добавлены

### Documentation (P0)

- ✅ Docs синхронизированы с кодом
  - `docs/README.md` отражает текущую архитектуру и access policy
  - `docs/OPTIMIZATION.md` содержит актуальный execution plan
  - `docs/DATABASE.md` описывает schema и migration discipline
  - `docs/DEPLOY.md` содержит deploy/rollback процедуры

### Beta Release Checklist

Перед deploy в beta:

1. Запустить полный test suite: `npm run test`
2. Проверить типизацию: `npm run typecheck`
3. Проверить CODEX rules: `npm run rules:check`
4. Проверить build: `npm run build`
5. Убедиться, что все миграции применены
6. Проверить env bindings completeness
7. Выполнить smoke verification:
   - Login/logout flow
   - Admin mod-mode access
   - Cross-tenant access rejection
   - Public checkout pricing calculation
   - Sensitive route access control

### Known Limitations for Beta

- Тестовое покрытие достаточно для baseline regression, но будет расширяться
- CI pipeline пока не автоматизирован (будет добавлен в Iteration 2)
- Query/index optimization будет проводиться по реальным hot paths после beta
- Full form contract и accessibility baseline будут доведены в Iteration 3

### Post-Beta Priorities (Iteration 2)

- Thin routes для тяжёлых flows
- Repo contract для hot lists/detail queries
- Query/index review по фактическим hot paths
- CI/release pipeline automation
- Расширенный regression suite

## Launch Readiness Gate

Перед production launch должны быть выполнены все критерии Iteration 2:

### Performance & Scalability (P1)

- ✅ Query optimization завершена
  - Все hot paths имеют соответствующие индексы
  - Query budget соблюдается для всех экранов
  - Нет N+1 queries в критичных flows
  - Dashboard lists загружаются < 2s

- ✅ Repo contract стандартизирован
  - Все repo используют unified contract
  - Typed read models вместо raw SQL output
  - Count/status summary queries оптимизированы
  - Нет SQL orchestration в route-файлах

- ✅ Cache invalidation discipline
  - Единый cache contract задокументирован
  - Все mutations инвалидируют соответствующие cache
  - Dictionary lookups используют cache
  - Cache hit ratio > 90%

- ✅ Asset optimization реализована
  - WebP conversion для всех изображений
  - Responsive images (srcset) для разных viewports
  - Lazy loading для below-fold images
  - CDN-friendly caching (30 days для images)

- ✅ Telemetry dashboards готовы
  - Dashboard queries для всех метрик
  - Alert thresholds (P0/P1/P2)
  - Setup instructions отражены в `docs/DEPLOY.md` и `docs/OPTIMIZATION.md`
  - Требует Cloudflare Analytics setup (manual)

### CI/CD & Operations (P1)

- ✅ CI/CD pipeline автоматизирован
  - PR автоматически запускает CI checks
  - Deploy возможен только после green CI
  - Fast check (typecheck + rules) < 2 min
  - Full check (tests + build) < 5 min

- ✅ Deploy & rollback procedures
  - Deploy checklist задокументирован
  - Rollback procedure протестирована
  - Smoke tests автоматизированы
  - Incident response plan готов

- ✅ Asset delivery оптимизирована
  - Production cache headers настроены
  - Image optimization работает
  - CDN cache hit ratio > 95%
  - Asset delivery < 500ms (p95)

### Testing & Quality (P1)

- ✅ Extended regression suite
  - Archive/unarchive flows покрыты
  - Cache invalidation протестирована
  - Admin CRUD operations покрыты
  - Public checkout regression расширен
  - Test coverage > 70% для critical paths

### Launch Checklist

Перед production launch:

1. ✅ Все Iteration 2 задачи завершены
2. ✅ CI pipeline стабильно green
3. ✅ Performance benchmarks пройдены
4. ✅ Security audit завершён
5. ✅ Load testing выполнен
6. ✅ Backup & recovery протестированы
7. ✅ Monitoring & alerting настроены
8. ✅ Documentation актуальна
9. ✅ Team training завершён
10. ✅ Support procedures готовы

### Launch Smoke Tests

После production deploy:

1. **Critical User Flows**
   - Registration → Login → Booking → Payment
   - Partner dashboard → Car management → Contract creation
   - Admin panel → Company management → Reports

2. **Performance Checks**
   - Homepage load < 1s
   - Dashboard lists < 2s
   - Car detail < 1s
   - Checkout < 500ms

3. **Integration Checks**
   - D1 database connectivity
   - R2 asset delivery
   - Session management
   - Email notifications (if applicable)

4. **Security Checks**
   - HTTPS enforcement
   - Security headers present
   - CORS policy correct
   - Auth flows secure

### Launch Monitoring (First 24h)

Monitor continuously:

- Error rate < 1%
- Response time p95 < 2s
- Database query time p95 < 500ms
- Memory usage < 80%
- CPU usage < 70%
- Cache hit ratio > 90%

### Launch Success Criteria

Launch считается успешным если:

- Нет critical incidents (P0) в первые 24h
- Error rate стабильно < 1%
- Performance targets достигнуты
- User feedback положительный
- No data integrity issues
- Rollback не требовался

### Post-Launch Priorities (Iteration 3)

- Full form contract и accessibility baseline
- Visual/a11y regression discipline
- Incident/debug checklist refinement
- Telemetry dashboards и monitoring
- Performance optimization по real data
- Feature backlog prioritization

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
