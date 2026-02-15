# PhuketRide - Car Rental Management System

## Обзор

PhuketRide - система управления арендой автомобилей на React Router v7 + Cloudflare Workers с поддержкой multi-tenancy.

## Технологии

- **Frontend**: React 19, React Router v7
- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **Storage**: Cloudflare R2
- **Styling**: Tailwind CSS 4
- **Validation**: Zod
- **Icons**: Heroicons

## Документация

- [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) - Бизнес-логика системы
- [DATABASE.md](./DATABASE.md) - Схема БД и отношения
- [ROUTING.md](./ROUTING.md) - Роутинг и навигация
- [COMPONENTS.md](./COMPONENTS.md) - UI компоненты
- [VALIDATION.md](./VALIDATION.md) - Валидация данных
- [SECURITY.md](./SECURITY.md) - Безопасность
- [PRICING.md](./PRICING.md) - Ценообразование

## Быстрый старт

```bash
npm install
npm run dev  # http://localhost:5173
```

## База данных

```bash
npm run db:migrate:remote  # Применить миграции
npm run db:studio          # Drizzle Studio
npm run db:generate        # Генерация миграций
```

## Деплой

```bash
npm run deploy
```

## Роли

- **Admin** - полный доступ
- **Partner** - владелец компании
- **Manager** - менеджер компании
- **User** - клиент

## Ключевые файлы

### Конфигурация
- [package.json](../package.json)
- [wrangler.jsonc](../wrangler.jsonc)
- [vite.config.ts](../vite.config.ts)

### База данных
- [app/db/schema.ts](../app/db/schema.ts)
- [drizzle.config.ts](../drizzle.config.ts)

### Роутинг
- [app/routes.ts](../app/routes.ts)
- [app/routes/dashboard.tsx](../app/routes/dashboard.tsx)

### Бизнес-логика
- [app/lib/pricing.ts](../app/lib/pricing.ts)
- [app/lib/auth.server.ts](../app/lib/auth.server.ts)
- [app/lib/audit-logger.ts](../app/lib/audit-logger.ts)

### Валидация
- [app/schemas/car.ts](../app/schemas/car.ts)
- [app/schemas/contract.ts](../app/schemas/contract.ts)
- [app/schemas/payment.ts](../app/schemas/payment.ts)

### Компоненты
- [app/components/dashboard/](../app/components/dashboard/)
- [app/components/public/](../app/components/public/)
