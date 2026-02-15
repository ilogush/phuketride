# Роутинг PhuketRide

## React Router v7

Файловая система роутинга. **Конфигурация**: [app/routes.ts](../app/routes.ts)

## Публичные роуты

```typescript
index("routes/home.tsx")                    // /
route("login", "routes/login.tsx")          // /login
route("register", "routes/register.tsx")    // /register
route("companies/:companyId", "routes/companies.$companyId.tsx") // /companies/1
route("assets/*", "routes/assets.$.tsx")    // /assets/cars/photo.jpg
```

## Dashboard

```typescript
layout("routes/dashboard.tsx", [
  // вложенные роуты
])
```

**Layout**: [app/routes/dashboard.tsx](../app/routes/dashboard.tsx)

## Admin роуты

```typescript
route("companies", "routes/dashboard.companies.tsx")
route("users", "routes/dashboard.users.tsx")
route("brands", "routes/dashboard.brands.tsx")
route("models", "routes/dashboard.models.tsx")
route("locations", "routes/dashboard.locations.tsx")
route("districts", "routes/dashboard.districts.tsx")
route("hotels", "routes/dashboard.hotels.tsx")
route("durations", "routes/dashboard.durations.tsx")
route("seasons", "routes/dashboard.seasons.tsx")
route("car-templates", "routes/dashboard.car-templates.tsx")
route("reports", "routes/dashboard.reports.tsx")
route("logs", "routes/dashboard.logs.tsx")

// Цвета с модалками
route("colors", "routes/dashboard.colors.tsx", [
  route("new", "routes/dashboard.colors_.new.tsx"),
  route(":colorId/edit", "routes/dashboard.colors_.$colorId.edit.tsx"),
])
```

## Partner/Manager роуты

```typescript
route("cars", "routes/dashboard.cars.tsx")
route("contracts", "routes/dashboard.contracts.tsx", [
  route(":id/close", "routes/dashboard.contracts_.$id.close.tsx"),
])
route("bookings", "routes/dashboard.bookings.tsx")
route("payments", "routes/dashboard.payments.tsx")
route("calendar", "routes/dashboard.calendar.tsx", [
  route("new", "routes/dashboard.calendar.new.tsx"),
])
route("settings", "routes/dashboard.settings.tsx")
route("profile", "routes/dashboard.profile.tsx")
```

## User роуты

```typescript
route("search-cars", "routes/dashboard.search-cars.tsx")
route("my-bookings", "routes/dashboard.my-bookings.tsx")
route("my-contracts", "routes/dashboard.my-contracts.tsx")
route("my-payments", "routes/dashboard.my-payments.tsx")
```

## Модальные роуты (КРИТИЧНО)

Модалки через nested routes, НЕ useState.

**Правильно:**
```typescript
// routes.ts
route("colors", "routes/dashboard.colors.tsx", [
  route("new", "routes/dashboard.colors_.new.tsx"),
])

// dashboard.colors.tsx
<Link to="/colors/new"><Button>Add</Button></Link>
<Outlet />

// dashboard.colors_.new.tsx
const navigate = useNavigate();
return <Modal onClose={() => navigate("/colors")}>...</Modal>;
```

**Примеры:**
- `/colors/new` - создание
- `/colors/:id/edit` - редактирование
- `/calendar/new` - новое событие
- `/contracts/:id/close` - закрытие

**Файлы:**
- [app/routes/dashboard.colors.tsx](../app/routes/dashboard.colors.tsx)
- [app/routes/dashboard.colors_.new.tsx](../app/routes/dashboard.colors_.new.tsx)

## Табы через Query Params (КРИТИЧНО)

**Правильно:**
```typescript
const [searchParams] = useSearchParams();
const activeTab = searchParams.get("tab") || "profile";

<Link to="/settings?tab=profile">Profile</Link>
{activeTab === "profile" && <ProfileTab />}
```

## Loader и Action

### Loader
```typescript
export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await requireAuth(request);
  const db = drizzle(context.cloudflare.env.DB);
  
  const cars = await db.select()
    .from(companyCars)
    .where(eq(companyCars.companyId, user.companyId));
  
  return { cars };
}
```

### Action
```typescript
export async function action({ request, context }: Route.ActionArgs) {
  const user = await requireAuth(request);
  const db = drizzle(context.cloudflare.env.DB);
  const formData = await request.formData();
  
  const data = carSchema.parse(Object.fromEntries(formData));
  
  const [car] = await db.insert(companyCars)
    .values({ ...data, companyId: user.companyId })
    .returning();
  
  await quickAudit(db, {
    userId: user.id,
    entityType: "car",
    entityId: car.id,
    action: "create",
    afterState: car,
  });
  
  return redirect("/cars?success=Car created");
}
```

## Cloudflare доступ

```typescript
// D1
const db = drizzle(context.cloudflare.env.DB);

// R2
const bucket = context.cloudflare.env.ASSETS;

// KV
const cache = context.cloudflare.env.CACHE;
```

**Файл**: [worker-configuration.d.ts](../worker-configuration.d.ts)

## Toast уведомления

```typescript
// Action
return redirect("/cars?success=Car created");

// Loader/Component
const [searchParams] = useSearchParams();
const successMessage = searchParams.get("success");

useEffect(() => {
  if (successMessage) toast.success(successMessage);
}, [successMessage]);
```

**Файл**: [app/lib/toast.tsx](../app/lib/toast.tsx)

## Навигация

```typescript
import { Link, useNavigate, Form } from "react-router";

<Link to="/cars">Cars</Link>

const navigate = useNavigate();
navigate("/cars");

<Form method="post">
  <input type="hidden" name="intent" value="create" />
  <button type="submit">Create</button>
</Form>
```

## Защита роутов

```typescript
const user = await requireAuth(request);
const user = await requireRole(request, ["admin", "partner"]);

if (user.role !== "admin" && user.companyId !== companyId) {
  throw redirect("/dashboard");
}
```

**Файл**: [app/lib/auth.server.ts](../app/lib/auth.server.ts)

## API роуты

```typescript
export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await requireAuth(request);
  const db = drizzle(context.cloudflare.env.DB);
  
  const events = await db.select()
    .from(calendarEvents)
    .where(eq(calendarEvents.companyId, user.companyId));
  
  return Response.json(events);
}
```

**Файлы:**
- [app/routes/api.calendar-events.tsx](../app/routes/api.calendar-events.tsx)
- [app/routes/api.metrics.dashboard-charts.tsx](../app/routes/api.metrics.dashboard-charts.tsx)
