# Database Migrations

## Remove City and Gender Fields Migration

This migration removes the `city` and `gender` fields from the `users` table.

### How to Apply

For Cloudflare D1 database, use the following command:

```bash
# For local development database
npx wrangler d1 execute phuketride-bd --local --file=./migrations/remove_city_gender_fields.sql

# For production database
npx wrangler d1 execute phuketride-bd --remote --file=./migrations/remove_city_gender_fields.sql
```

### What This Migration Does

1. Creates a new `users` table without `city` and `gender` columns
2. Copies all data from the old table (excluding the removed fields)
3. Drops the old table
4. Renames the new table to `users`
5. Recreates necessary indexes

### Rollback

If you need to rollback, you would need to:
1. Add the columns back to the table
2. Restore data from a backup if needed

Note: Always backup your database before running migrations in production!
