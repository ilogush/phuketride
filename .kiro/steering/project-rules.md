# Правила для AI Агента

## 1. Язык и Коммуникация
- Общайся на русском языке КОРОТКО (ответы, рассуждения, объяснения).
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

### 2.2.1 Интерактивность и State Management (КРИТИЧНО)
**ПРАВИЛО**: Используй правильные паттерны React Router v7 для интерактивности:

1. **Модальные окна через URL (Nested Routes)**:
   - Модалки открываются через вложенные маршруты, НЕ через useState
   - Пример: `/colors/new` открывает модалку создания поверх `/colors`
   - Пример: `/colors/123/edit` открывает модалку редактирования
   - В родительском роуте добавить `<Outlet />` для рендера вложенных роутов
   - В `routes.ts`: `route("colors", "routes/dashboard.colors.tsx", [route("new", "routes/dashboard.colors.new.tsx")])`
   - Закрытие модалки через `navigate("/colors")` вместо `setIsOpen(false)`

2. **Табы через URL (Search Params)**:
   - Табы переключаются через query параметры: `/settings?tab=profile`
   - Использовать `useSearchParams()` для чтения активного таба
   - Ссылки на табы: `<Link to="/settings?tab=profile">Profile</Link>`
   - НЕ использовать useState для activeTab, если нужна навигация в истории браузера

3. **Локальный State (useState)**:
   - Использовать ТОЛЬКО для UI состояний БЕЗ навигации:
     - Открытие/закрытие dropdown меню
     - Показ/скрытие tooltip
     - Сворачивание/разворачивание sidebar
     - Форм inputs (контролируемые компоненты)
   - НЕ использовать для модалок, табов, фильтров, которые должны быть в URL

4. **Условный рендеринг**:
   - JSX: `{isOpen && <Dropdown />}` для локальных UI элементов
   - CSS отвечает ТОЛЬКО за внешний вид (анимации, позиционирование)
   - JavaScript отвечает за логику показа/скрытия

**Примеры правильного использования**:
```tsx
// ✅ ПРАВИЛЬНО: Модалка через nested route
// routes.ts
route("colors", "routes/dashboard.colors.tsx", [
  route("new", "routes/dashboard.colors.new.tsx"),
  route(":id/edit", "routes/dashboard.colors.$id.edit.tsx"),
])

// dashboard.colors.tsx
<Link to="/colors/new"><Button>Add</Button></Link>
<Outlet /> {/* Рендерит модалку */}

// dashboard.colors.new.tsx
<Modal isOpen={true} onClose={() => navigate("/colors")}>
  <Form method="post">...</Form>
</Modal>

// ✅ ПРАВИЛЬНО: Табы через URL
const [searchParams] = useSearchParams()
const activeTab = searchParams.get('tab') || 'profile'
<Link to="/settings?tab=profile">Profile</Link>

// ✅ ПРАВИЛЬНО: Локальный state для UI
const [isSidebarOpen, setIsSidebarOpen] = useState(true)
<Sidebar isOpen={isSidebarOpen} />

// ❌ НЕПРАВИЛЬНО: Модалка через useState
const [isModalOpen, setIsModalOpen] = useState(false)
<Button onClick={() => setIsModalOpen(true)}>Add</Button>
```

### 2.3 Компоненты и Переиспользование
- **КРИТИЧНО**: Все основные UI компоненты находятся в `/Users/ulethai/Documents/Dev/PR/app/components`
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

### 4.3 Стиль и компоненты
- Иконки: ТОЛЬКО @heroicons/react/24/outline (версия 2.2.0).

### 4.3.1 Стандартизация кнопок (КРИТИЧНО)
- **ТОЛЬКО 2 ВАРИАНТА КНОПОК**:
  - `variant="primary"` - bg-gray-800, text-white (основные действия: Create, Save, Submit)
  - `variant="secondary"` - bg-gray-100, text-gray-800 (второстепенные действия: Cancel, Back, Remove)
- **ЗАПРЕЩЕНО** использовать другие варианты (delete, destructive, danger и т.д.)
- **ЗАПРЕЩЕНО** создавать кастомные стили кнопок через className
- Все кнопки должны использовать компонент Button из @/components/ui/Button

### 4.4 Единообразие форм (КРИТИЧНО)
- **ПРАВИЛО 4 ПОЛЕЙ**: ВСЕ формы используют сетку из 4 колонок (`grid-cols-4`)
- Каждая строка формы содержит РОВНО 4 поля ввода
- Если полей меньше 4 в строке - оставить пустые колонки
- Использовать только `FormSection` для группировки полей с заголовком и иконкой
- Отступы между секциями: `space-y-4`
- Отступы между строками внутри секции: `gap-4` (горизонтально и вертикально)

## 5. База Данных и Логирование

### 5.1 Cloudflare D1 (SQLite) - ЕДИНСТВЕННАЯ БД (КРИТИЧНО)
- **ЗАПРЕЩЕНО** использовать локальные БД (PostgreSQL, MySQL, SQLite файлы).
- **ЗАПРЕЩЕНО** создавать/изменять код для работы с локальными БД.
- **ТОЛЬКО** Cloudflare D1 (SQLite) через `context.cloudflare.env.DB`.
- Доступ к БД ИСКЛЮЧИТЕЛЬНО через `context.cloudflare.env.DB` в loader/action.
- Drizzle ORM для типобезопасных запросов к D1.
- НЕ использовать Soft Delete.
- Именование: таблицы и колонки в `snake_case`.
- Миграции через `npm run db:generate` и `npm run db:migrate:local` (локально) или `npm run db:migrate:remote` (продакшн).
- **Схема БД и запросы**: См. docs/DATABASE.md

### 5.1.1 Синхронизация БД (КРИТИЧНО)
- **ПРАВИЛО**: Локальная БД в `.wrangler/state/v3/d1/` - ТОЛЬКО для разработки через `wrangler dev`.
- **ЗАПРЕЩЕНО** напрямую работать с SQLite файлами в `.wrangler/`.
- **Синхронизация с Cloudflare D1**:
  1. Применить миграции локально: `npm run db:migrate:local`
  2. Проверить данные через `wrangler d1 execute phuketride-bd --local --command "SELECT * FROM users LIMIT 5"`
  3. Применить миграции на продакшн: `npm run db:migrate:remote`
  4. Проверить продакшн: `wrangler d1 execute phuketride-bd --remote --command "SELECT * FROM users LIMIT 5"`
- **Очистка локальной БД**: Удалить `.wrangler/state/` и запустить `npm run db:migrate:local` заново.
- **НИКОГДА** не коммитить `.wrangler/` в git (уже в .gitignore).

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