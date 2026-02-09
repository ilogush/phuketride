# PhuketRide - Car Rental Management System

Multi-tenant car rental management platform built with React Router v7 and Cloudflare D1.

## Features

- 🏢 **Multi-Company Support** - Manage multiple rental companies in one platform
- 👥 **Role-Based Access Control** - Admin, Partner, Manager, and User roles
- 🚗 **Fleet Management** - Track cars, maintenance, and availability
- 📝 **Contract Management** - Create and manage rental contracts
- 💰 **Payment Tracking** - Record and track all payments
- 📊 **Dashboard & Analytics** - Real-time stats and insights
- 🔒 **Secure Authentication** - Session-based auth with role permissions

## Tech Stack

- **Frontend**: React 19, React Router v7, TailwindCSS 4
- **Backend**: Cloudflare Workers (Edge Runtime)
- **Database**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **Icons**: Heroicons

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Cloudflare account (for deployment)

### Installation

```bash
# Install dependencies
npm install

# Generate database types
npm run db:generate

# Apply migrations to remote database
npm run db:migrate:remote
```

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:5173
```

### Test Accounts

All test accounts use password: `password123`

- **Admin**: admin@phuketride.com
- **Partner**: partner@phuketride.com
- **Manager**: manager@phuketride.com ⭐ NEW
- **User**: user@phuketride.com ⭐ NEW

### Create Test Users

Run the script to create Manager and User test accounts:

```bash
./scripts/create-test-users.sh
```

Or manually:

```bash
wrangler d1 execute phuketride-bd --local --file=./drizzle/0015_create_test_users.sql
```

See [TEST_ACCOUNTS.md](./TEST_ACCOUNTS.md) for full details.

## Database

### Current Database
- **Name**: phuketride-bd
- **ID**: a6ed0bbe-76ff-40f8-b23b-b9779af5d02d
- **Region**: APAC
- **Tables**: 18 tables with test data

### Database Commands

```bash
# Generate new migration
npm run db:generate

# Apply migrations locally
npm run db:migrate:local

# Apply migrations to remote
npm run db:migrate:remote

# Open Drizzle Studio
npm run db:studio
```

## Project Structure

```
app/
├── components/        # React components
│   ├── ui/           # Reusable UI components
│   ├── cars/         # Car-related components
│   ├── dashboard/    # Dashboard widgets
│   └── ...
├── db/               # Database schema and config
│   ├── schema.ts     # Drizzle schema definitions
│   └── index.ts      # Database client
├── lib/              # Utilities and helpers
│   ├── auth.server.ts    # Authentication logic
│   ├── validation.ts     # Validation helpers
│   └── toast.tsx         # Toast notifications
├── routes/           # React Router routes
│   ├── home.tsx          # Landing page
│   ├── auth.login.tsx    # Login page
│   ├── dashboard.tsx     # Dashboard layout
│   └── ...
└── types/            # TypeScript types

docs/                 # Documentation
drizzle/             # Database migrations
workers/             # Cloudflare Workers entry
```

## Deployment

```bash
# Build and deploy to Cloudflare Pages
npm run deploy
```

## Environment Variables

Create a `.env` file:

```env
CLOUDFLARE_ACCOUNT_ID=66a42c952b0b0756680914b27ff712e5
CLOUDFLARE_D1_DATABASE_ID=a6ed0bbe-76ff-40f8-b23b-b9779af5d02d
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_R2_BUCKET_URL=https://66a42c952b0b0756680914b27ff712e5.r2.cloudflarestorage.com
```

## Reference Project

This project is a port of a Next.js application to React Router v7. The original project is located at `/Users/ulethai/Documents/Dev/PR/.exemple` and is used as a reference for components, logic, and structure. All components are adapted for React Router v7 while preserving the original functionality.

## Documentation

- [React Router v7](https://reactrouter.com)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Drizzle ORM](https://orm.drizzle.team)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Zod](https://zod.dev)

## License

MIT
