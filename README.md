# Trace

Operations-only tracking for inpatient rapid response teams. Trace tracks pages, time on calls, call types, units, and outcomes — **without collecting patient identifiers or PHI**.

## Features

- **Authentication** with Admin, Manager, and Team Member roles
- **Dashboard** with daily KPIs (calls, active calls, duration, busiest unit, etc.)
- **Start Call** flow with automatic timer
- **Active Call** screen with milestone buttons (Arrived, Stabilized, ICU transfer, Cancelled, End call)
- **End Call** form with required outcome and optional operational notes
- **Call Log** with search and filters (date, unit, type, outcome, team member)
- **Analytics** charts (by type, unit, hour, duration, outcomes, team time)
- **CSV export** of filtered call log

## Tech stack

- Next.js 15 (App Router)
- SQLite + Prisma
- JWT session cookies
- Tailwind CSS
- Recharts

## Getting started

```bash
npm install
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo accounts

Password for all demo accounts: `password123`

| Email | Role |
|-------|------|
| admin@trace.local | Admin |
| manager@trace.local | Manager |
| member@trace.local | Team Member |

## Data model

| Table | Purpose |
|-------|---------|
| `users` | Team members with roles |
| `calls` | Call records (times, unit, type, outcome) |
| `units` | Hospital units/locations |
| `call_types` | Rapid Response, Code Blue, etc. |
| `outcomes` | Stabilized on unit, Transferred to ICU, etc. |

## PHI policy

Trace intentionally excludes:

- Patient names, MRNs, dates of birth
- Diagnoses and clinical details tied to individuals
- EMR or paging system integration

Notes fields are for operational context only (e.g. "delayed due to elevator").

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:setup` | Create database and seed data |
| `npm run db:seed` | Re-run seed script |

## Production notes

Before deploying:

1. Set a strong `JWT_SECRET` in environment variables
2. Consider PostgreSQL instead of SQLite for multi-user production
3. Change default demo passwords or remove seed accounts
