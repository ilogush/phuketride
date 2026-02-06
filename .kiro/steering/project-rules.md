# Правила для AI Агента

## 0. Референсный проект
- **ВАЖНО**: Используем `.exemple/` (Next.js проект) как образец и источник компонентов.
- Полный путь к исходнику: `/Users/ulethai/Documents/Dev/PR/.exemple`
- При копировании компонентов из `.exemple/` ВСЕГДА адаптировать под React Router v7:
  - `next/link` → `react-router` (Link)
  - `next/navigation` → `react-router` (useNavigate, useLocation)
  - `'use client'` → удалить
  - `href` → `to` в Link компонентах
  - `prefetch={false}` → удалить
  - Supabase auth → адаптировать под текущую auth систему (Drizzle + D1)
- Сохранять логику, стили и структуру компонентов из образца.
- Исходник доступен в workspace как `.exemple/` директория.
- **Подробное руководство**: См. docs/REFERENCE_PROJECT.md

## 1. Язык и Коммуникация
- Общайся на русском языке (ответы, рассуждения, объяснения).
- **ЗАПРЕЩЕНО** создавать markdown файлы (.md) без явного разрешения.
- Все отчеты и резюме работы выводить в чате, НЕ в файлах.
- Весь код, комментарии, схемы БД и документация ТОЛЬКО на английском.

## 2. Архитектура и Структура

### 2.1 Лимиты файлов
- Максимум 500 строк на файл. При превышении - рефакторинг и разделение.

### 2.2 React Router v7 + Cloudflare (КРИТИЧНО)
- Используем React Router v7 на Cloudflare Workers.
- Роутинг через файловую систему в `app/routes/`.
- Layouts через `app/routes/_layout.tsx` и `app/routes/dashboard._layout.tsx`.
- Loader/Action для загрузки данных, доступ к D1 через `context.cloudflare.env.DB`.
- Деплой на Cloudflare Pages через `npm run deploy`.
- **Подробное руководство**: См. docs/ROUTING.md

### 2.3 Компоненты и Переиспользование
- **КРИТИЧНО**: Все основные UI компоненты находятся в `/Users/ulethai/Documents/Dev/PR/app/components/ui/`
- **НЕ создавать новые папки для компонентов** - работать с существующими
- Редактировать, изменять, расширять существующие компоненты в `app/components/ui/`
- Избегать дублирования кода между компонентами.
- Использовать композицию вместо наследования.
- **Справочник компонентов**: См. docs/COMPONENTS.md

## 3. Безопасность и Валидация (КРИТИЧНО)

### 3.1 Multi-tenancy
- При создании/изменении сущностей (Car, Contract, Payment) ВСЕГДА проверять `company_id`.
- Admin Mode: если активен, `company_id` берется из контекста, не из профиля админа.
- В репозиториях для Update/Delete ВСЕГДА добавлять `.eq('company_id', current_company_id)`.

### 3.2 Валидация данных
- Zod валидация на клиенте И сервере для всех форм.
- API возвращает 400 + `{ error: string, details?: ZodError }` при ошибках валидации.
- Использовать `.safeParse()`, обрабатывать ошибки ДО бизнес-логики.
- Сообщения об ошибках на английском: "Email is required", "Price must be greater than 0".
- БД constraints: NOT NULL, UNIQUE, CHECK на уровне схемы.
- **Подробное руководство**: См. docs/VALIDATION.md

### 3.3 Аутентификация и Авторизация
- Проверка прав доступа через RBAC (см. docs/ROLES_RBAC.md).
- Loader должен проверять аутентификацию и возвращать redirect на /auth/login если не авторизован.
- Проверка роли пользователя перед доступом к защищенным ресурсам.

## 4. UI Стандарты (ОБЯЗАТЕЛЬНО)

### 4.1 Единообразие дашборда (КРИТИЧНО)
- ВСЕ страницы дашборда для ВСЕХ ролей используют ОДИНАКОВУЮ структуру layout.
- Различие между ролями ТОЛЬКО в sidebar меню (пункты меню).
- Компоненты дашборда (StatsCards, ChartsWidget, TasksWidget, QuickActions, RecentActivity, UpcomingEventsWidget, TasksTable, LocationsHealth) используются ВСЕМИ ролями.
- Компоненты role-agnostic - получают данные через props, НЕ проверяют роли внутри.
- Фильтрация по ролям на уровне API и страниц, НЕ в компонентах.

