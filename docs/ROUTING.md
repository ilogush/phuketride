# React Router v7 Routing Guide

## Overview

This project uses React Router v7 with file-based routing on Cloudflare Workers.

- **Routes Location**: `app/routes/`
- **Route Config**: `app/routes.ts`
- **Runtime**: Cloudflare Workers (not Node.js)

## Route Configuration

Routes are defined in `app/routes.ts`:

```typescript
import { type RouteConfig, index, route, layout } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("logout", "routes/logout.tsx"),

  // Dashboard with layout
  layout("routes/dashboard.tsx", [
    route("dashboard", "routes/dashboard._index.tsx"),
    
    // Admin routes
    route("dashboard/companies", "routes/dashboard.companies.tsx"),
    route("dashboard/users", "routes/dashboard.users.tsx"),
    // ... more routes
  ]),
] satisfies RouteConfig
```

## Route Structure

### Public Routes
- `/` - Home page (`routes/home.tsx`)
- `/login` - Login page (`routes/login.tsx`)
- `/register` - Registration page (`routes/register.tsx`)
- `/logout` - Logout handler (`routes/logout.tsx`)

### Dashboard Routes (Protected)
All dashboard routes use the layout from `routes/dashboard.tsx`:

#### Admin Routes
- `/dashboard` - Dashboard home
- `/dashboard/companies` - Companies management
- `/dashboard/users` - Users management
- `/dashboard/cars` - Cars management
- `/dashboard/payments` - Payments management
- `/dashboard/locations` - Locations management
- `/dashboard/hotels` - Hotels management
- `/dashboard/durations` - Durations management
- `/dashboard/seasons` - Seasons management
- `/dashboard/colors` - Colors management
- `/dashboard/admin/audit-logs` - Audit logs

#### Partner/Manager Routes
- `/dashboard/contracts` - Contracts management
- `/dashboard/calendar` - Calendar view
- `/dashboard/chat` - Chat interface
- `/dashboard/settings` - Settings
- `/dashboard/bookings` - Bookings management
- `/dashboard/profile` - User profile

#### User Routes
- `/dashboard` - User dashboard (stats, upcoming rentals)
- `/dashboard/search-cars` - Search available cars (client-side)
- `/dashboard/my-bookings` - User's bookings list
- `/dashboard/my-contracts` - User's contracts list
- `/dashboard/my-contracts/:id` - Contract details
- `/dashboard/my-payments` - Payment history
- `/dashboard/notifications` - Notifications (reminders, updates)
- `/dashboard/bookings/create` - Create new booking
- `/dashboard/chat` - Chat with company
- `/dashboard/profile` - User profile
- `/dashboard/settings` - User settings
- `/dashboard/contracts` - Contracts management
- `/dashboard/calendar` - Calendar view
- `/dashboard/chat` - Chat interface
- `/dashboard/settings` - Settings
- `/dashboard/bookings` - Bookings management
- `/dashboard/profile` - User profile

#### User Routes
- `/dashboard/search-cars` - Search available cars
- `/dashboard/my-bookings` - User's bookings
- `/dashboard/my-contracts` - User's contracts

## Route File Structure

### Basic Route
```typescript
// app/routes/dashboard.cars.tsx
import type { Route } from "./+types/dashboard.cars"

export async function loader({ context }: Route.LoaderArgs) {
  // Load data
  return { data }
}

export async function action({ request, context }: Route.ActionArgs) {
  // Handle form submissions
  return { success: true }
}

export default function CarsPage({ loaderData }: Route.ComponentProps) {
  return <div>{/* Component */}</div>
}
```

### Layout Route
```typescript
// app/routes/dashboard.tsx
import { Outlet } from "react-router"
import type { Route } from "./+types/dashboard"

export async function loader({ context }: Route.LoaderArgs) {
  // Check authentication
  const user = await getUser(context)
  if (!user) {
    throw redirect("/login")
  }
  return { user }
}

export default function DashboardLayout({ loaderData }: Route.ComponentProps) {
  return (
    <div>
      <Sidebar user={loaderData.user} />
      <main>
        <Outlet /> {/* Child routes render here */}
      </main>
    </div>
  )
}
```

