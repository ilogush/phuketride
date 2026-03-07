# База данных PhuketRide

## Платформа

- Cloudflare D1
- source of truth: только remote database
- миграции: `migrations/*.sql`
- SQL-файлы миграций хранятся как история схемы и bootstrap-лог; они не означают использование local DB
- локальный `.wrangler/state` не используется как рабочая БД и должен регулярно очищаться

## Ключевые таблицы

### `users`

Назначение:

- auth identity;
- роли системы;
- клиентские и dashboard-пользователи.

Критичные поля:

- `id`
- `email`
- `role`
- `password_hash`
- `archived_at`

Инварианты:

- email должен быть уникален;
- archived user не должен логиниться;
- доступ к данным пользователя зависит от роли и tenancy.

### `companies`

Назначение:

- tenant root entity.

Критичные поля:

- `id`
- `owner_id`
- `location_id`
- `district_id`
- pricing/settings fields
- `archived_at`

Инварианты:

- tenant-specific данные должны в конечном итоге резолвиться к компании;
- archived company не должна участвовать в активных flows.

### `managers`

Связь user ↔ company для менеджеров.

Инварианты:

- manager должен быть активным (`is_active = 1`) для работы в dashboard.

### `company_cars`

Конкретные машины компании.

Критичные поля:

- `company_id`
- `template_id`
- `status`
- `price_per_day`
- `deposit`
- `min_rental_days`
- insurance-related fields
- `archived_at`

Инварианты:

- каждая машина принадлежит одной компании;
- archived cars не должны участвовать в новых bookings/contracts.

### `bookings`

Предварительные бронирования.

Критичные поля:

- `company_car_id`
- `client_id`
- `manager_id`
- `start_date`
- `end_date`
- `estimated_amount`
- extras flags/prices
- `status`

Инварианты:

- booking должен относиться к машине компании;
- booking detail/action требует ownership validation;
- сумма booking создаётся сервером.

### `contracts`

Активные и закрытые аренды.

Критичные поля:

- `company_car_id`
- `client_id`
- `manager_id`
- `start_date`
- `end_date`
- `total_amount`
- `deposit_amount`
- `status`

Инварианты:

- для одной машины не должно быть пересекающихся активных контрактов;
- contract financials должны соответствовать server-side calculation.

### `payments`

Денежные операции по контрактам.

Инварианты:

- payment должен ссылаться на valid `payment_type`;
- суммы не должны появляться из client input без server recalculation.

### `audit_logs`

История действий.

Критичные поля:

- `user_id`
- `company_id`
- `entity_type`
- `entity_id`
- `action`
- `before_state`
- `after_state`
- `ip_address`

Инварианты:

- лог не должен быть публично доступен;
- очистка логов — только admin action.

## Индексы и perf-направления

Приоритетные сценарии:

- списки компаний;
- списки машин;
- списки контрактов/платежей/bookings;
- календарные выборки;
- overlap checks по контрактам.

Нужны индексы под:

- `company_id + status`
- `company_car_id + start_date + end_date`
- частые сортировки и фильтры dashboard

## Operational discipline

- schema changes вносятся только через миграции;
- D1-операции выполняются только через `wrangler d1 ... --remote`;
- runtime binding `DB` в `wrangler.jsonc` должен оставаться `remote: true` без `preview_database_id`;
- локальные инструкции с `--local` считаются устаревшими и должны удаляться из проекта;
- временный local state после отладки очищается через `npm run clean:remote-only`;
- remote-статус миграций проверяется через `npm run db:status:remote`;
- dictionary/query reuse должен идти через shared server modules, а не через копирование SQL по route-файлам;
- после миграций проверяются schema и критичные flows;
- любые изменения в `users`, `companies`, `bookings`, `contracts`, `payments` требуют обновления docs и проверки rules.
