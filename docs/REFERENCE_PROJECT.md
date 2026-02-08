# Reference Project Guide (.exemple/)

## Overview

The `.exemple/` directory contains a Next.js implementation of the car rental system. It serves as a reference for:
- Component structure and logic
- UI patterns and styling
- Business logic implementation
- Form handling patterns

**Full Path**: `/Users/ulethai/Documents/Dev/PR/.exemple`

## When to Use Reference Project

Use `.exemple/` as a reference when:
1. Creating new features similar to existing ones
2. Understanding business logic patterns
3. Copying UI components
4. Learning form validation patterns
5. Understanding data flow

## Adaptation Rules (CRITICAL)

When copying code from `.exemple/`, ALWAYS adapt for React Router v7:

### 1. Remove Next.js Client Directive
```typescript
// .exemple/ (Next.js)
'use client'

// Current project (React Router v7)
// Remove this line completely
```

### 2. Navigation Imports
```typescript
// .exemple/ (Next.js)
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

// Current project (React Router v7)
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router'
```

### 3. Link Component
```typescript
// .exemple/ (Next.js)
<Link href="/dashboard/cars" prefetch={false}>
  Cars
</Link>

// Current project (React Router v7)
<Link to="/dashboard/cars">
  Cars
</Link>
```

### 4. Navigation Hooks
```typescript
// .exemple/ (Next.js)
const router = useRouter()
const pathname = usePathname()

router.push('/dashboard/cars')
router.back()

// Current project (React Router v7)
const navigate = useNavigate()
const location = useLocation()

navigate('/dashboard/cars')
navigate(-1)
```

### 5. Search Params
```typescript
// .exemple/ (Next.js)
const searchParams = useSearchParams()
const page = searchParams.get('page')

// Current project (React Router v7)
const [searchParams, setSearchParams] = useSearchParams()
const page = searchParams.get('page')

// Setting params
setSearchParams({ page: '2' })
```

### 6. Data Fetching
```typescript
// .exemple/ (Next.js)
// Client-side fetching with useEffect
useEffect(() => {
  fetch('/api/cars')
    .then(res => res.json())
    .then(data => setCars(data))
}, [])

// Current project (React Router v7)
// Server-side loader
export async function loader({ context }: Route.LoaderArgs) {
  const db = drizzle(context.cloudflare.env.DB, { schema })
  const cars = await db.select().from(schema.companyCars).limit(10)
  return { cars }
}
```

### 7. Form Handling
```typescript
// .exemple/ (Next.js)
const handleSubmit = async (e) => {
  e.preventDefault()
  const res = await fetch('/api/cars', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

// Current project (React Router v7)
import { Form } from 'react-router'

<Form method="post">
  <input name="name" />
  <Button type="submit">Submit</Button>
</Form>

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData()
  // Handle submission
}
```

### 8. Authentication
```typescript
// .exemple/ (Next.js)
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()

// Current project (React Router v7)
import { getUser } from '@/lib/auth.server'

export async function loader({ context }: Route.LoaderArgs) {
  const user = await getUser(context)
  if (!user) throw redirect('/login')
  return { user }
}
```

## Reference Project Structure

```
.exemple/
├── app/
│   ├── (auth)/              # Auth pages
│   ├── (dashboard)/         # Dashboard pages
│   ├── (public)/            # Public pages
│   ├── actions/             # Server actions
│   ├── api/                 # API routes
│   └── globals.css          # Global styles
├── components/
│   ├── admin/               # Admin components
│   ├── analytics/           # Analytics components
│   ├── auth/                # Auth components
│   ├── bookings/            # Booking components
│   ├── calendar/            # Calendar components
│   ├── cars/                # Car components
│   ├── chat/                # Chat components
│   ├── companies/           # Company components
│   ├── contracts/           # Contract components
│   ├── dashboard/           # Dashboard components
│   ├── forms/               # Form components
│   ├── layout/              # Layout components
│   ├── locations/           # Location components
│   ├── payments/            # Payment components
│   ├── profile/             # Profile components
│   ├── search/              # Search components
│   ├── settings/            # Settings components
│   └── ui/                  # UI components
└── lib/                     # Utilities
```

## Common Adaptation Patterns

### Pattern 1: Component with Navigation
```typescript
// .exemple/ (Next.js)
'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Component() {
  const router = useRouter()
  
  return (
    <div>
      <Link href="/dashboard">Dashboard</Link>
      <button onClick={() => router.push('/cars')}>Go</button>
    </div>
  )
}

// Current project (React Router v7)
import { Link, useNavigate } from 'react-router'

export default function Component() {
  const navigate = useNavigate()
  
  return (
    <div>
      <Link to="/dashboard">Dashboard</Link>
      <button onClick={() => navigate('/cars')}>Go</button>
    </div>
  )
}
```

### Pattern 2: Form Component
```typescript
// .exemple/ (Next.js)
'use client'
import { useState } from 'react'

export default function CarForm() {
  const [loading, setLoading] = useState(false)
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const res = await fetch('/api/cars', {
      method: 'POST',
      body: JSON.stringify(formData)
    })
    
    if (res.ok) {
      router.push('/dashboard/cars')
    }
  }
  
  return <form onSubmit={handleSubmit}>...</form>
}

// Current project (React Router v7)
import { Form, useNavigation } from 'react-router'

export default function CarForm() {
  const navigation = useNavigation()
  const isLoading = navigation.state === 'submitting'
  
  return (
    <Form method="post">
      <input name="name" />
      <Button type="submit" loading={isLoading}>
        Submit
      </Button>
    </Form>
  )
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData()
  // Validate and save
  return redirect('/dashboard/cars')
}
```