## Loaders (Data Loading)

Loaders run on the server (Cloudflare Workers) before rendering:

```typescript
export async function loader({ context, params, request }: Route.LoaderArgs) {
  // Access D1 database
  const db = drizzle(context.cloudflare.env.DB, { schema })
  
  // Get URL params
  const url = new URL(request.url)
  const page = url.searchParams.get('page') || '1'
  
  // Get route params
  const { id } = params
  
  // Load data
  const cars = await db.select()
    .from(schema.companyCars)
    .where(eq(schema.companyCars.companyId, currentCompanyId))
    .limit(10)
  
  return { cars, page }
}
```

### Loader Context
```typescript
context.cloudflare.env.DB        // D1 database
context.cloudflare.env.SESSION   // Session storage
context.cloudflare.ctx           // Cloudflare context
```

## Actions (Form Handling)

Actions handle form submissions and mutations:

```typescript
export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData()
  const intent = formData.get('intent')
  
  if (intent === 'create') {
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
    }
    
    // Validate
    const result = schema.safeParse(data)
    if (!result.success) {
      return { error: 'Validation failed', details: result.error }
    }
    
    // Save to database
    const db = drizzle(context.cloudflare.env.DB, { schema })
    await db.insert(schema.users).values(result.data)
    
    return redirect('/dashboard/users')
  }
  
  return { error: 'Invalid intent' }
}
```

### Form Component
```typescript
import { Form } from "react-router"

<Form method="post">
  <input type="hidden" name="intent" value="create" />
  <input type="text" name="name" required />
  <input type="email" name="email" required />
  <Button type="submit">Submit</Button>
</Form>
```

## Navigation

### Link Component
```typescript
import { Link } from "react-router"

<Link to="/dashboard/cars">Cars</Link>
<Link to={`/dashboard/cars/${car.id}`}>View Car</Link>
```

### Programmatic Navigation
```typescript
import { useNavigate } from "react-router"

const navigate = useNavigate()

const handleClick = () => {
  navigate('/dashboard/cars')
}
```

### Redirect
```typescript
import { redirect } from "react-router"

// In loader
export async function loader({ context }: Route.LoaderArgs) {
  const user = await getUser(context)
  if (!user) {
    throw redirect("/login")
  }
  return { user }
}

// In action
export async function action({ request }: Route.ActionArgs) {
  // Process form
  return redirect('/dashboard/cars')
}
```

## Authentication

### Protected Routes
```typescript
// app/routes/dashboard.tsx (layout)
export async function loader({ context }: Route.LoaderArgs) {
  const user = await getUser(context)
  
  if (!user) {
    throw redirect("/login")
  }
  
  return { user }
}
```

### Role-Based Access
```typescript
export async function loader({ context }: Route.LoaderArgs) {
  const user = await getUser(context)
  
  if (!user) {
    throw redirect("/login")
  }
  
  if (user.role !== 'admin') {
    throw new Response("Forbidden", { status: 403 })
  }
  
  return { user }
}
```

## Error Handling

### Error Boundary
```typescript
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <div>
      <h1>Error</h1>
      <p>{error.message}</p>
    </div>
  )
}
```

### Not Found
```typescript
// app/routes/not-found.tsx
export default function NotFound() {
  return (
    <div>
      <h1>404 - Page Not Found</h1>
    </div>
  )
}
```

## Data Fetching Patterns

### Loading State
```typescript
import { useNavigation } from "react-router"

export default function Component() {
  const navigation = useNavigation()
  const isLoading = navigation.state === "loading"
  
  return (
    <div>
      {isLoading && <Loader />}
      {/* Content */}
    </div>
  )
}
```

