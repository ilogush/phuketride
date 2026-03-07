# Optimization Tasks

Оставлены только актуальные задачи по оптимизации, унификации и приведению проекта к единым стандартам. Закрытые пункты удалены.

## `app/routes/home.tsx`
## `app/routes/app-layout.tsx`

- Привести dashboard bootstrap к единому app-shell pattern: auth bootstrap, mod-mode resolution, notifications count, welcome/toast side effects.
- Убрать разрозненную route-level сборку layout state в отдельные shared loader/helpers.
- Зафиксировать единый контракт данных, которые layout и home читают на каждом запросе, чтобы не наращивать лишние round-trips.

## `app/components/dashboard/*`

- Свести параллельные form primitives к одному стандарту: не поддерживать одновременно несколько конкурирующих наборов (`Input/Select/Textarea` и `FormInput/FormSelect` без четкой границы).
- Унифицировать button/toggle/modal/table API по пропсам, variant naming и accessibility поведению.
- Выделить единый dashboard form composition contract: field wrapper, label, hint, error, required marker, section spacing.
- Прекратить route-specific UI state logic в компонентах, если её можно вынести в shared hooks рядом с доменной формой.

## `app/components/public/*`

- Привести public button/toggle/date-range interactions к единому UX/API contract.
- Свести date-range picker, calendar overlay и checkout form interaction к одному reusable state model.
- Унифицировать public form controls и error presentation с auth/checkout/public detail screens.

## `app/features/*`

- Продолжить перенос крупных route-centric сценариев в feature modules по доменам, а не по страницам.
- Зафиксировать единый внутренний стандарт feature-модуля: `loader/service/repo/view/types`.
- Не создавать feature-слои формально; переносить туда только те сценарии, где route уже перегружен orchestration, SQL и mapping logic.

## `app/lib/access-policy.server.ts`
## `app/lib/security.server.ts`
## `app/lib/auth.server.ts`

- Довести все dashboard/admin/detail routes до единых entrypoints policy/access checks; сократить случаи прямого `requireAuth` там, где нужен scope/ownership/role gate.
- Зафиксировать стандарт для public/user/dashboard/admin маршрутов: какой helper является обязательной точкой входа.
- Упростить читаемость access contract, чтобы route не собирал policy из нескольких разрозненных helper-ов.

## `app/lib/dictionaries-cache.server.ts`
## `app/lib/admin-crud.server.ts`
## `app/lib/admin-dictionaries.server.ts`

- Довести до конца унификацию всех справочников и admin read/write flows через shared cache/admin helpers.
- Зафиксировать naming и invalidation rules для dictionary caches, чтобы новые формы не добавляли локальные SQL lookups.
- Свести remaining admin/detail loaders к одному cached loader pattern.

## `app/lib/telemetry.server.ts`

- Добавить единый стандарт latency thresholds, slow-path tagging и event taxonomy для loader/action/API операций.
- Расширить обвязку так, чтобы route-слой не дублировал структуру `details`, naming и error context.
- Привязать telemetry к реальным hot paths: create/edit/detail/payment/calendar/reporting сценариям.

## `app/lib/*-repo.server.ts`

- Расширить repo-подход за пределы list pages на detail/read-heavy flows, где route всё ещё содержит прямой SQL.
- Зафиксировать единый стиль repo API: filters, pagination, counts, status summaries, row mapping.
- Отделить repo от orchestration/service слоя, чтобы бизнес-правила и side effects не смешивались с query code.

## `tests/*`

- Выровнять test coverage вокруг стандартов, а не отдельных файлов: access policy, ownership, money flows, audit, telemetry, unified form actions.
- Добавить точечные integration tests для маршрутов, которые ещё держат критичную orchestration-логику в route.
- Зафиксировать regression suite для унифицированных shared helpers, чтобы перенос логики из routes в services/features был безопасным.

## `docs/*`

- Держать `docs/README.md`, `docs/DATABASE.md` и этот файл синхронизированными с фактическими стандартами слоев `route/service/repo/policy`.
- Не возвращать разрозненные одноразовые optimization notes; поддерживать один актуальный список задач по путям и стандартам.
