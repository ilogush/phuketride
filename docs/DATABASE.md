# База данных PhuketRide

## Технологии

- **СУБД**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **Миграции**: SQL-файлы + Wrangler D1
- **Именование**: snake_case

## Команды

```bash
npm run db:migrate:remote  # Применить миграции (ТОЛЬКО remote!)
wrangler d1 execute phuketride-bd --remote --file=./drizzle/<migration>.sql
```

**ВАЖНО**: Работаем ТОЛЬКО с удаленной БД (--remote). Локальной БД НЕТ.

## Основные таблицы

### users
Пользователи системы (admin, partner, manager, user)

**Индексы:**
- idx_users_email (email)
- idx_users_role (role)
- idx_users_archived_at (archived_at)

**Файл**: [app/db/schema.ts](../app/db/schema.ts#L5-L35)

### companies
Компании по аренде

**Поля:**
- Контакты (email, phone, telegram)
- Адрес (location_id, district_id, street, house_number)
- Банк (bank_name, account_number, swift_code)
- Настройки (preparation_time, delivery_fee_after_hours)
- Цены (island_trip_price, krabi_trip_price, baby_seat_price_per_day)
- Расписание (weekly_schedule - JSON)
- Праздники (holidays - JSON array)

**Индексы:**
- idx_companies_owner_id (owner_id)
- idx_companies_location_id (location_id)

**Файл**: [app/db/schema.ts](../app/db/schema.ts#L37-L70)

### managers
Связь менеджеров с компаниями

**Индексы:**
- idx_managers_user_id (user_id)
- idx_managers_company_id (company_id)

**Файл**: [app/db/schema.ts](../app/db/schema.ts#L72-L81)

### company_cars
Автомобили компаний

**Поля:**
- Базовые (company_id, template_id, color_id, license_plate, vin, year)
- Характеристики (transmission, engine_volume, fuel_type_id)
- Цены (price_per_day, deposit, insurance prices)
- Обслуживание (mileage, next_oil_change_mileage, oil_change_interval)
- Документы (insurance_expiry_date, tax_road_expiry_date, registration_expiry)
- Статус (available, maintenance, rented, booked)
- Фото (photos, document_photos, green_book_photos - JSON arrays)
- Сезонные цены (seasonal_prices - JSON)

**Индексы:**
- idx_company_cars_company_id (company_id)
- idx_company_cars_status (status)
- idx_cars_company_status (company_id, status)
- idx_cars_template_company (template_id, company_id)

**Файл**: [app/db/schema.ts](../app/db/schema.ts#L196-L244)

### contracts
Договоры аренды

**Поля:**
- Основные (company_car_id, client_id, manager_id, booking_id)
- Даты (start_date, end_date, actual_end_date)
- Финансы (total_amount, deposit_amount, currency)
- Доп. услуги (full_insurance, baby_seat, island_trip, krabi_trip)
- Доставка (pickup_district_id, pickup_hotel, delivery_cost)
- Возврат (return_district_id, return_hotel, return_cost)
- Состояние (start_mileage, end_mileage, fuel_level, cleanliness)
- Статус (active, closed)

**Индексы:**
- idx_contracts_client_id (client_id)
- idx_contracts_company_car_id (company_car_id)
- idx_contracts_status (status)
- idx_contracts_company_dates (company_car_id, start_date, end_date)

**Файл**: [app/db/schema.ts](../app/db/schema.ts#L246-L290)

### bookings
Бронирования

**Статусы:** pending, confirmed, converted, cancelled

**Индексы:**
- idx_bookings_client_id (client_id)
- idx_bookings_company_car_id (company_car_id)
- idx_bookings_status (status)
- idx_bookings_company_dates (company_car_id, start_date, end_date)

**Файл**: [app/db/schema.ts](../app/db/schema.ts#L338-L387)

### payments
Платежи

**Поля:**
- contract_id, payment_type_id
- amount, currency_id
- payment_method (cash, bank_transfer, card)
- status (pending, completed, cancelled)

**Индексы:**
- idx_payments_contract_id (contract_id)
- idx_payments_created_at (created_at)
- idx_payments_status (status)

**Файл**: [app/db/schema.ts](../app/db/schema.ts#L406-L419)

### payment_types
Типы платежей

**Системные типы (is_system = true):**
- Rental Payment (+)
- Deposit (+)
- Deposit Return (-)
- Delivery Fee (+)
- Return Fee (+)
- Full Insurance (+)
- Baby Seat (+)
- Island Trip (+)
- Krabi Trip (+)

**Индексы:**
- idx_payment_types_company_id (company_id)
- idx_payment_types_is_system (is_system)

**Файл**: [app/db/schema.ts](../app/db/schema.ts#L389-L404)

## Справочники

### Глобальные
- **countries** - страны
- **locations** - города/регионы
- **districts** - районы с ценами доставки
- **hotels** - отели
- **car_brands** - бренды
- **car_models** - модели
- **body_types** - типы кузова
- **fuel_types** - типы топлива
- **colors** - цвета

### Шаблоны
- **car_templates** - шаблоны автомобилей
- **seasons** - сезоны для ценообразования
- **rental_durations** - диапазоны длительности

**Файлы:**
- [app/db/schema.ts](../app/db/schema.ts#L180-L194) - car_templates
- [app/db/schema.ts](../app/db/schema.ts#L505-L519) - seasons
- [app/db/schema.ts](../app/db/schema.ts#L493-L503) - rental_durations

### Настройки компании
- **company_delivery_settings** - цены доставки по районам
- **currencies** - валюты

**Файл**: [app/db/schema.ts](../app/db/schema.ts#L127-L139)

## Служебные таблицы

### maintenance_history
История обслуживания автомобилей

**Типы:** oil_change, tire_change, brake_service, general_service, repair, inspection, other

**Индексы:**
- idx_maintenance_history_car_id (company_car_id)
- idx_maintenance_history_performed_at (performed_at)

**Файл**: [app/db/schema.ts](../app/db/schema.ts#L421-L435)

### calendar_events
События календаря

**Типы:** contract, booking, payment_due, payout_due, maintenance, document_expiry, general, meeting, delivery, pickup, other

**Индексы:**
- idx_calendar_events_company_id (company_id)
- idx_calendar_events_start_date (start_date)
- idx_calendar_events_event_type (event_type)

**Файл**: [app/db/schema.ts](../app/db/schema.ts#L437-L454)

### audit_logs
Логи аудита

**Действия:** create, update, delete, view, export, clear

**Индексы:**
- idx_audit_logs_user_id (user_id)
- idx_audit_logs_company_id (company_id)
- idx_audit_logs_entity_type (entity_type)
- idx_audit_logs_created_at (created_at)

**Файл**: [app/db/schema.ts](../app/db/schema.ts#L456-L468)

## Отношения (Relations)

```typescript
// Контракт с автомобилем, клиентом и платежами
const contract = await db.query.contracts.findFirst({
  where: eq(contracts.id, contractId),
  with: {
    companyCar: {
      with: {
        template: {
          with: { brand: true, model: true }
        },
        color: true,
      },
    },
    client: true,
    manager: true,
    payments: {
      with: { paymentType: true }
    },
  },
});
```

**Основные отношения:**
- users → companies (owner)
- companies → companyCars
- companyCars → contracts
- contracts → payments

**Файл**: [app/db/schema.ts](../app/db/schema.ts#L614-L842)

## Работа с БД

### Подключение

```typescript
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";

export async function loader({ context }: Route.LoaderArgs) {
  const db = drizzle(context.cloudflare.env.DB, { schema });
  // ...
}
```

**Файл**: [app/db/index.ts](../app/db/index.ts)

### Примеры запросов

```typescript
// SELECT
const cars = await db.select()
  .from(companyCars)
  .where(
    and(
      eq(companyCars.companyId, companyId),
      eq(companyCars.status, "available")
    )
  );

// INSERT
const [car] = await db.insert(companyCars)
  .values({ ...data, createdAt: new Date() })
  .returning();

// UPDATE
await db.update(companyCars)
  .set({ status: "rented", updatedAt: new Date() })
  .where(eq(companyCars.id, carId));

// DELETE (с проверкой company_id!)
await db.delete(companyCars)
  .where(
    and(
      eq(companyCars.id, carId),
      eq(companyCars.companyId, companyId)
    )
  );
```

### Транзакции

```typescript
await db.transaction(async (tx) => {
  const [contract] = await tx.insert(contracts)
    .values(contractData)
    .returning();

  await tx.update(companyCars)
    .set({ status: "rented" })
    .where(eq(companyCars.id, carId));

  await tx.insert(payments)
    .values(paymentData);
});
```

## Миграции

```bash
# 1. Изменить schema.ts
# 2. Добавить SQL миграцию в drizzle/*.sql
# 3. Применить на remote
npm run db:migrate:remote
```

## Индексы производительности

```sql
-- Поиск автомобилей по статусу
CREATE INDEX idx_cars_company_status 
ON company_cars(company_id, status);

-- Поиск контрактов по датам
CREATE INDEX idx_contracts_company_dates 
ON contracts(company_car_id, start_date, end_date);
```

**Файл**: [drizzle/0037_add_performance_indexes.sql](../drizzle/0037_add_performance_indexes.sql)

## Лучшие практики

1. ВСЕГДА указывать колонки в SELECT
2. ВСЕГДА добавлять LIMIT для тестов
3. ВСЕГДА проверять company_id (multi-tenancy)
4. ВСЕГДА использовать транзакции для связанных операций
5. ВСЕГДА обновлять updated_at
6. НИКОГДА не хранить пароли открыто
