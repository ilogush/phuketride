# Optimization Roadmap — Phuket Ride

> Только планы. Без истории выполненного. Обновляется при каждой итерации.

---

## 🔴 P1 — Критические (Выполнить первыми)

### 1.1 Устранить `sdb.db as any` в роутах (27 мест)
Файлы: `settings.tsx`, `car-templates.tsx`, `dashboard-home.tsx`, `logs.tsx`, `durations.tsx`, `seasons.tsx`.
**Решение:** Добавить методы в `createScopedDb()` для каждого репозитория.

### 1.2 `context.cloudflare.env.DB` напрямую в lib-файлах (54 места)
Файлы: `contracts-new-action.server.ts`, `contracts-edit-action.server.ts`, `cars-create-action.server.ts`, `cars-edit-action.server.ts`, `settings-actions.server.ts`, `bookings-create.server.ts`.
**Решение:** Принимать `db: D1Database` как параметр от вызывающего роута (уже является паттерном — нужно очистить точки входа).

### 1.3 `DataTable` без `isLoading` в 9+ местах
Файлы: `cars.tsx`, `seasons.tsx`, `models.tsx`, `colors.tsx`, `car-templates.tsx`, `locations.tsx`, `hotels.tsx`, `payments.tsx`, `companies.tsx`, `users.tsx`.
**Решение:** Добавить `isLoading={navigation.state === "loading"}` в каждый DataTable.

---

## 🟠 P2 — Важные (Выполнить в этой сессии)

### 2.1 Meta-теги отсутствуют в 20+ роутах
Файлы: `admin-cars.$id.tsx`, `admin-companies.$companyId.tsx`, `bookings.tsx`, `bookings.$id.tsx`, `calendar.tsx`, `car-templates.tsx`, `cars.tsx`, `become-a-host.tsx`, `booking-confirmation.tsx` и др.
**Решение:** Добавить `export const meta: MetaFunction` с title + description + robots=noindex для admin-роутов.

### 2.2 `seasons.tsx` action использует `sdb.db as any` через `handleSeasonsAction`
Аналогично `durations.tsx` action → `handleDurationsAction`.
**Решение:** Обернуть вызовы action-хэндлеров через `sdb.db` напрямую.

### 2.3 Роуты `my-contracts.$id.tsx`, `contracts.new.tsx`, `cars.$id.checkout.tsx` — прямой DB-доступ
**Решение:** Мигрировать на `getScopedDb` с правильным `accessFn`.

### 2.4 Добавить методы в `sdb` для `seasons`, `durations` (actions)
Сейчас `sdb.seasons.list()` есть, но action идёт через `sdb.db as any`.
**Решение:** `sdb.seasons.create/update/delete`, `sdb.durations.create/update/delete`.

---

## 🟡 P3 — Стандартное качество (Выполнить следующими)

### 3.1 `console.log` в `monitoring.server.ts` (3 места)
Использовать структурированный логгер через `trackServerOperation` или `telemetry`.

### 3.2 `useSearchParams` импортирован в `logs.tsx` но не используется
**Решение:** Удалить лишний импорт.

### 3.3 `payment_status as any` в `payment-statuses.tsx`
`audit: { entityType: "payment_status" as any }` — добавить `payment_status` в `EntityType`.
**Решение:** Расширить union-тип `EntityType` в `audit-logger.ts`.

### 3.4 Оптимизация `loadAdminDistricts` — нет index на `name LIKE`
**Решение:** Добавить индекс `CREATE INDEX idx_districts_name ON districts(name)` через SQL-миграцию.

### 3.5 Оптимизация `loadAdminBrands` — нет index на `car_brands.name`
**Решение:** `CREATE INDEX idx_car_brands_name ON car_brands(name)`.

---

## 🟢 P4 — Nice-to-have (Бэклог)

### 4.1 Серверная пагинация для `settings.tsx`
Locations и Districts внутри Settings загружаются целиком.

### 4.2 Типизировать `AdminRouteContext` без `as any`
Расширить union `EntityType` и `AuditAction` в `audit-logger.ts`.

### 4.3 Lazy-import тяжёлых компонентов (Calendar, Charts)
`dashboard-home.tsx` и `calendar.tsx` — большие бандлы. Рассмотреть динамический import.

### 4.4 Префетч данных для часто посещаемых роутов (`brands`, `models`, `hotels`)
Использовать `<Link prefetch="intent">` в навигационном сайдбаре.

### 4.5 Добавить `Cache-Control` хедеры для публичных страниц
Роуты `/cars`, `/cars/$id` — могут кэшироваться на Edge (Cloudflare).

---

## 🏗️ В работе прямо сейчас

- [ ] **P1.3** — `isLoading` в DataTable (cars, seasons, models, colors, locations, hotels, payments, companies, users)
- [ ] **P2.1** — Meta-теги в admin-роутах (bookings, calendar, car-templates, admin-*)
- [ ] **P3.3** — `EntityType` расширить для `payment_status`
- [ ] **P3.2** — Удалить лишние импорты
