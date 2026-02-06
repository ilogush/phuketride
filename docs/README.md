# Project Documentation

## Overview

This is a car rental management system built with React Router v7 and Cloudflare Workers. The project uses Drizzle ORM with Cloudflare D1 (SQLite) database.

**Reference Project**: `.exemple/` directory contains a Next.js implementation that serves as a reference for components and logic. When copying components from `.exemple/`, always adapt them for React Router v7.

## Technology Stack

- **Framework**: React Router v7 (file-based routing)
- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **UI**: React 19 + Tailwind CSS 4
- **Icons**: Heroicons (outline only)
- **Validation**: Zod
- **Date handling**: date-fns

## Project Structure

```
/Users/ulethai/Documents/Dev/PR/
├── .exemple/                    # Reference Next.js project (source for components)
├── app/
│   ├── components/              # React components
│   │   ├── ui/                  # UI components (PRIMARY LOCATION - DO NOT CREATE NEW FOLDERS)
│   │   ├── cars/                # Car-specific components
│   │   ├── forms/               # Form components
│   │   ├── layout/              # Layout components
│   │   ├── payments/            # Payment components
│   │   └── profile/             # Profile components
│   ├── db/                      # Database schema and config
│   │   ├── schema.ts            # Drizzle schema definitions
│   │   └── index.ts             # Database connection
│   ├── lib/                     # Utility libraries
│   │   ├── auth.server.ts       # Authentication utilities
│   │   ├── toast.tsx            # Toast notification system
│   │   └── validation.ts        # Validation utilities
│   ├── routes/                  # File-based routing
│   ├── schemas/                 # Zod validation schemas
│   └── types/                   # TypeScript type definitions
├── docs/                        # Documentation (this directory)
└── migrations/                  # Database migrations

```

## Key Documentation Files

- [README.md](./README.md) - This file (project overview)
- [COMPONENTS.md](./COMPONENTS.md) - UI components reference
- [DATABASE.md](./DATABASE.md) - Database schema and queries
- [ROUTING.md](./ROUTING.md) - React Router v7 routing guide
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Auth and RBAC system
- [VALIDATION.md](./VALIDATION.md) - Validation patterns
- [REFERENCE_PROJECT.md](./REFERENCE_PROJECT.md) - Guide for using .exemple/ reference

## Quick Start

### Development
```bash
npm run dev                    # Start dev server
npm run db:studio              # Open Drizzle Studio
```

### Database
```bash
npm run db:generate            # Generate migrations
npm run db:migrate:local       # Apply migrations locally
npm run db:migrate:remote      # Apply migrations to production
```

### Deployment
```bash
npm run deploy                 # Build and deploy to Cloudflare Pages
```

## Core Principles

### 1. File Size Limit
- Maximum 500 lines per file
- Refactor and split when exceeding limit

### 2. Component Location (CRITICAL)
- **All UI components MUST be in `/Users/ulethai/Documents/Dev/PR/app/components/ui/`**
- **DO NOT create new component folders**
- **Work with existing components** - edit, modify, extend them
- Existing UI components: Button, Card, Modal, Table, Form components, etc.

### 3. Reference Project Usage
- Source: `.exemple/` directory (Next.js project)
- Always adapt Next.js code to React Router v7:
  - `next/link` → `react-router` (Link)
  - `next/navigation` → `react-router` (useNavigate, useLocation)
  - Remove `'use client'` directives
  - `href` → `to` in Link components
  - Remove `prefetch={false}`
- Preserve logic, styles, and component structure

### 4. Code Language
- All code, comments, schemas, and documentation: **English only**
- Communication with AI: Russian
- No markdown files without explicit permission

### 5. Security (CRITICAL)
- Multi-tenancy: Always check `company_id` for data isolation
- Zod validation on client AND server
- RBAC for authorization (see AUTHENTICATION.md)
- Audit logging for all data changes

### 6. UI Standards (MANDATORY)
- Toast notifications for all feedback (NO alert/confirm)
- Heroicons outline only
- Input fields: `rounded-xl`
- Button component from `@/components/ui/Button`
- Consistent dashboard layout across all roles

## Documentation Rules

1. **Single Source of Truth**: All documentation in `docs/` directory
2. **Update Immediately**: Documentation MUST be updated when code changes
3. **No Duplication**: Avoid repeating information across docs
4. **English Only**: All documentation in English
5. **No Markdown Reports**: Output summaries in chat, not files

## Next Steps

- Read [COMPONENTS.md](./COMPONENTS.md) for UI component usage
- Read [ROUTING.md](./ROUTING.md) for routing patterns
- Read [DATABASE.md](./DATABASE.md) for database operations
- Read [REFERENCE_PROJECT.md](./REFERENCE_PROJECT.md) for adapting .exemple/ code
