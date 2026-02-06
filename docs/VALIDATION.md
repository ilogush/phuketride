# Validation Guide

## Overview

All validation uses Zod for type-safe schema validation on both client and server.

- **Library**: Zod
- **Schemas Location**: `app/schemas/`
- **Validation Utility**: `app/lib/validation.ts`

## Validation Rules (CRITICAL)

1. **Validate on client AND server** - Never trust client-side validation alone
2. **Use .safeParse()** - Handle errors gracefully
3. **Return 400 + error details** - Consistent error responses
4. **English error messages** - "Email is required", "Price must be greater than 0"
5. **Validate BEFORE business logic** - Fail fast

## Basic Schema Example

```typescript
import { z } from 'zod'

export const carSchema = z.object({
  licensePlate: z.string().min(1, 'License plate is required'),
  year: z.number().min(1900, 'Year must be after 1900').max(new Date().getFullYear()),
  pricePerDay: z.number().min(0, 'Price must be greater than or equal to 0'),
  deposit: z.number().min(0, 'Deposit must be greater than or equal to 0'),
  status: z.enum(['available', 'maintenance', 'rented', 'booked']),
  companyId: z.number().int().positive(),
})

export type CarInput = z.infer<typeof carSchema>
```

## Server-Side Validation (Actions)

```typescript
import { carSchema } from '@/schemas/car'
import type { Route } from './+types/dashboard.cars'

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData()
  
  // Extract data
  const data = {
    licensePlate: formData.get('licensePlate'),
    year: Number(formData.get('year')),
    pricePerDay: Number(formData.get('pricePerDay')),
    deposit: Number(formData.get('deposit')),
    status: formData.get('status'),
    companyId: Number(formData.get('companyId')),
  }
  
  // Validate
  const result = carSchema.safeParse(data)
  
  if (!result.success) {
    return {
      error: 'Validation failed',
      details: result.error.format(),
    }
  }
  
  // Business logic with validated data
  const db = drizzle(context.cloudflare.env.DB, { schema })
  await db.insert(schema.companyCars).values(result.data)
  
  return redirect('/dashboard/cars')
}
```

## Client-Side Validation

```typescript
import { useState } from 'react'
import { carSchema } from '@/schemas/car'
import { useToast } from '@/lib/toast'
import { Button } from '@/components/ui/Button'

export default function CarForm() {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { addToast } = useToast()
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    const formData = new FormData(e.currentTarget)
    const data = {
      licensePlate: formData.get('licensePlate'),
      year: Number(formData.get('year')),
      pricePerDay: Number(formData.get('pricePerDay')),
      deposit: Number(formData.get('deposit')),
      status: formData.get('status'),
      companyId: Number(formData.get('companyId')),
    }
    
    // Validate
    const result = carSchema.safeParse(data)
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message
        }
      })
      setErrors(fieldErrors)
      await addToast('Validation failed', 'error')
      return
    }
    
    // Submit form
    e.currentTarget.submit()
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <FormField
        label="License Plate"
        name="licensePlate"
        error={errors.licensePlate}
        required
      />
      <FormField
        label="Year"
        name="year"
        type="number"
        error={errors.year}
        required
      />
      <Button type="submit">Submit</Button>
    </form>
  )
}
```

## Common Validation Patterns

### Required String
```typescript
z.string().min(1, 'Field is required')
```

### Email
```typescript
z.string().email('Invalid email address')
```

### Phone Number
```typescript
z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
```

### Positive Number
```typescript
z.number().positive('Must be greater than 0')
```

### Non-Negative Number
```typescript
z.number().min(0, 'Must be greater than or equal to 0')
```

### Integer
```typescript
z.number().int('Must be an integer')
```

### Enum
```typescript
z.enum(['option1', 'option2', 'option3'], {
  errorMap: () => ({ message: 'Invalid option' })
})
```

### Optional Field
```typescript
z.string().optional()
z.string().nullable()
```

### Date
```typescript
z.date()
z.string().datetime() // ISO string
z.coerce.date() // Coerce string to date
```

### Array
```typescript
z.array(z.string()).min(1, 'At least one item required')
z.array(z.string()).max(10, 'Maximum 10 items')
```

### Object
```typescript
z.object({
  name: z.string(),
  age: z.number(),
})
```

