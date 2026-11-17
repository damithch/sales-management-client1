-- Debtors: credit periods per shop and money collected from shops.
-- Safe to run more than once, and it keeps every existing row.

-- Days a shop has to pay for a credit sale before it is overdue.
alter table shops add column if not exists credit_days integer not null default 14
  check (credit_days between 0 and 365);

-- Money collected from a shop. Collections pay off the shop's oldest unpaid
-- credit sales first; how much of each sale is paid is calculated, not stored.
create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops (id),
  amount numeric(14, 2) not null check (amount > 0),
  collected_on date not null,
  method text not null default 'cash' check (method in ('cash', 'cheque', 'bank')),
  reference text not null default '',
  created_by uuid not null references users (id),
  created_at timestamptz not null default now()
);

create index if not exists collections_shop_date on collections (shop_id, collected_on);
create index if not exists secondary_sales_credit on secondary_sales (shop_id, sale_date)
  where payment_terms = 'credit';
