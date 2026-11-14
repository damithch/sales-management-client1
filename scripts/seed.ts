import { neon } from "@neondatabase/serverless";
const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
if (!sql) { console.log("DATABASE_URL is not set; skipping database seed."); process.exit(0); }
await sql`create extension if not exists pgcrypto`;
await sql`create table if not exists users (id uuid primary key default gen_random_uuid(), name text not null, email text unique not null, role text not null check (role in ('Developer','Admin','Sales Rep')), password_hash text, created_at timestamptz default now())`;
await sql`create table if not exists products (id uuid primary key default gen_random_uuid(), name text not null, sku text unique not null, category text, unit text, price numeric not null default 0)`;
await sql`create table if not exists distributors (id uuid primary key default gen_random_uuid(), name text not null, city text, contact text, phone text)`;
await sql`create table if not exists primary_sales (id uuid primary key default gen_random_uuid(), sale_date date not null, distributor_id uuid references distributors(id), product_id uuid references products(id), quantity integer not null, price numeric not null, created_by uuid references users(id))`;
await sql`create table if not exists secondary_sales (id uuid primary key default gen_random_uuid(), sale_date date not null, distributor_id uuid references distributors(id), product_id uuid references products(id), quantity integer not null, price numeric not null, created_by uuid references users(id))`;
await sql`create table if not exists audit_log (id uuid primary key default gen_random_uuid(), actor_id uuid references users(id), action text not null, entity_type text not null, entity_id uuid, before_data jsonb, after_data jsonb, created_at timestamptz default now())`;
const developer = (process.env.DEVELOPER_EMAIL ?? "developer@company.com").toLowerCase();
await sql`insert into users (name, email, role) values ('Developer', ${developer}, 'Developer') on conflict (email) do nothing`;
await sql`insert into users (name, email, role) values ('Nadeesha Admin','nadeesha@company.com','Admin'),('Maya Fernando','maya@company.com','Sales Rep'),('Kasun Jayasinghe','kasun@company.com','Sales Rep') on conflict (email) do nothing`;
await sql`insert into products (name, sku, category, unit, price) values ('Classic Cola 330ml','CC-330','Beverages','Case',18),('Orange Burst 500ml','OB-500','Beverages','Case',22),('Crispy Chips Original','CH-001','Snacks','Box',14),('Sparkling Water 1L','SW-100','Beverages','Case',12) on conflict (sku) do nothing`;
await sql`insert into distributors (name, city, contact, phone) values ('Metro Wholesale','Colombo','Nimal Perera','+94 77 123 4567'),('Lanka Trade Centre','Kandy','Saman Silva','+94 71 987 6543'),('Southern Distributors','Galle','Amal Fernando','+94 76 555 8832'),('North Star Trading','Jaffna','Ravi Kumar','+94 75 440 2190') on conflict do nothing`;
console.log('Schema and seed data ready.');