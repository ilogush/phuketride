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

### Текущие индексы (по миграциям)

#### Users
- `idx_users_email` - для login/lookup
- `idx_users_role` - для role-based lists
- `idx_users_passport_number` - для client lookup
- `idx_users_archived_at` - для фильтрации archived
- `idx_users_role_created_at_id` - для сортировки с tiebreaker
- `idx_users_role_email_id` - для сортировки по email
- `idx_users_role_name_id` - для сортировки по имени

#### Companies
- `idx_companies_archived_created_at_id` - для списка с сортировкой
- `idx_companies_archived_name_id` - для сортировки по имени
- `idx_companies_archived_car_count_id` - для сортировки по количеству машин

#### Company Cars
- `idx_company_cars_license_plate_archived` - для поиска по номеру
- `idx_company_cars_company_status_created_at` - для dashboard lists
- `idx_company_cars_company_status_license_plate` - для сортировки по номеру
- `idx_company_cars_company_status_price` - для сортировки по цене
- `idx_company_cars_company_status_mileage` - для сортировки по пробегу
- `idx_company_cars_template_id` - для JOIN optimization
- `idx_company_cars_color_id` - для JOIN optimization

#### Contracts
- `idx_contracts_company_car_id` - для связи с машиной
- `idx_contracts_client_id` - для связи с клиентом
- `idx_contracts_manager_id` - для связи с менеджером
- `idx_contracts_status` - для фильтрации по статусу
- `idx_contracts_start_date` - для календарных queries
- `idx_contracts_end_date` - для календарных queries
- `idx_contracts_status_created_at_id` - для списков с сортировкой
- `idx_contracts_client_status_created_at` - для клиентских списков
- `idx_contracts_company_car_created_at` - для истории по машине
- `idx_contracts_status_start_date_id` - для сортировки по дате начала
- `idx_contracts_status_end_date_id` - для сортировки по дате окончания
- `idx_contracts_status_total_amount_id` - для сортировки по сумме

#### Bookings
- `idx_bookings_company_car_id` - для связи с машиной
- `idx_bookings_company_car_status_created_at` - для dashboard lists

#### Payments
- `idx_payments_contract_id` - для связи с контрактом
- `idx_payments_payment_type_id` - для связи с типом платежа
- `idx_payments_status` - для фильтрации по статусу
- `idx_payments_extra_type` - для фильтрации extras
- `idx_payments_status_created_at_id` - для списков с сортировкой
- `idx_payments_contract_status_created_at` - для истории по контракту

#### Calendar Events
- `idx_calendar_events_company_status_start_date` - для календарных views
- `idx_calendar_events_company_start_status` - для фильтрации событий

#### Car Reviews
- `idx_car_reviews_car_created_at` - для отзывов по машине
- `idx_car_reviews_reviewer_user` - для отзывов пользователя

#### Managers
- `idx_managers_company_active_user` - для списков менеджеров компании

#### Car Templates (JOIN optimization)
- `idx_car_templates_brand_model` - для JOIN с brands/models
- `idx_car_templates_body_type_id` - для JOIN с body types
- `idx_car_templates_fuel_type_id` - для JOIN с fuel types

### Index Strategy

- Composite indexes для hot paths: `(company_id, status, sort_field, id)`
- Tiebreaker `id DESC` для стабильной пагинации
- Foreign key indexes для JOIN performance
- Covering indexes где возможно (включают все поля SELECT)
- Избегаем дублирующих индексов (D1 может использовать prefix)

### Query Optimization Rules

- Используйте JOINs вместо N+1 queries
- Кэшируйте dictionaries (brands, models, colors, districts)
- Избегайте sequential queries где возможен Promise.all
- Для списков всегда используйте repo layer с typed queries
- Detail queries должны получать все данные одним запросом с JOINs
- См. Query Budget в docs/README.md для лимитов по экранам

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
