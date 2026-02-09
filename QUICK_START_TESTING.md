# Quick Start - Testing Manager & User Accounts

## 🚀 Setup (One-time)

1. **Create test users:**
   ```bash
   ./scripts/create-test-users.sh
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open browser:**
   ```
   http://localhost:5173/login
   ```

## 👤 Test Accounts

### Manager Account
```
Email: manager@phuketride.com
Password: password123
```

**What to test:**
- ✅ Dashboard with company statistics
- ✅ Bookings page (view all company bookings)
- ✅ Contracts page (view/edit contracts)
- ✅ Cars page (view company fleet)
- ✅ Payments page
- ✅ Calendar
- ✅ Profile

**Manager can:**
- View all bookings for their company (Phuket Ride Co.)
- Create new bookings for clients
- Manage contracts
- View payment history
- Access calendar for scheduling

### User Account (Client)
```
Email: user@phuketride.com
Password: password123
```

**What to test:**
- ✅ Dashboard with personal statistics
- ✅ My Bookings (view personal bookings)
- ✅ My Contracts (view rental agreements)
- ✅ My Payments (payment history)
- ✅ Notifications (rental reminders)
- ✅ Create Booking (book a new car)
- ✅ Profile

**User can:**
- View only their own bookings/contracts
- Create new bookings
- View payment history
- Get notifications about upcoming returns
- Manage profile

## 📋 Test Scenarios

### For Manager:

1. **Login as Manager**
   - Go to `/login`
   - Enter: `manager@phuketride.com` / `password123`
   - Should redirect to `/dashboard`

2. **View Dashboard**
   - Should see company statistics
   - Bookings count, active contracts, revenue

3. **View Bookings**
   - Go to `/dashboard/bookings`
   - Should see all company bookings
   - Filter by status (all, draft, active, completed)
   - Click on a booking to view details

4. **View Contracts**
   - Go to `/dashboard/contracts`
   - Should see all rental contracts
   - Filter by status

### For User:

1. **Login as User**
   - Go to `/login`
   - Enter: `user@phuketride.com` / `password123`
   - Should redirect to `/dashboard`

2. **View Dashboard**
   - Should see personal statistics
   - My bookings count, active rentals

3. **View My Bookings**
   - Go to `/dashboard/my-bookings`
   - Should see only user's bookings
   - Should see 1 test booking (ID: 9999)

4. **View Booking Details**
   - Click on the test booking
   - Should see full contract details
   - Car information, dates, pricing, payments

5. **View My Contracts**
   - Go to `/dashboard/my-contracts`
   - Should see rental agreements
   - Click to view contract details

6. **View Payments**
   - Go to `/dashboard/my-payments`
   - Should see payment history
   - Filter by status

7. **View Notifications**
   - Go to `/dashboard/notifications`
   - Should see rental reminders
   - Upcoming return dates

8. **Create New Booking**
   - Go to `/dashboard/my-bookings`
   - Click "New Booking"
   - Fill form:
     - Select car
     - Choose dates
     - Select pickup/return location
     - Add optional services (insurance, baby seat)
   - Submit to create booking

## 🔍 Verification

After creating test users, verify in database:

```bash
# Check users exist
wrangler d1 execute phuketride-bd --local --command "SELECT id, email, role, name FROM users WHERE email IN ('manager@phuketride.com', 'user@phuketride.com')"

# Check manager assignment
wrangler d1 execute phuketride-bd --local --command "SELECT * FROM managers WHERE user_id = 'manager-test-001'"

# Check test contract
wrangler d1 execute phuketride-bd --local --command "SELECT id, client_id, status FROM contracts WHERE id = 9999"
```

## 🐛 Troubleshooting

### Users not found
```bash
# Re-run migration
wrangler d1 execute phuketride-bd --local --file=./drizzle/0015_create_test_users.sql
```

### Login fails
- Check password is exactly: `password123`
- Check email is correct (no typos)
- Check database has users

### No bookings showing
- Make sure test contract was created (ID: 9999)
- Check user is logged in correctly
- Check company_id is set for manager

## 📝 Notes

- Manager sees ALL company bookings/contracts
- User sees ONLY their own bookings/contracts
- Test contract (ID: 9999) is active and assigned to user@phuketride.com
- All pages use real data from Cloudflare D1 database
- Pagination works for lists with >20 items
- Filters work for status (draft, active, completed, cancelled)
