# Extras Migration to Payments

## Дата: 2026-03-04

## Что изменилось

Поля дополнительных услуг (extras) перенесены из таблицы `contracts` в таблицу `payments`.

### Старая структура (contracts)
```
- full_insurance_enabled
- full_insurance_price
- baby_seat_enabled
- baby_seat_price
- island_trip_enabled
- island_trip_price
- krabi_trip_enabled
- krabi_trip_price
```

### Новая структура (payments)
```
- extra_type (TEXT): 'full_insurance' | 'baby_seat' | 'island_trip' | 'krabi_trip' | NULL
- extra_enabled (INTEGER): 0 | 1
- extra_price (REAL)
```

## Как это работает

Теперь каждая дополнительная услуга создается как отдельная запись в таблице `payments`:
- Если в контракте включена страховка, создается payment с `extra_type='full_insurance'`
- Если включено детское кресло, создается payment с `extra_type='baby_seat'`
- И так далее для каждой услуги

## Преимущества

1. Более гибкая структура - можно добавлять новые типы extras без изменения схемы
2. Единая система учета всех платежей и услуг
3. Проще отслеживать историю изменений extras
4. Возможность применять разные статусы и методы оплаты для каждой услуги

## Миграция данных

Миграция автоматически:
1. Добавила новые поля в таблицу `payments`
2. Создала payment записи для всех существующих extras из контрактов
3. Удалила старые поля extras из таблицы `contracts`

## Применение миграции

```bash
# Уже выполнено
npx wrangler d1 execute phuketride-bd --remote --file=./migrations/move_extras_to_payments.sql
```

## Следующие шаги

Необходимо обновить код приложения:
1. Обновить создание контрактов - создавать payment записи для extras
2. Обновить редактирование контрактов - управлять extras через payments
3. Обновить отображение контрактов - читать extras из payments
4. Обновить схемы валидации