### Pattern 3: Data Loading
```typescript
// .exemple/ (Next.js)
'use client'
import { useEffect, useState } from 'react'

export default function CarsList() {
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetch('/api/cars')
      .then(res => res.json())
      .then(data => {
        setCars(data)
        setLoading(false)
      })
  }, [])
  
  if (loading) return <Loader />
  
  return <div>{cars.map(car => ...)}</div>
}

// Current project (React Router v7)
import type { Route } from './+types/dashboard.cars'

export async function loader({ context }: Route.LoaderArgs) {
  const db = drizzle(context.cloudflare.env.DB, { schema })
  const cars = await db.select().from(schema.companyCars).limit(10)
  return { cars }
}

export default function CarsList({ loaderData }: Route.ComponentProps) {
  const { cars } = loaderData
  
  return <div>{cars.map(car => ...)}</div>
}
```

## What to Preserve

When adapting from `.exemple/`, ALWAYS preserve:

1. **Business Logic** - Validation rules, calculations, data transformations
2. **Styling** - Tailwind classes, component structure, visual design
3. **Component Structure** - Props, state management, component composition
4. **UI Patterns** - Form layouts, table structures, modal patterns
5. **Error Handling** - Validation messages, error states
6. **Type Definitions** - TypeScript interfaces and types

## What to Change

ALWAYS change:

1. **'use client'** - Remove completely
2. **next/link** - Replace with react-router Link
3. **next/navigation** - Replace with react-router hooks
4. **href** - Change to `to`
5. **prefetch** - Remove (not needed)
6. **Supabase auth** - Replace with current auth system
7. **API routes** - Replace with loaders/actions
8. **Client-side fetching** - Replace with server loaders

## Example: Full Component Adaptation

### Before (.exemple/)
```typescript
'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'

export default function CarsPage() {
  const router = useRouter()
  const [cars, setCars] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetch('/api/cars')
      .then(res => res.json())
      .then(data => {
        setCars(data)
        setLoading(false)
      })
  }, [])
  
  const handleDelete = async (id: number) => {
    await fetch(`/api/cars/${id}`, { method: 'DELETE' })
    setCars(cars.filter(c => c.id !== id))
  }
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      <h1>Cars</h1>
      <Link href="/dashboard/cars/new" prefetch={false}>
        <Button>Add</Button>
      </Link>
      {cars.map(car => (
        <div key={car.id}>
          <span>{car.name}</span>
          <Button onClick={() => handleDelete(car.id)}>Delete</Button>
        </div>
      ))}
    </div>
  )
}
```

### After (Current Project)
```typescript
import { Link, Form } from 'react-router'
import type { Route } from './+types/dashboard.cars'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import * as schema from '@/db/schema'
import { Button } from '@/components/ui/Button'

export async function loader({ context }: Route.LoaderArgs) {
  const db = drizzle(context.cloudflare.env.DB, { schema })
  const cars = await db.select().from(schema.companyCars).limit(10)
  return { cars }
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData()
  const intent = formData.get('intent')
  
  if (intent === 'delete') {
    const id = Number(formData.get('id'))
    const db = drizzle(context.cloudflare.env.DB, { schema })
    await db.delete(schema.companyCars)
      .where(eq(schema.companyCars.id, id))
  }
  
  return { success: true }
}

export default function CarsPage({ loaderData }: Route.ComponentProps) {
  const { cars } = loaderData
  
  return (
    <div>
      <h1>Cars</h1>
      <Link to="/dashboard/cars/new">
        <Button>Add</Button>
      </Link>
      {cars.map(car => (
        <div key={car.id}>
          <span>{car.name}</span>
          <Form method="post">
            <input type="hidden" name="intent" value="delete" />
            <input type="hidden" name="id" value={car.id} />
            <Button type="submit" variant="destructive">Delete</Button>
          </Form>
        </div>
      ))}
    </div>
  )
}
```

## Quick Reference Checklist

When copying from `.exemple/`:

- [ ] Remove `'use client'`
- [ ] Change `next/link` to `react-router`
- [ ] Change `next/navigation` to `react-router`
- [ ] Change `href` to `to`
- [ ] Remove `prefetch={false}`
- [ ] Replace `useRouter()` with `useNavigate()`
- [ ] Replace `usePathname()` with `useLocation()`
- [ ] Replace client-side fetch with loader
- [ ] Replace API routes with actions
- [ ] Replace Supabase auth with current auth
- [ ] Preserve business logic
- [ ] Preserve styling
- [ ] Preserve component structure
- [ ] Test thoroughly

## Common Pitfalls

1. **Forgetting to remove 'use client'** - Will cause errors
2. **Using href instead of to** - Links won't work
3. **Not adapting data fetching** - Use loaders, not useEffect
4. **Not adapting forms** - Use Form component and actions
5. **Not adapting auth** - Use current auth system, not Supabase
6. **Copying API routes** - Convert to loaders/actions instead
