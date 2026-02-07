# Cloudflare D1 Remote Database - STRICT ENFORCEMENT

## CRITICAL: Remote Database Only Policy

**ABSOLUTE PROHIBITION**: This project uses ONLY Cloudflare D1 remote database. Any attempt to work with local databases is STRICTLY FORBIDDEN.

## What is FORBIDDEN

### 1. Local Database Operations (NEVER DO THIS)
- ❌ Creating local SQLite files (`.sqlite`, `.db` files)
- ❌ Using PostgreSQL locally (`psql`, `pg_*` commands)
- ❌ Using MySQL locally (`mysql` commands)
- ❌ Running local database servers (postgres, mysql, mariadb)
- ❌ Creating database connection strings to localhost
- ❌ Using `better-sqlite3` or any local SQLite drivers
- ❌ File-based database operations
- ❌ Docker containers with databases
- ❌ Local database migrations outside of Cloudflare

### 2. Prohibited Commands
```bash
# NEVER run these:
psql
pg_dump
mysql
sqlite3
docker run postgres
docker run mysql
npm install better-sqlite3
npm install pg
npm install mysql2
```

### 3. Prohibited Code Patterns
```typescript
// ❌ FORBIDDEN - Local database connections
import Database from 'better-sqlite3';
import { Pool } from 'pg';
import mysql from 'mysql2';

// ❌ FORBIDDEN - File-based SQLite
const db = new Database('local.db');

// ❌ FORBIDDEN - Local connection strings
const connectionString = 'postgresql://localhost:5432/mydb';
```

## What is REQUIRED

### 1. Cloudflare D1 Access ONLY
```typescript
// ✅ CORRECT - Access D1 through context
export async function loader({ context }: Route.LoaderArgs) {
  const db = drizzle(context.cloudflare.env.DB);
  // ... queries
}

export async function action({ context }: Route.ActionArgs) {
  const db = drizzle(context.cloudflare.env.DB);
  // ... mutations
}
```

### 2. Development Environment
- Use `wrangler dev` for local development (connects to remote D1 or local D1 preview)
- Use `wrangler d1 execute` for direct database queries
- Use `npm run db:migrate` for migrations (applies to Cloudflare D1)

### 3. Database Commands (Allowed)
```bash
# ✅ CORRECT - Cloudflare D1 commands
wrangler d1 execute DB --remote --command "SELECT * FROM users LIMIT 10"
wrangler d1 execute DB --local --command "SELECT * FROM users LIMIT 10"
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Apply migrations to D1
wrangler dev         # Start dev server with D1 access
```

## Enforcement Rules

### Rule 1: Database Access Check
Before ANY database operation, verify:
1. Are you using `context.cloudflare.env.DB`? ✅
2. Are you trying to create a local connection? ❌ STOP

### Rule 2: Installation Check
Before installing ANY npm package, verify:
1. Is it a local database driver? ❌ REJECT
2. Is it Drizzle ORM or Cloudflare related? ✅ ALLOW

### Rule 3: Command Execution Check
Before running ANY bash command, verify:
1. Does it start local database server? ❌ REJECT
2. Does it use `wrangler` or `npm run`? ✅ ALLOW

## If User Requests Local Database

If user asks to:
- "Create a local database"
- "Use PostgreSQL locally"
- "Set up local SQLite"
- "Connect to localhost database"

**RESPONSE**: 
"This project uses ONLY Cloudflare D1 remote database. Local databases are not supported. All database operations must go through `context.cloudflare.env.DB` in loaders/actions. Use `wrangler dev` for local development with D1 preview."

## Architecture Reminder

```
┌─────────────────────────────────────────┐
│  React Router v7 (Cloudflare Workers)  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Loader/Action Functions        │   │
│  │  context.cloudflare.env.DB ──────────┼──> Cloudflare D1
│  └─────────────────────────────────┘   │     (Remote SQLite)
│                                         │
│  ❌ NO local database connections      │
│  ❌ NO localhost:5432                  │
│  ❌ NO .sqlite files                   │
└─────────────────────────────────────────┘
```

## Summary

- **ONLY** Cloudflare D1 remote database
- **ONLY** `context.cloudflare.env.DB` for access
- **ONLY** `wrangler` commands for database operations
- **NEVER** local database servers, files, or connections
- **NEVER** install local database drivers

This is non-negotiable. The entire architecture depends on Cloudflare Workers + D1.
