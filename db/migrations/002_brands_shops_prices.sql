-- Brands, shops, price tiers, payment terms and opening stock.
-- Safe to run more than once, and it keeps every existing row.

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Retail shops that buy from the distributor (secondary sales).
create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  city text not null default '',
  contact text not null default '',
  phone text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table products add column if not exists brand_id uuid references brands (id);
alter table products add column if not exists model text not null default '';
alter table products add column if not exists capacity text not null default '';
-- RD price: what the distributor pays (primary sales, cost for profit).
alter table products add column if not exists rd_cash numeric(14, 2) check (rd_cash >= 0);
alter table products add column if not exists rd_credit numeric(14, 2) check (rd_credit >= 0);
-- Dealer price: what shops pay (secondary sales).
alter table products add column if not exists dealer_cash numeric(14, 2) check (dealer_cash >= 0);
alter table products add column if not exists dealer_credit numeric(14, 2) check (dealer_credit >= 0);
alter table products add column if not exists mrp numeric(14, 2) check (mrp >= 0);
-- Stock already held when the system started being used.
alter table products add column if not exists opening_qty integer not null default 0 check (opening_qty >= 0);
alter table products add column if not exists opening_date date;
create index if not exists products_brand on products (brand_id);

-- Products created before this migration: keep their name as the model and
-- their single list price as the dealer cash price.
update products set model = name where model = '';
update products set dealer_cash = price where dealer_cash is null and price > 0;

-- Sales now record cash or credit. Primary sales no longer need a
-- distributor; secondary sales are made to a shop.
alter table primary_sales alter column distributor_id drop not null;
alter table primary_sales add column if not exists payment_terms text not null default 'cash'
  check (payment_terms in ('cash', 'credit'));

alter table secondary_sales alter column distributor_id drop not null;
alter table secondary_sales add column if not exists shop_id uuid references shops (id);
alter table secondary_sales add column if not exists payment_terms text not null default 'cash'
  check (payment_terms in ('cash', 'credit'));

create index if not exists primary_sales_product_date on primary_sales (product_id, sale_date);
create index if not exists secondary_sales_product_date on secondary_sales (product_id, sale_date);
create index if not exists secondary_sales_shop_date on secondary_sales (shop_id, sale_date);