### Conditional Validation
```typescript
z.object({
  type: z.enum(['cash', 'card']),
  cardNumber: z.string().optional(),
}).refine(
  (data) => {
    if (data.type === 'card') {
      return !!data.cardNumber
    }
    return true
  },
  {
    message: 'Card number is required for card payments',
    path: ['cardNumber'],
  }
)
```

### Custom Validation
```typescript
z.string().refine(
  (val) => val.length >= 8,
  'Password must be at least 8 characters'
)
```

## Multi-Tenancy Validation

Always validate `company_id` for data isolation:

```typescript
export const carSchema = z.object({
  // ... other fields
  companyId: z.number().int().positive('Company ID is required'),
})

export async function action({ request, context }: Route.ActionArgs) {
  const user = await getUser(context)
  const currentCompanyId = await getCurrentCompanyId(user, context)
  
  const result = carSchema.safeParse(data)
  
  if (!result.success) {
    return { error: 'Validation failed', details: result.error }
  }
  
  // Verify company_id matches current company
  if (result.data.companyId !== currentCompanyId) {
    return { error: 'Unauthorized', status: 403 }
  }
  
  // Proceed with business logic
}
```

## Date Validation

```typescript
export const contractSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine(
  (data) => data.endDate > data.startDate,
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
)
```

## File Upload Validation

```typescript
export const photoSchema = z.object({
  photos: z.array(z.string().url()).max(12, 'Maximum 12 photos allowed'),
})
```

## Nested Object Validation

```typescript
export const contractSchema = z.object({
  client: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
    phone: z.string().min(1, 'Phone is required'),
  }),
  car: z.object({
    id: z.number().int().positive(),
    pricePerDay: z.number().positive(),
  }),
  dates: z.object({
    start: z.coerce.date(),
    end: z.coerce.date(),
  }),
})
```

## Partial Validation (Updates)

```typescript
export const carUpdateSchema = carSchema.partial()

// Or specific fields
export const carUpdateSchema = carSchema.pick({
  pricePerDay: true,
  deposit: true,
  status: true,
})
```

## Error Handling

### Format Errors for Display
```typescript
const result = schema.safeParse(data)

if (!result.success) {
  const fieldErrors: Record<string, string> = {}
  
  result.error.errors.forEach(err => {
    const field = err.path[0]?.toString()
    if (field) {
      fieldErrors[field] = err.message
    }
  })
  
  return { errors: fieldErrors }
}
```

### Display Errors in Forms
```typescript
<FormField
  label="Email"
  name="email"
  type="email"
  error={errors.email}
  required
/>
```

## Database Constraints

Complement Zod validation with database constraints:

```typescript
// In schema.ts
export const users = sqliteTable("users", {
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["admin", "partner", "manager", "user"] }).notNull(),
  // ...
})
```

## Validation Utility Functions

```typescript
// app/lib/validation.ts

export function validateFormData<T>(
  schema: z.ZodSchema<T>,
  formData: FormData
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const data = Object.fromEntries(formData)
  const result = schema.safeParse(data)
  
  if (!result.success) {
    const errors: Record<string, string> = {}
    result.error.errors.forEach(err => {
      const field = err.path[0]?.toString()
      if (field) {
        errors[field] = err.message
      }
    })
    return { success: false, errors }
  }
  
  return { success: true, data: result.data }
}
```

## Best Practices

1. **Define schemas in separate files** - `app/schemas/`
2. **Reuse schemas** - DRY principle
3. **Use .safeParse()** - Never use .parse() in production
4. **Validate early** - Before any business logic
5. **Return structured errors** - Consistent format
6. **Use TypeScript inference** - `z.infer<typeof schema>`
7. **Validate on both sides** - Client for UX, server for security
8. **English messages** - Consistent language
9. **Specific error messages** - Help users fix issues
10. **Test validation** - Unit tests for schemas

## Common Validation Schemas

### User Registration
```typescript
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
})
```

### Login
```typescript
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})
```

### Payment
```typescript
export const paymentSchema = z.object({
  contractId: z.number().int().positive(),
  amount: z.number().positive('Amount must be greater than 0'),
  currency: z.string().default('THB'),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'card']),
  paymentTypeId: z.number().int().positive(),
})
```

### Contract
```typescript
export const contractSchema = z.object({
  companyCarId: z.number().int().positive(),
  clientId: z.string().min(1, 'Client is required'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  totalAmount: z.number().positive('Total amount must be greater than 0'),
  depositAmount: z.number().min(0, 'Deposit must be greater than or equal to 0'),
}).refine(
  (data) => data.endDate > data.startDate,
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
)
```