### 4.2 Toast уведомления
- ВСЯ обратная связь через Toast (useToast из @/lib/toast).
- НИКОГДА не использовать alert/confirm.
- ВСЕГДА await перед вызовом Toast.
- БЕЗ эмодзи в текстах Toast.
- Примеры: "Email is required", "Start date cannot be after end date".

### 4.3 Стиль и компоненты
- Иконки: ТОЛЬКО @heroicons/react/24/outline (версия 2.2.0).
- Input поля: rounded-xl.
- Кнопки: компонент Button из @/components/ui/Button.
- Loading states: всегда включать `loading` prop для async действий.

## 5. База Данных и Логирование

### 5.1 Cloudflare D1 (SQLite)
- БД: Cloudflare D1 (SQLite).
- Доступ через `context.cloudflare.env.DB` в loader/action.
- Drizzle ORM для типобезопасных запросов.
- НЕ использовать Soft Delete.
- Именование: таблицы и колонки в `snake_case`.
- Миграции через `npm run db:generate` и `npm run db:migrate`.
- **Схема БД и запросы**: См. docs/DATABASE.md

### 5.2 Оптимизация запросов
- ВСЕГДА `LIMIT 10` для тестовых запросов.
- `LIMIT 1` для проверки существования.
- Указывать конкретные колонки: `SELECT id, name FROM table` вместо `SELECT *`.
- Использовать индексы для часто запрашиваемых полей.
- Избегать N+1 запросов через JOIN или batch queries.

### 5.3 Audit Logging
- КАЖДОЕ изменение данных вызывает Toast И Audit log (quickAudit из @/lib/audit-logger).
- Выполнять параллельно (не ждать записи лога).

## 6. Производительность и Оптимизация

### 6.1 React оптимизации
- Использовать React.memo для тяжелых компонентов.
- useMemo/useCallback для дорогих вычислений и коллбэков.
- Избегать лишних ре-рендеров через правильную структуру state.
- Lazy loading для больших компонентов и роутов.

### 6.2 Загрузка данных
- Loader для серверной загрузки данных (SSR на Cloudflare Workers).
- Доступ к D1: `const db = drizzle(context.cloudflare.env.DB)`.
- Prefetch для критичных данных.
- Кэширование через React Router cache и Cloudflare KV (если нужно).
- Показывать loading состояния для async операций.

### 6.3 Обработка ошибок
- Try-catch для всех async операций.
- Error boundaries для React компонентов.
- Логирование ошибок без чувствительных данных.
- Понятные сообщения об ошибках для пользователя.

## 7. Документация (Single Source of Truth)
- ВСЕГДА начинать работу с чтения docs/README.md.
- **КРИТИЧНО**: При ЛЮБОМ изменении кода обновлять документацию.
- Документация обновляется немедленно при изменении схем БД, API или бизнес-логики.
- ЗАПРЕЩЕНО дублировать информацию между docs/*.md файлами.
- Вся документация в docs/ на английском языке.

### Ключевая документация:
- **docs/README.md** - Обзор проекта, структура, быстрый старт
- **docs/COMPONENTS.md** - Справочник UI компонентов (КРИТИЧНО: все компоненты в /Users/ulethai/Documents/Dev/PR/app/components/ui/)
- **docs/DATABASE.md** - Схема БД, запросы, оптимизация
- **docs/ROUTING.md** - React Router v7, loaders, actions
- **docs/VALIDATION.md** - Zod валидация, паттерны
- **docs/REFERENCE_PROJECT.md** - Адаптация кода из .exemple/

## 8. Алгоритм работы
1. Прочитать docs/README.md и соответствующую документацию.
2. Проверить правила в LOGIC_*.md и ROLES_AND_PAGES.md.
3. Выполнить задачу, соблюдая лимит 500 строк.
4. Внедрить валидацию, логирование и Toast (с await).
5. **ОБЯЗАТЕЛЬНО** обновить документацию при изменениях.
6. Проверить, что изменения отражены в docs/*.md.