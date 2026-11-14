# Distribu sales management dashboard

A Next.js App Router + Tailwind sales dashboard for a small distribution team. Primary sales are company-to-distributor, secondary sales are distributor-to-market, and stock is always calculated as primary units minus secondary units.

## Run locally

```bash
npm install
npm run dev
```

Set `DATABASE_URL` to a Neon connection string and `DEVELOPER_EMAIL` before running `npm run db:seed`. The seed creates users, products, distributors, sales tables, audit logs, and demo catalogue rows. The Developer account is created from `DEVELOPER_EMAIL` and is excluded from user lists.

## Security model

The login server action creates an HTTP-only session cookie, middleware protects application routes, and server actions enforce the role hierarchy Developer > Admin > Sales Rep. Admins manage products and primary sales; sales reps can enter secondary sales; audit rows are written on mutations. Stock is derived at read time and is never stored.

Excel exports are available from the list screens through `/api/export?kind=products|distributors|primary|secondary|users`. The code is organized around separate data, auth, mutation, and presentation modules so future targets, territories, retailers, or returns can be added without changing stock semantics.