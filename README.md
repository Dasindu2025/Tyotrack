# Tyotrack - Work Time & Project Tracking

A complete, production-ready multi-tenant work time tracking web application built with Next.js 14, Prisma, PostgreSQL, and Docker.

![Dark Theme](https://img.shields.io/badge/theme-dark_only-1a1f2e)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)

## Features

- 🏢 **Multi-tenant Architecture** - Complete data isolation per company
- ⏰ **Time Tracking** - With overlap prevention and cross-midnight splitting
- 📊 **Day/Evening/Night Hours** - Automatic hour type calculation
- 📅 **Calendar View** - Monthly calendar with daily hour summaries
- ✅ **Approval Workflow** - Configurable approval rules per company
- 🔒 **Entry Locking** - Lock approved entries from employee edits
- 📈 **Reports & Export** - Generate reports and export to CSV
- 📝 **Audit Logs** - Complete audit trail of all changes
- 🎨 **Dark Theme** - Premium dark UI with neon accents

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL 16 with Prisma ORM
- **Auth**: JWT (access + refresh tokens) in httpOnly cookies
- **Validation**: Zod
- **Data Fetching**: TanStack Query

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)

### Using Docker (Recommended)

```bash
# Clone the repository
git clone <your-repo-url>
cd tyotrack

# Start the stack
docker compose -f docker-compose.dev.yml up --build

# In another terminal, run migrations
docker compose -f docker-compose.dev.yml exec app npx prisma migrate deploy

# Seed the database
docker compose -f docker-compose.dev.yml exec app npx prisma db seed

# Open http://localhost:3000
```

### Local Development

```bash
# Install dependencies
npm install

# Start PostgreSQL (or use docker-compose for just the database)
docker compose -f docker-compose.dev.yml up postgres

# Copy environment file
cp .env.example .env

# Update DATABASE_URL in .env to use localhost instead of postgres
# DATABASE_URL="postgresql://tyotrack_user:Tyotrack@13!#@localhost:5432/tyotrack?schema=public"

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed the database
npx prisma db seed

# Start development server
npm run dev
```

## Default Login Credentials

| Role          | Email                     | Password       |
| ------------- | ------------------------- | -------------- |
| Super Admin   | `superadmin@tyotrack.com` | `Super123!`    |
| Company Admin | `admin@demo.com`          | `Admin123!`    |
| Employee      | `employee@demo.com`       | `Employee123!` |
| Employee 2    | `jane@demo.com`           | `Employee123!` |

## Project Structure

```
tyotrack/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/       # Protected dashboard pages
│   │   ├── api/               # API route handlers
│   │   └── login/             # Auth pages
│   ├── components/            # React components
│   │   ├── ui/               # Base UI components
│   │   ├── layout/           # Layout components
│   │   └── features/         # Feature components
│   ├── lib/                  # Utilities and services
│   │   ├── auth/            # Authentication logic
│   │   ├── db/              # Prisma client
│   │   ├── services/        # Business services
│   │   ├── time-engine/     # Time calculation engine
│   │   └── validations/     # Zod schemas
│   └── hooks/               # React hooks
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed script
├── __tests__/               # Test files
└── docker-compose.*.yml     # Docker configurations
```

## Running Tests

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- __tests__/time-engine/overlap.test.ts
npm run test -- __tests__/time-engine/split.test.ts
npm run test -- __tests__/time-engine/hour-types.test.ts
```

## API Endpoints

| Route                             | Method             | Description               |
| --------------------------------- | ------------------ | ------------------------- |
| `/api/auth/login`                 | POST               | Login with email/password |
| `/api/auth/logout`                | POST               | Logout and clear tokens   |
| `/api/auth/refresh`               | POST               | Refresh access token      |
| `/api/auth/me`                    | GET                | Get current user          |
| `/api/projects`                   | GET, POST          | List/create projects      |
| `/api/projects/:id`               | GET, PATCH, DELETE | Project CRUD              |
| `/api/time-entries`               | GET, POST          | List/create time entries  |
| `/api/time-entries/:id`           | GET, PATCH, DELETE | Entry CRUD                |
| `/api/users`                      | GET, POST          | List/create users         |
| `/api/users/:id`                  | GET, PATCH         | User CRUD                 |
| `/api/approvals`                  | GET                | List pending approvals    |
| `/api/approvals/:id`              | PATCH              | Approve/reject entry      |
| `/api/reports`                    | GET                | Get report data           |
| `/api/reports/export`             | POST               | Export CSV                |
| `/api/settings`                   | GET, PATCH         | Company settings          |
| `/api/settings/working-hours`     | POST               | Create working hour rule  |
| `/api/settings/working-hours/:id` | PATCH, DELETE      | Update/delete rule        |
| `/api/audit-logs`                 | GET                | View audit logs           |

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://tyotrack_user:Tyotrack@13!#@postgres:5432/tyotrack?schema=public"

# JWT Secrets (use secure random strings in production)
JWT_ACCESS_SECRET="your-access-secret-min-32-characters"
JWT_REFRESH_SECRET="your-refresh-secret-min-32-characters"

# JWT Expiry
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

## Production Deployment

1. Create a `.env.production` file with secure secrets
2. Update JWT secrets with cryptographically secure values
3. Run production compose:

```bash
docker compose -f docker-compose.prod.yml up -d
```

The production compose does NOT expose the PostgreSQL port externally.

## Time Tracking Rules

1. **No Future Entries** - Cannot create entries for future dates
2. **Overlap Prevention** - System blocks overlapping time ranges for the same employee
3. **Cross-Midnight Split** - Entries spanning midnight are automatically split into daily segments
4. **Backdate Limits** - Each employee has a configurable backdate limit (admin can override)
5. **Hour Types** - Day, evening, and night hours are calculated automatically based on company rules

## License

MIT
