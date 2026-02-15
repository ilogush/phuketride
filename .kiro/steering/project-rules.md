# Правила для AI Агента

## 1. Коммуникация
- Общайся на русском КОРОТКО. Код и документация на английском.
- **ЗАПРЕЩЕНО** создавать .md файлы без разрешения.
- Максимум 500 строк на файл.

## 2. React Router v7 + Cloudflare (КРИТИЧНО)

### 2.1 Роутинг и данные
- Роутинг через файловую систему `app/routes/`
- Доступ к D1: `context.cloudflare.env.DB` в loader/action
- См. docs/ROUTING.md

### 2.2 State Management (КРИТИЧНО)
- **Модалки**: Nested routes `/colors/new`, НЕ useState. Закрытие через `navigate("/colors")`
- **Табы**: Query params `/settings?tab=profile`, НЕ useState
- **useState**: ТОЛЬКО для dropdown, tooltip, sidebar, form inputs
- Пример модалки:
```tsx
// routes.ts
route("colors", "routes/dashboard.colors.tsx", [
  route("new", "routes/dashboard.colors.new.tsx")
])
// dashboard.colors.tsx
<Link to="/colors/new"><Button>Add</Button></Link>
<Outlet />
```

### 2.3 Компоненты
- **НЕ создавать новые папки** - использовать `app/components/dashboard/` и `app/components/public/`
- См. docs/COMPONENTS.md

## 3. Безопасность (КРИТИЧНО)

### 3.1 Multi-tenancy
- ВСЕГДА проверять `company_id` при создании/изменении Car, Contract, Payment
- Update/Delete: ВСЕГДА `.eq('company_id', current_company_id)`

### 3.2 Валидация
- Zod на клиенте И сервере
- Ошибки на английском

## 4. UI Стандарты (КРИТИЧНО)

### 4.1 Toast уведомления
- НИКОГДА alert/confirm, ТОЛЬКО Toast (useToast из @/lib/toast)
- Action: `return redirect("/path?success=Message")`
- Loader/компонент: читать searchParams и показывать toast в useEffect

### 4.2 Кнопки (КРИТИЧНО)
- **ТОЛЬКО 2 варианта**: `primary` (gray-800) и `secondary` (gray-100)
- **ЗАПРЕЩЕНО** delete, destructive, danger, кастомные className

### 4.3 Таблицы
- **ЗАПРЕЩЕНО** иконки в таблицах
- Actions: `<Button variant="secondary" size="sm">Edit</Button>`

### 4.4 Формы (КРИТИЧНО)
- **ПРАВИЛО 4 ПОЛЕЙ**: `grid-cols-4`, ровно 4 поля в строке
- Группировка через `FormSection`
- Отступы: `space-y-4` между секциями, `gap-4` внутри

### 4.5 Валидация латиницы (КРИТИЧНО)
- Для имен, адресов, документов, VIN добавлять `onChange` с `useLatinValidation`
```tsx
const { validateLatinInput } = useLatinValidation()
<FormInput onChange={(e) => validateLatinInput(e, 'First Name')} />
```

### 4.6 Адаптивность (КРИТИЧНО)
- **Mobile-first**: Все компоненты адаптивны для мобильных устройств
- **Формы**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` - 1 колонка на мобильных, 2 на планшетах, 4 на десктопе
- **Таблицы**: Горизонтальный скролл на мобильных через `overflow-x-auto`
- **Кнопки**: Адаптивные размеры `px-2 sm:px-3`, `text-xs sm:text-sm`
- **Отступы**: Адаптивные `p-4 sm:p-6`, `gap-4 sm:gap-6`

### 4.7 Стиль
- Иконки: ТОЛЬКО @heroicons/react/24/outline
- Фон форм: bg-gray-200 ТОЛЬКО для disabled, активные bg-white
- Модалки: фон `bg-gray-100 backdrop-blur-xl`, окно `bg-white border border-gray-200`

## 5. База Данных (КРИТИЧНО)

### 5.1 Cloudflare D1 - Удаленная БД через wrangler dev
- **Режим работы**: `wrangler dev` - сервер локально (localhost:8787), БД/KV/R2 удаленно в облаке
- **АБСОЛЮТНО ЗАПРЕЩЕНО** флаг `--local` в любых командах
- **АБСОЛЮТНО ЗАПРЕЩЕНО** создавать/использовать `.wrangler/state/v3/d1/*.sqlite`
- **ОБЯЗАТЕЛЬНО**: `npm run dev` использует `wrangler dev` (БЕЗ --local)
- **ОБЯЗАТЕЛЬНО**: Все миграции ТОЛЬКО `--remote`
- **ОБЯЗАТЕЛЬНО**: Доступ к БД ТОЛЬКО через `context.cloudflare.env.DB`
- **Преимущества**: нет конфликта headers, логин работает, данные из удаленной БД
- Именование: `snake_case`
- См. docs/DATABASE.md

### 5.2 Запросы
- Тесты: `LIMIT 10`, проверка существования: `LIMIT 1`
- Указывать колонки: `SELECT id, name` вместо `SELECT *`

### 5.3 Audit Logging
- КАЖДОЕ изменение: Toast + `quickAudit` из @/lib/audit-logger (параллельно)

## 6. Документация
- **КРИТИЧНО**: При изменении кода обновлять docs/*.md
- Начинать с docs/README.md
- Ключевые файлы: BUSINESS_LOGIC.md, COMPONENTS.md, DATABASE.md, ROUTING.md, VALIDATION.md
- См. docs/BUSINESS_LOGIC.md для полной бизнес-логики проекта

## 7. Чистота проекта
- **УДАЛЯТЬ** ненужные файлы после использования
- **УДАЛЯТЬ** тестовые миграции (0010_test_data.sql и подобные)
- **НЕ ОСТАВЛЯТЬ** закомментированный код
- **НЕ СОЗДАВАТЬ** дублирующие файлы
