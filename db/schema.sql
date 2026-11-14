create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  role text not null check (role in ('Developer', 'Admin', 'Sales Rep')),
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique not null,
  category text not null default '',
  unit text not null default '',
  price numeric(14, 2) not null default 0 check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists distributors (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  city text not null default '',
  contact text not null default '',
  phone text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Company -> distributor
create table if not exists primary_sales (
  id uuid primary key default gen_random_uuid(),
  sale_date date not null,
  distributor_id uuid not null references distributors (id),
  product_id uuid not null references products (id),
  quantity integer not null check (quantity > 0),
  price numeric(14, 2) not null check (price >= 0),
  created_by uuid not null references users (id),
  created_at timestamptz not null default now()
);

-- Distributor -> market
create table if not exists secondary_sales (
  id uuid primary key default gen_random_uuid(),
  sale_date date not null,
  distributor_id uuid not null references distributors (id),
  product_id uuid not null references products (id),
  quantity integer not null check (quantity > 0),
  price numeric(14, 2) not null check (price >= 0),
  created_by uuid not null references users (id),
  created_at timestamptz not null default now()
);

create index if not exists primary_sales_distributor_date on primary_sales (distributor_id, sale_date);
create index if not exists secondary_sales_distributor_date on secondary_sales (distributor_id, sale_date);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
