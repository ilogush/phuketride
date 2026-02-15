# Бизнес-логика PhuketRide

## Основные сущности

### 1. Пользователи (Users)

**Роли:**
- **Admin** - администратор системы, полный доступ
- **Partner** - владелец компании по аренде
- **Manager** - менеджер компании
- **User** - клиент

**Файл**: [app/db/schema.ts](../app/db/schema.ts#L5-L35)

### 2. Компании (Companies)

Независимые арендодатели с:
- Автопарком
- Менеджерами
- Настройками цен
- Расписанием работы
- Праздничными днями (JSON)

**Файл**: [app/db/schema.ts](../app/db/schema.ts#L37-L70)

### 3. Автомобили

#### 3.1 Шаблоны (Car Templates)
Общая информация о модели: бренд, модель, тип кузова, характеристики.

**Файл**: [app/db/schema.ts](../app/db/schema.ts#L180-L194)

#### 3.2 Автомобили компании (Company Cars)
Конкретные экземпляры с VIN, номером, ценами, статусом.

**Статусы:**
- `available` - доступен
- `maintenance` - на обслуживании
- `rented` - в аренде
- `booked` - забронирован

**Файл**: [app/db/schema.ts](../app/db/schema.ts#L196-L244)

### 4. Бронирования (Bookings)

**Жизненный цикл:**
1. Клиент создает (`pending`)
2. Менеджер подтверждает (`confirmed`)
3. Конвертация в контракт (`converted`)
4. Или отмена (`cancelled`)

**Файл**: [app/db/schema.ts](../app/db/schema.ts#L338-L387)

### 5. Контракты (Contracts)

Активный договор аренды.

**Создание:**
- Из бронирования
- Напрямую (walk-in)

**Закрытие:**
1. Фактическая дата возврата
2. Конечный пробег
3. Состояние (топливо, чистота)
4. Финальные платежи
5. Статус → `closed`

**Файл**: [app/db/schema.ts](../app/db/schema.ts#L246-L290)

### 6. Платежи (Payments)

**Системные типы:**
- Rental Payment (+)
- Deposit (+)
- Deposit Return (-)
- Delivery Fee (+)
- Return Fee (+)
- Full Insurance (+)
- Baby Seat (+)
- Island Trip (+)
- Krabi Trip (+)

**Файл**: [app/db/schema.ts](../app/db/schema.ts#L406-L419)

### 7. Календарь (Calendar Events)

**Типы событий:**
- contract, booking
- payment_due, payout_due
- maintenance, document_expiry
- delivery, pickup
- general, meeting, other

**Файл**: [app/db/schema.ts](../app/db/schema.ts#L437-L454)

## Бизнес-процессы

### Процесс 1: Бронирование → Контракт

1. Клиент создает бронирование
2. Менеджер подтверждает
3. Выдача автомобиля (конвертация)
   - Фиксация пробега/состояния
   - Фото
   - Депозит
4. Возврат (закрытие)
   - Конечный пробег
   - Финальные платежи
   - Возврат депозита

### Процесс 2: Walk-in аренда

Прямое создание контракта без бронирования.

### Процесс 3: Обслуживание

1. Планирование (по пробегу)
2. Статус → `maintenance`
3. Запись в maintenance_history
4. Статус → `available`

**Файл**: [app/db/schema.ts](../app/db/schema.ts#L421-L435)

## Ценообразование

### Формула

```
daily_price = base_price × season_multiplier × duration_multiplier
total_price = daily_price × days
```

### Сезоны (Seasons)

Период + множитель цены.

**Пример:**
- High Season (Dec 20 - Jan 20): 1.5 (+50%)
- Low Season (May 6 - Oct 20): 0.8 (-20%)

**Файл**: [app/db/schema.ts](../app/db/schema.ts#L505-L519)

### Длительность (Rental Durations)

Диапазон дней + множитель.

**Пример:**
- 1-3 дня: 1.0
- 4-7 дней: 0.95 (-5%)
- 8-14 дней: 0.90 (-10%)
- 29+ дней: 0.80 (-20%)

**Файл**: [app/db/schema.ts](../app/db/schema.ts#L493-L503)

### Дополнительные услуги

Фиксированные цены из настроек компании.

### Доставка

Цены по районам (districts) с возможностью переопределения компанией.

**Файл**: [app/lib/pricing.ts](../app/lib/pricing.ts)

## Multi-tenancy

### Изоляция данных

Фильтрация по company_id через company_car_id.

### Проверки безопасности

```typescript
// ВСЕГДА проверять company_id
const car = await db.select()
  .from(companyCars)
  .where(
    and(
      eq(companyCars.id, carId),
      eq(companyCars.companyId, currentCompanyId)
    )
  );
```

**Файл**: [app/lib/auth.server.ts](../app/lib/auth.server.ts)

## Audit Logging

Все критичные операции логируются.

**Действия:** create, update, delete, view, export, clear

```typescript
await quickAudit(db, {
  userId: user.id,
  role: user.role,
  companyId: user.companyId,
  entityType: "car",
  entityId: car.id,
  action: "create",
  afterState: car,
});
```

**Файл**: [app/lib/audit-logger.ts](../app/lib/audit-logger.ts)

## Справочники

### Глобальные (admin)
- Countries, Locations, Districts, Hotels
- Car Brands, Models, Body Types, Fuel Types, Colors
- Seasons, Rental Durations

### Компании
- Payment Types (кастомные)
- Currencies (кастомные)
- Company Delivery Settings
