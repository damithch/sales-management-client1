# Sales management dashboard

A small dashboard for a phone and accessories distributor.

- **Primary sales** are stock bought from the principal, at the RD price.
- **Secondary sales** are stock sold to retail shops, at the Dealer price.
- **Stock in hand** per model is opening stock + primary − secondary. It is
  always calculated from the sales and never stored.

Products are organised as brand → model → capacity. Each product has an RD
price and a Dealer price, each for cash and 14-day credit (a blank credit
price falls back to cash), plus the MRP. Every sale records cash or credit
and keeps the price it was entered at, so later price changes never alter
past sales.

**Debtors:** every credit sale to a shop is a debt, due after the shop's
credit period (14 days unless changed on the shop). Collections are recorded
per shop and pay off its oldest unpaid credit sales first, so how much of each
sale is still owed, and how overdue it is, is calculated rather than stored.
The Debtors page splits each shop's balance by age, and debts stay attributed
to the rep who made the sale.

Built with Next.js (App Router), Tailwind and Postgres.

## Roles

| Role      | Can do                                                                                                                                                      |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Developer | Everything, plus the audit log. Manages Admins and Sales Reps. Never listed to anyone else.                                                                 |
| Admin     | Brands, products, shops, primary sales, editing or deleting any sale, and managing Sales Reps.                                                              |
| Sales Rep | The dashboard, entering secondary sales at the Dealer price, and recording collections. Sees only their own sales and cannot edit, delete or change prices. |

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

`npm run db:setup` is safe to run again: it applies any new files in
`db/migrations/` and resets the Developer password to `DEVELOPER_PASSWORD`.

To try the app with sample data, run `npm run db:demo` on an empty database. It
adds one admin, two sales reps, the products from the Alcatel, KXD and
Kieslect price lists (`scripts/price-lists.ts`), five shops and six months of
sales, and prints the demo password. Do not run it on the client's database.

## Deploy (Vercel + Neon)

1. Create a Neon database and copy its pooled connection string.
2. Run `npm run db:setup` once from your machine with `DATABASE_URL`,
   `DEVELOPER_EMAIL` and `DEVELOPER_PASSWORD` set.
3. In Vercel, set `DATABASE_URL`, `SESSION_SECRET` and `CURRENCY`. The developer
   variables are only needed by the setup script, not by the app.

## How it is organised

- `db/schema.sql` and `db/migrations/` – tables
- `lib/pricing.ts` – which price a sale defaults to
- `lib/queries.ts` – every read, including the stock calculations
- `lib/debtors.ts` – what each shop owes, its age and collections
- `app/actions.ts` – every write, each with a role check and an audit log entry
- `lib/auth.ts` – signed session cookie; the user is reloaded on each request,
  so disabling an account or changing its password ends its sessions at once
- `components/sales.tsx` – the list, entry and edit screens shared by primary
  and secondary sales
- `app/api/export/route.ts` – Excel downloads

## Not included yet

Invoices with several products, IMEI tracking, a distributor login, targets,
returns and login rate limiting.
