# Optimization Plan

## Цель

Привести проект к современной и быстрой архитектуре без лишнего технологического шума:

- тонкие route-файлы;
- feature-driven server modules;
- централизованный access policy;
- измеряемая производительность;
- минимальный, но сильный стек.

## Базовые принципы

- Приоритет у D1 query count, индексов и hot paths, а не у косметических UI-оптимизаций.
- Бизнес-логика не должна жить в route-файлах.
- Клиент не должен быть источником истины для денег, ролей и tenant scope.
- Любая оптимизация должна быть проверяема через `build`, `typecheck`, `test`, `rules:check`.

## Что уже сделано

- [x] Введен auto-gate для telemetry на hot routes.
- [x] `dashboard-home` переведен на выделенный server helper для метрик и reduced round-trips.
- [x] Из `dashboard-home` убран отдельный client polling widget; страница снова собирается server-first без второго metrics round-trip.
- [x] Admin CRUD routes (`colors`, `districts`, `hotels`, `durations`, `seasons`) сведены к общему server-first шаблону для loaders/actions/audit.
- [x] `cars`, `contracts`, `users`, `payments`, `bookings` переведены на repo-layer для list/count/status логики.
- [x] `DataTable` получил более современное поведение для клиентского поиска через React 19 (`useDeferredValue`, `useEffectEvent`).
- [x] Hot-path loaders/actions покрыты telemetry и проходят `rules:check`.

## Единый план

### Phase 1: Route decomposition

Цель: убрать giant route files и сделать маршруты тонкими orchestration-слоями.

- [ ] Вынести `app/routes/cars.$id.checkout.tsx` в `app/features/public-checkout/*`.
- [ ] Вынести `app/routes/cars.$id.tsx` в feature/service + UI blocks.
- [ ] Вынести `app/routes/companies.$companyId.tsx` в feature/service + UI blocks.
- [ ] Зафиксировать шаблон route -> policy -> service -> repo.

### Phase 2: Feature modules

Цель: перейти от route-centric структуры к модульной архитектуре.

- [ ] Создать `app/features/cars`.
- [ ] Создать `app/features/companies`.
- [ ] Создать `app/features/bookings`.
- [ ] Создать `app/features/contracts`.
- [ ] Постепенно переносить DB access в `repo`, orchestration в `service`, rules в `policy`.

### Phase 2.5: Admin normalization

Цель: довести админку до единых read/write паттернов без локальных костылей.

- [~] Централизовать admin dictionary loaders/actions.
- Уже сделано для `colors`, `districts`, `hotels`, `durations`, `seasons`.
- [ ] Вынести оставшиеся admin dictionary/detail loaders (`settings`, `companies.create`, color modal flows, related lookups) в shared server modules.
- [ ] Зафиксировать единый шаблон `route -> admin-crud/admin-dictionaries -> DB`.
- [ ] Добавить точечные tests на admin CRUD invariants и audit coverage.

### Phase 3: Data and performance

Цель: ускорить реальные горячие сценарии.

- [~] Проверить hot loaders/actions на лишние D1 round-trips.
- Уже сделано для `dashboard-home`, `cars`, `contracts`, `users`, `payments`, `bookings`.
- [ ] Зафиксировать и улучшить индексное покрытие под списки, календари, overlap checks.
- [ ] Стандартизировать кэширование справочников и редко меняемых данных.
- [~] Ввести явный slow-path контроль для дорогих loader/action операций.
- Базовый telemetry-gate уже введен, следующий шаг: thresholds/reporting по latency.

### Phase 4: Reliability

Цель: убрать регрессии при росте.

- [ ] Усилить integration coverage для auth, tenant isolation, checkout, companies access, logs access.
- [ ] Расширить telemetry на ключевые loader/action пути.
- [ ] Держать docs синхронизированными с изменениями потоков и security.

## Порядок выполнения

1. Сначала `checkout`, потому что это публичный денежный flow и показательный giant route.
2. Затем `cars.$id` и `companies.$companyId`, потому что это крупные route-driven файлы.
3. Затем нормализация `app/features/*` для core domains.
4. Затем уже тонкая оптимизация D1, SSR payload и внешних asset dependencies.

## Текущее состояние

- Route-слой стал заметно тоньше в горячих dashboard list flows.
- SQL для list/count/status больше не размазан по нескольким route-модулям.
- Следующий фокус смещается с decomposition на query plans и индексы.

## Критерии завершения этапа

Этап считается завершённым, когда:

- route стал тоньше;
- логика вынесена в server module;
- поведение не сломано;
- проходят `npm run build`, `npm run typecheck`, `npm test`, `npm run rules:check`.
