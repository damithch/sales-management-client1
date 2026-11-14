# Distribu sales management dashboard

Next.js App Router dashboard for primary and secondary distribution sales. Stock is calculated as primary units minus secondary units and is never stored.

## Run locally

```bash
npm install
npm run dev
```

Set `DATABASE_URL` to a Neon connection string and `DEVELOPER_EMAIL` before `npm run db:seed`. The seed creates the core Neon tables and the hidden Developer account. The demo UI uses representative data from `lib/data.ts` while the database-backed forms are wired in.

Roles are Developer > Admin > Sales Rep. The Users screen excludes the Developer account by design.