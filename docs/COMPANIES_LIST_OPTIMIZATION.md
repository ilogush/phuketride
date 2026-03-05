# Companies List Optimization (2026-03-05)

## Что реализовано

1. Двухшаговый листинг:
- Шаг 1: выборка страницы `id` (`LIMIT/OFFSET` + сортировка + фильтры).
- Шаг 2: загрузка деталей по `id IN (...)`.

2. Индексы под сортировки листа:
- `idx_companies_archived_created_at_id`
- `idx_companies_archived_name_id`

3. Оптимизация сортировки по количеству авто:
- Добавлено поле `companies.car_count`.
- Добавлен индекс `idx_companies_archived_car_count_id`.
- Добавлены триггеры синхронизации `car_count` при изменениях в `company_cars`.
- Выполнен бэкофилл `car_count` для существующих данных.

## Миграции

- `migrations/add_companies_list_sort_indexes.sql`
- `migrations/add_companies_car_count_denorm.sql`

Обе миграции применены на remote D1.

## Проверка плана

По `EXPLAIN QUERY PLAN` для hot-path:
- `createdAt` / `name` / `carCount` используют соответствующие индексы.
- `USE TEMP B-TREE FOR ORDER BY` больше не появляется в основной траектории листинга.

## Операционный контроль

Для проверки консистентности денормализованного счётчика:

```bash
npm run db:check:companies-car-count
```

Команда вернёт `OK`, если `companies.car_count` совпадает с фактическим `COUNT(*)` из `company_cars`.
