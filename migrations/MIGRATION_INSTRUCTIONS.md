# Database Migration Instructions

## Remove Citizenship Field Migration

**File:** `remove_citizenship_field.sql`  
**Date:** 2026-03-04

### What This Migration Does

This migration removes the `citizenship` field from the `users` table across the entire application.

### Changes Made

1. **Database Schema:**
   - Removed `citizenship` column from `users` table
   - Data is preserved for all other fields

2. **Code Changes:**
   - Removed citizenship from all TypeScript interfaces and types
   - Updated all SQL queries to exclude citizenship field
   - Removed citizenship input fields from all forms
   - Updated validation schemas (user.ts, contract.ts)

3. **Affected Files:**
   - `app/lib/auth.server.ts`
   - `app/components/dashboard/ProfileForm.tsx`
   - `app/routes/profile.tsx`
   - `app/routes/profile.edit.tsx`
   - `app/routes/users.$userId.edit.tsx`
   - `app/routes/users.create.tsx`
   - `app/routes/contracts.$id.edit.tsx`
   - `app/routes/contracts.new.tsx`
   - `app/schemas/user.ts`
   - `app/schemas/contract.ts`

### How to Apply This Migration

#### For Local Development (Wrangler):

```bash
# Apply migration to local D1 database
wrangler d1 execute DB --local --file=migrations/remove_citizenship_field.sql
```

#### For Production:

```bash
# Apply migration to production D1 database
wrangler d1 execute DB --remote --file=migrations/remove_citizenship_field.sql
```

### Rollback

If you need to rollback this migration, you would need to:

1. Add the `citizenship` column back to the users table
2. Revert all code changes
3. Note: Data will be lost as it's not backed up in this migration

### Testing

After applying the migration:

1. Test user profile viewing and editing
2. Test user creation
3. Test contract creation and editing
4. Verify no errors in browser console
5. Check that forms display correctly without citizenship field

### Notes

- This is a destructive migration - citizenship data will be permanently removed
- Make sure to backup your database before running in production
- All existing citizenship data will be lost after migration