### Optimistic UI
```typescript
import { useFetcher } from "react-router"

export default function Component() {
  const fetcher = useFetcher()
  
  const handleDelete = (id: number) => {
    fetcher.submit(
      { intent: 'delete', id },
      { method: 'post' }
    )
  }
  
  return (
    <Button onClick={() => handleDelete(1)}>
      Delete
    </Button>
  )
}
```

## URL Search Params

### Reading Params
```typescript
import { useSearchParams } from "react-router"

export default function Component() {
  const [searchParams] = useSearchParams()
  const page = searchParams.get('page') || '1'
  const query = searchParams.get('q') || ''
  
  return <div>Page: {page}</div>
}
```

### Setting Params
```typescript
import { useSearchParams } from "react-router"

export default function Component() {
  const [searchParams, setSearchParams] = useSearchParams()
  
  const handlePageChange = (page: number) => {
    setSearchParams({ page: page.toString() })
  }
  
  return <Button onClick={() => handlePageChange(2)}>Next</Button>
}
```

## Route Params

### Dynamic Routes
```typescript
// app/routes/dashboard.cars.$id.tsx
export async function loader({ params, context }: Route.LoaderArgs) {
  const { id } = params
  
  const db = drizzle(context.cloudflare.env.DB, { schema })
  const car = await db.select()
    .from(schema.companyCars)
    .where(eq(schema.companyCars.id, Number(id)))
    .limit(1)
  
  if (!car[0]) {
    throw new Response("Not Found", { status: 404 })
  }
  
  return { car: car[0] }
}
```

## Meta Tags (SEO)

```typescript
export function meta({ data }: Route.MetaArgs) {
  return [
    { title: "Cars - Dashboard" },
    { name: "description", content: "Manage your cars" },
  ]
}
```

## Deployment

### Build
```bash
npm run build
```

### Deploy to Cloudflare Pages
```bash
npm run deploy
```

### Environment Variables
Set in Cloudflare dashboard or `.dev.vars` for local development.

## Best Practices

1. **Always validate in loaders/actions** - Use Zod schemas
2. **Check authentication in layout loaders** - Protect all child routes
3. **Use LIMIT in database queries** - Prevent loading too much data
4. **Filter by company_id** - Multi-tenancy security
5. **Handle errors gracefully** - Use ErrorBoundary
6. **Use TypeScript types** - Import from `./+types/route-name`
7. **Optimize database queries** - Select specific columns, use indexes
8. **Use Form component** - Better than native forms
9. **Implement loading states** - Better UX
10. **Use redirects for success** - Prevent form resubmission

## Common Patterns

### CRUD Operations
```typescript
// List
export async function loader({ context }: Route.LoaderArgs) {
  const db = drizzle(context.cloudflare.env.DB, { schema })
  const items = await db.select().from(schema.companyCars).limit(10)
  return { items }
}

// Create
export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData()
  const db = drizzle(context.cloudflare.env.DB, { schema })
  
  await db.insert(schema.companyCars).values({
    // ... data
  })
  
  return redirect('/dashboard/cars')
}

// Update
export async function action({ request, params, context }: Route.ActionArgs) {
  const { id } = params
  const formData = await request.formData()
  const db = drizzle(context.cloudflare.env.DB, { schema })
  
  await db.update(schema.companyCars)
    .set({ /* updates */ })
    .where(eq(schema.companyCars.id, Number(id)))
  
  return redirect('/dashboard/cars')
}

// Delete
export async function action({ request, params, context }: Route.ActionArgs) {
  const { id } = params
  const db = drizzle(context.cloudflare.env.DB, { schema })
  
  await db.delete(schema.companyCars)
    .where(eq(schema.companyCars.id, Number(id)))
  
  return redirect('/dashboard/cars')
}
```

### Multi-Intent Actions
```typescript
export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData()
  const intent = formData.get('intent')
  
  switch (intent) {
    case 'create':
      // Handle create
      break
    case 'update':
      // Handle update
      break
    case 'delete':
      // Handle delete
      break
    default:
      return { error: 'Invalid intent' }
  }
}
```
