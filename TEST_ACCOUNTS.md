# Test Accounts for Phuket Ride

## How to Create Test Users

Run the migration to create test users:

```bash
# Local development
wrangler d1 execute phuketride-bd --local --file=./drizzle/0015_create_test_users.sql

# Production (if needed)
wrangler d1 execute phuketride-bd --remote --file=./drizzle/0015_create_test_users.sql
```

## Test Accounts

All test accounts use the same password: **password123**

### 1. Admin Account
- **Email**: `ilogush@icloud.com`
- **Password**: `220232`
- **Role**: Admin
- **Access**: Full system access, all companies

### 2. Partner Account
- **Email**: `partner@phuketride.com`
- **Password**: `password123`
- **Role**: Partner
- **Company**: Phuket Ride Co. (ID: 1)
- **Access**: Company management, cars, contracts, payments

### 3. Manager Account ⭐ NEW
- **Email**: `manager@phuketride.com`
- **Password**: `password123`
- **Role**: Manager
- **Company**: Phuket Ride Co. (ID: 1)
- **Access**: 
  - View and manage bookings
  - View and manage contracts
  - View cars
  - View payments
  - Calendar
  - Chat with clients
  - Profile management

### 4. User Account (Client) ⭐ NEW
- **Email**: `user@phuketride.com`
- **Password**: `password123`
- **Role**: User (Client)
- **Access**:
  - Search available cars
  - Create bookings
  - View my bookings
  - View my contracts
  - View payment history
  - Notifications
  - Chat with company
  - Profile management

## Manager Features

The manager account has access to:

1. **Dashboard** (`/dashboard`)
   - Statistics: bookings, active contracts, revenue
   - Quick actions
   - Upcoming tasks

2. **Bookings** (`/dashboard/bookings`)
   - View all company bookings
   - Filter by status (draft, active, completed, cancelled)
   - Create new bookings
   - View booking details

3. **Contracts** (`/dashboard/contracts`)
   - View all rental contracts
   - Filter by status
   - Create new contracts
   - Edit existing contracts

4. **Cars** (`/dashboard/cars`)
   - View company fleet
   - Check car availability
   - View car details

5. **Payments** (`/dashboard/payments`)
   - View all payments
   - Track payment status
   - Payment history

6. **Calendar** (`/dashboard/calendar`)
   - View rental schedule
   - Upcoming pickups/returns
   - Events management

7. **Chat** (`/dashboard/chat`)
   - Communicate with clients
   - Support requests

8. **Profile** (`/dashboard/profile`)
   - Personal information
   - Contact details

## User (Client) Features

The user account has access to:

1. **Dashboard** (`/dashboard`)
   - Personal statistics
   - Active rentals
   - Upcoming bookings

2. **Search Cars** (`/dashboard/search-cars`)
   - Browse available vehicles
   - Filter by dates, type, price
   - View car details

3. **My Bookings** (`/dashboard/my-bookings`)
   - All rental bookings
   - Filter by status
   - Create new booking
   - View booking details

4. **My Contracts** (`/dashboard/my-contracts`)
   - Rental agreements
   - Contract details
   - Download documents

5. **Payments** (`/dashboard/my-payments`)
   - Payment history
   - Transaction details
   - Filter by status

6. **Notifications** (`/dashboard/notifications`)
   - Rental reminders
   - Return date alerts
   - System messages

7. **Chat** (`/dashboard/chat`)
   - Contact rental company
   - Support chat

8. **Profile** (`/dashboard/profile`)
   - Personal information
   - Passport details
   - Driver's license
   - Contact information

## Test Data

The migration creates:
- 1 Manager user assigned to Phuket Ride Co.
- 1 Client user
- 1 Test contract (active) for the client user

## Verification

After running the migration, verify the users were created:

```bash
# Check users
wrangler d1 execute phuketride-bd --local --command "SELECT id, email, role, name, surname FROM users WHERE email IN ('manager@phuketride.com', 'user@phuketride.com')"

# Check manager assignment
wrangler d1 execute phuketride-bd --local --command "SELECT * FROM managers WHERE user_id = 'manager-test-001'"

# Check test contract
wrangler d1 execute phuketride-bd --local --command "SELECT id, client_id, status, total_amount FROM contracts WHERE id = 9999"
```

## Notes

- All passwords are stored in plain text for demo purposes
- In production, use proper password hashing (bcrypt, argon2)
- The test contract (ID: 9999) is created for demonstration
- Manager can see all bookings/contracts for their company
- User can only see their own bookings/contracts
