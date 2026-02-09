# Database Documentation

## Overview

- **Database**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **Schema Location**: `app/db/schema.ts`
- **Naming Convention**: `snake_case` for tables and columns

## Database Access

### In Loaders/Actions
```tsx
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@/db/schema'

export async function loader({ context }: Route.LoaderArgs) {
  const db = drizzle(context.cloudflare.env.DB, { schema })
  
  const users = await db.select().from(schema.users).limit(10)
  
  return { users }
}
```

## Core Tables

### Users
Multi-role user system with profile information.

```typescript
users {
  id: text (UUID, PK)
  email: text (unique, not null)
  role: enum ['admin', 'partner', 'manager', 'user']
  name: text
  surname: text
  phone: text
  whatsapp: text
  telegram: text
  passportNumber: text
  citizenship: text
  city: text
  countryId: integer (FK)
  dateOfBirth: timestamp
  gender: enum ['male', 'female', 'other']
  passportPhotos: text (JSON array)
  driverLicensePhotos: text (JSON array)
  avatarUrl: text
  hotelId: integer (FK)
  roomNumber: text
  locationId: integer (FK)
  districtId: integer (FK)
  address: text
  isFirstLogin: boolean (default: true)
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Indexes**: email, role

### Companies
Rental companies (partners).

```typescript
companies {
  id: integer (PK, auto-increment)
  name: text (not null)
  ownerId: text (FK to users, not null)
  email: text (not null)
  phone: text (not null)
  telegram: text
  locationId: integer (FK, not null)
  districtId: integer (FK, not null)
  street: text (not null)
  houseNumber: text (not null)
  address: text
  // Bank Details
  bankName: text
  accountNumber: text
  accountName: text
  swiftCode: text
  // Booking Settings
  preparationTime: integer (default: 30)
  deliveryFeeAfterHours: real (default: 0)
  islandTripPrice: real
  krabiTripPrice: real
  babySeatPricePerDay: real
  // Schedule & Holidays
  weeklySchedule: text (JSON)
  holidays: text (JSON array)
  settings: text (JSON)
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Indexes**: ownerId, locationId

### Managers
Links users to companies as managers.

```typescript
managers {
  id: integer (PK, auto-increment)
  userId: text (FK to users, not null)
  companyId: integer (FK to companies, not null)
  isActive: boolean (default: true)
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Indexes**: userId, companyId

### Company Cars
Cars owned by companies.

```typescript
companyCars {
  id: integer (PK, auto-increment)
  companyId: integer (FK, not null)
  templateId: integer (FK to carTemplates)
  colorId: integer (FK to colors)
  licensePlate: text (not null)
  vin: text
  year: integer
  transmission: text
  engineVolume: real
  fuelTypeId: integer (FK to fuelTypes)
  pricePerDay: real (default: 0)
  deposit: real (default: 0)
  minInsurancePrice: real
  maxInsurancePrice: real
  fullInsuranceMinPrice: real
  fullInsuranceMaxPrice: real
  mileage: integer (default: 0)
  nextOilChangeMileage: integer
  oilChangeInterval: integer (default: 10000)
  insuranceExpiryDate: timestamp
  taxRoadExpiryDate: timestamp
  registrationExpiry: timestamp
  insuranceType: text
  status: enum ['available', 'maintenance', 'rented', 'booked'] (default: 'available')
  photos: text (JSON array, max 12)
  documentPhotos: text (JSON array)
  greenBookPhotos: text (JSON array, max 3)
  insurancePhotos: text (JSON array, max 3)
  taxRoadPhotos: text (JSON array, max 3)
  description: text
  marketingHeadline: text
  featuredImageIndex: integer (default: 0)
  seasonalPrices: text (JSON array)
  archivedAt: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Indexes**: companyId, status, (companyId + status), (templateId + companyId)

### Contracts
Rental contracts between clients and companies.

```typescript
contracts {
  id: integer (PK, auto-increment)
  companyCarId: integer (FK, not null)
  clientId: text (FK to users, not null)
  managerId: text (FK to users)
  bookingId: integer
  startDate: timestamp (not null)
  endDate: timestamp (not null)
  actualEndDate: timestamp
  totalAmount: real (not null)
  totalCurrency: text (default: 'THB')
  depositAmount: real
  depositCurrency: text (default: 'THB')
  depositPaymentMethod: enum ['cash', 'bank_transfer', 'card']
  fullInsuranceEnabled: boolean (default: false)
  fullInsurancePrice: real (default: 0)
  babySeatEnabled: boolean (default: false)
  babySeatPrice: real (default: 0)
  islandTripEnabled: boolean (default: false)
  islandTripPrice: real (default: 0)
  krabiTripEnabled: boolean (default: false)
  krabiTripPrice: real (default: 0)
  pickupDistrictId: integer (FK)
  pickupHotel: text
  pickupRoom: text
  deliveryCost: real (default: 0)
  returnDistrictId: integer (FK)
  returnHotel: text
  returnRoom: text
  returnCost: real (default: 0)
  startMileage: integer
  endMileage: integer
  fuelLevel: text (default: 'full')
  cleanliness: text (default: 'clean')
  status: enum ['draft', 'active', 'completed', 'cancelled'] (default: 'active')
  photos: text (JSON array)
  notes: text
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Indexes**: clientId, companyCarId, status, (companyCarId + startDate + endDate), (status + companyCarId)

### Payments
Payment records for contracts.

```typescript
payments {
  id: integer (PK, auto-increment)
  contractId: integer (FK, not null)
  paymentTypeId: integer (FK, not null)
  amount: real (not null)
  currency: text (default: 'THB')
  paymentMethod: enum ['cash', 'bank_transfer', 'card']
  status: enum ['pending', 'completed', 'cancelled'] (default: 'completed')
  notes: text
  createdBy: text (FK to users)
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Indexes**: contractId, createdAt, status

### Payment Types
Types of payments (system and custom).

```typescript
paymentTypes {
  id: integer (PK, auto-increment)
  name: text (unique, not null)
  sign: enum ['+', '-']
  description: text
  companyId: integer (FK)
  isSystem: boolean (default: false)
  isActive: boolean (default: true)
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Indexes**: companyId, isSystem

### Calendar Events
Events for scheduling and reminders.

```typescript
calendarEvents {
  id: integer (PK, auto-increment)
  companyId: integer (FK, not null)
  eventType: enum ['contract', 'booking', 'payment_due', 'payout_due', 
                   'maintenance', 'document_expiry', 'general', 'meeting', 
                   'delivery', 'pickup', 'other']
  title: text (not null)
  description: text
  startDate: timestamp (not null)
  endDate: timestamp
  relatedId: integer
  color: text (default: '#3B82F6')
  status: enum ['pending', 'completed', 'cancelled'] (default: 'pending')
  notificationSent: boolean (default: false)
  createdBy: text (FK to users)
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Indexes**: companyId, startDate, eventType, status

### Audit Logs
Audit trail for all data changes.

```typescript
auditLogs {
  id: integer (PK, auto-increment)
  userId: text
  role: text
  companyId: integer
  entityType: text (not null)
  entityId: integer
  action: enum ['create', 'update', 'delete', 'view', 'export', 'clear']
  beforeState: text (JSON)
  afterState: text (JSON)
  ipAddress: text
  userAgent: text
  createdAt: timestamp
}
```

**Indexes**: userId, companyId, entityType, createdAt

## Reference Tables

### Countries
```typescript
countries {
  id: integer (PK, auto-increment)
  name: text (not null)
  code: text (unique, not null)
  createdAt: timestamp
}
```

### Locations
```typescript
locations {
  id: integer (PK, auto-increment)
  name: text (not null)
  countryId: integer (FK, not null)
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Districts
```typescript
districts {
  id: integer (PK, auto-increment)
  name: text (not null)
  locationId: integer (FK, not null)
  beaches: text (JSON array of beach/location names)
  streets: text (JSON array of main streets/roads)
  deliveryPrice: real (default: 0)
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Phuket Districts (location_id = 1)**: 15 districts with beaches and streets:
- Airport: Mai Khao area, Nai Yang area, Phuket Airport | Thepkrasattri Road, Airport Road
- Bang Tao: Bang Tao Beach, Layan Beach | Laguna Road, Cherngtalay Road
- Chalong: Chalong Bay, Cape Panwa Beach | Chao Fah East/West Road, Patak Road
- Kamala: Kamala Beach | Kamala Beach Road, Rim Had Road
- Karon: Karon Beach, Karon Noi Beach | Karon Road, Patak Road
- Kata: Kata Beach, Kata Noi Beach | Kata Road, Patak Road
- Kathu: Patong Hill | Vichit Songkram Road, Phang Muang Sai Kor Road
- Mai Khao: Mai Khao Beach, Sai Kaew Beach | Mai Khao Beach Road
- Nai Harn: Nai Harn Beach | Nai Harn Beach Road, Viset Road
- Nai Thon: Nai Thon Beach, Banana Beach | Nai Thon Beach Road
- Nai Yang: Nai Yang Beach | Nai Yang Beach Road, Sakhu Road
- Patong: Patong Beach, Kalim Beach, Paradise Beach | Bangla Road, Beach Road, Rat-U-Thit Road
- Phuket Town: Phuket Old Town, Boat Lagoon | Thalang Road, Yaowarat Road, Dibuk Road, Phang Nga Road
- Rawai: Rawai Beach, Friendship Beach, Yanui Beach | Viset Road, Rawai Beach Road
- Surin: Surin Beach, Pansea Beach | Surin Beach Road

**Seeding**: Use `drizzle/0005_phuket_districts.sql` and `drizzle/0008_update_districts_streets.sql` to populate districts data
```

### Car Brands
```typescript
carBrands {
  id: integer (PK, auto-increment)
  name: text (unique, not null)
  logoUrl: text
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Car Models
```typescript
carModels {
  id: integer (PK, auto-increment)
  brandId: integer (FK, not null)
  name: text (not null)
  bodyTypeId: integer (FK to bodyTypes)
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Colors
```typescript
colors {
  id: integer (PK, auto-increment)
  name: text (unique, not null)
  hexCode: text
  createdAt: timestamp
}
```

### Body Types
Reference table for vehicle body types.

```typescript
bodyTypes {
  id: integer (PK, auto-increment)
  name: text (unique, not null)
  createdAt: timestamp
}
```

**Seeded Values**: Sedan, SUV, Hatchback, Coupe, Convertible, Wagon, Van, Pickup, Minivan, Crossover, Scooter

### Fuel Types
Reference table for fuel types.

```typescript
fuelTypes {
  id: integer (PK, auto-increment)
  name: text (unique, not null)
  createdAt: timestamp
}
```

**Seeded Values**: Petrol, Diesel, Electric, Hybrid, Plug-in Hybrid, LPG, CNG

### Car Templates
```typescript
carTemplates {
  id: integer (PK, auto-increment)
  brandId: integer (FK, not null)
  modelId: integer (FK, not null)
  productionYear: integer
  transmission: enum ['automatic', 'manual']
  engineVolume: real
  bodyTypeId: integer (FK to bodyTypes)
  seats: integer
  doors: integer
  fuelTypeId: integer (FK to fuelTypes)
  description: text
  photos: text (JSON array)
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Maintenance History
```typescript
maintenanceHistory {
  id: integer (PK, auto-increment)
  companyCarId: integer (FK, not null)
  maintenanceType: enum ['oil_change', 'tire_change', 'brake_service', 
                         'general_service', 'repair', 'other']
  mileage: integer
  cost: real
  notes: text
  performedAt: timestamp
  performedBy: text (FK to users)
  createdAt: timestamp
}
```

**Indexes**: companyCarId, performedAt

### Rental Durations
Rental duration periods with pricing multipliers for multi-day rentals.

```typescript
rentalDurations {
  id: integer (PK, auto-increment)
  companyId: integer (FK, not null)
  rangeName: text (not null)
  minDays: integer (not null)
  maxDays: integer (null = unlimited)
  priceMultiplier: real (not null, default: 1)
  discountLabel: text
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Indexes**: companyId

**Usage**: Define pricing tiers based on rental duration. Price multiplier applies to base daily rate. Example: 0.95 = 5% discount, 0.8 = 20% discount.

## Query Optimization Rules

### 1. Always Use LIMIT
```typescript
// Test queries
const users = await db.select().from(schema.users).limit(10)

// Existence checks
const exists = await db.select().from(schema.users)
  .where(eq(schema.users.email, email))
  .limit(1)
```

### 2. Select Specific Columns
```typescript
// BAD
const users = await db.select().from(schema.users)

// GOOD
const users = await db.select({
  id: schema.users.id,
  name: schema.users.name,
  email: schema.users.email
}).from(schema.users)
```

### 3. Use Indexes
All frequently queried fields have indexes. Use them in WHERE clauses.

### 4. Avoid N+1 Queries
```typescript
// BAD - N+1 query
const contracts = await db.select().from(schema.contracts)
for (const contract of contracts) {
  const car = await db.select().from(schema.companyCars)
    .where(eq(schema.companyCars.id, contract.companyCarId))
}

// GOOD - JOIN
const contracts = await db.select()
  .from(schema.contracts)
  .leftJoin(schema.companyCars, eq(schema.contracts.companyCarId, schema.companyCars.id))
```

## Multi-Tenancy (CRITICAL)

### Always Filter by company_id
```typescript
// Create
await db.insert(schema.companyCars).values({
  ...carData,
  companyId: currentCompanyId // REQUIRED
})

// Read
const cars = await db.select()
  .from(schema.companyCars)
  .where(eq(schema.companyCars.companyId, currentCompanyId))

// Update
await db.update(schema.companyCars)
  .set(updates)
  .where(and(
    eq(schema.companyCars.id, carId),
    eq(schema.companyCars.companyId, currentCompanyId) // REQUIRED
  ))

// Delete
await db.delete(schema.companyCars)
  .where(and(
    eq(schema.companyCars.id, carId),
    eq(schema.companyCars.companyId, currentCompanyId) // REQUIRED
  ))
```

### Admin Mode Exception
When Admin Mode is active, `company_id` comes from context, not from admin's profile.

## Migrations

### Generate Migration
```bash
npm run db:generate
```

### Apply Migration
```bash
# Local
npm run db:migrate:local

# Production
npm run db:migrate:remote
```

### Manual Migration (if automatic fails)
```bash
# Local
npx wrangler d1 execute phuketride-bd --local --command="ALTER TABLE districts ADD COLUMN beaches text;"

# Production
npx wrangler d1 execute phuketride-bd --remote --command="ALTER TABLE districts ADD COLUMN beaches text;"
```

### Seed Data
```bash
# Districts data (Phuket)
npx wrangler d1 execute phuketride-bd --local --file=./scripts/seed-districts.sql

# Production
npx wrangler d1 execute phuketride-bd --remote --file=./scripts/seed-districts.sql
```

### Migration Files
Located in `migrations/` directory. Never edit manually.

## Drizzle Studio

Open visual database editor:
```bash
npm run db:studio
```

## Common Patterns

### Pagination
```typescript
const page = 1
const pageSize = 20
const offset = (page - 1) * pageSize

const items = await db.select()
  .from(schema.companyCars)
  .limit(pageSize)
  .offset(offset)
```

### Search
```typescript
import { like } from 'drizzle-orm'

const results = await db.select()
  .from(schema.companyCars)
  .where(like(schema.companyCars.licensePlate, `%${query}%`))
  .limit(10)
```

### Date Ranges
```typescript
import { and, gte, lte } from 'drizzle-orm'

const contracts = await db.select()
  .from(schema.contracts)
  .where(and(
    gte(schema.contracts.startDate, startDate),
    lte(schema.contracts.endDate, endDate)
  ))
```

### Transactions
```typescript
await db.transaction(async (tx) => {
  await tx.insert(schema.contracts).values(contractData)
  await tx.insert(schema.payments).values(paymentData)
})
```

## JSON Fields

Several fields store JSON data:
- `users.passportPhotos`: string[]
- `users.driverLicensePhotos`: string[]
- `companies.weeklySchedule`: object (e.g., {monday: {open: true, start: "08:00", end: "20:00"}, ...})
- `companies.holidays`: string[] (e.g., ["2024-01-01", "2024-12-25"])
- `companies.settings`: object
- `companyCars.photos`: string[] (max 12)
- `companyCars.seasonalPrices`: array
- `contracts.photos`: string[]
- `auditLogs.beforeState`: object
- `auditLogs.afterState`: object

Always parse/stringify when reading/writing:
```typescript
const photos = JSON.parse(car.photos || '[]')
const updatedPhotos = JSON.stringify([...photos, newPhoto])
```

## Soft Delete

**NOT USED** in this project. Use `archivedAt` timestamp for cars if needed.
