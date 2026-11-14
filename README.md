# Sales management dashboard

A small dashboard for a distribution team. The company sells products to
distributors (**primary sales**), and distributors sell them on (**secondary
sales**). The difference is the stock each distributor is holding, which is
always calculated from the sales and never stored.

Built with Next.js (App Router), Tailwind and Postgres.

## Roles

| Role      | Can do                                                                                        |
| --------- | --------------------------------------------------------------------------------------------- |
| Developer | Everything, plus the audit log. Manages Admins and Sales Reps. Never listed to anyone else.   |
| Admin     | Products, distributors, primary sales, editing or deleting any sale, and managing Sales Reps. |
| Sales Rep | The dashboard, entering secondary sales, and seeing their own entries.                        |

Roles are checked on the server in every page, server action and the export
route. `proxy.ts` only redirects signed-out visitors to the login page.

## Run locally

1. Copy `.env.example` to `.env.local` and fill it in. `SESSION_SECRET` must be
   at least 32 characters (`openssl rand -hex 32`).
2. Install, create the tables and the Developer account, then start:

```bash
npm install
npm run db:setup
npm run dev
```

`npm run db:setup` is safe to run again; it resets the Developer password to
`DEVELOPER_PASSWORD`.

To try the app with sample data, run `npm run db:demo` on an empty database. It
adds one admin, two sales reps, four products, four distributors and six months
of sales, and prints the demo password. Do not run it on the client's database.

## Deploy (Vercel + Neon)

1. Create a Neon database and copy its pooled connection string.
2. Run `npm run db:setup` once from your machine with `DATABASE_URL`,
   `DEVELOPER_EMAIL` and `DEVELOPER_PASSWORD` set.
3. In Vercel, set `DATABASE_URL`, `SESSION_SECRET` and `CURRENCY`. The developer
   variables are only needed by the setup script, not by the app.

## How it is organised

- `db/schema.sql` – tables
- `lib/queries.ts` – every read, including the stock calculations
- `app/actions.ts` – every write, each with a role check and an audit log entry
- `lib/auth.ts` – signed session cookie; the user is reloaded on each request,
  so disabling an account or changing its password ends its sessions at once
- `components/sales.tsx` – the list, entry and edit screens shared by primary
  and secondary sales
- `app/api/export/route.ts` – Excel downloads

## Not included yet

Retailers, territories, targets, returns, an approval step for sales, and login
rate limiting.
