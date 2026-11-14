import { query, type Db } from "./db";
import type { Role } from "./roles";

export type SaleKind = "primary" | "secondary";

// Table names are never taken from user input; they come from this map.
export const SALE_TABLE: Record<SaleKind, string> = {
  primary: "primary_sales",
  secondary: "secondary_sales",
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  price: number;
  active: boolean;
};

export type Distributor = {
  id: string;
  name: string;
  city: string;
  contact: string;
  phone: string;
  active: boolean;
};

export type Sale = {
  id: string;
  sale_date: string;
  distributor_id: string;
  distributor: string;
  product_id: string;
  product: string;
  quantity: number;
  price: number;
  created_by: string;
  entered_by: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
};

export type SaleFilters = {
  from?: string | null;
  to?: string | null;
  distributorId?: string | null;
  createdBy?: string | null;
};

export function listProducts(activeOnly = false) {
  return query<Product>(
    `select id, name, sku, category, unit, price, active from products
     where active or not $1 order by name`,
    [activeOnly],
  );
}

export async function getProduct(id: string, db?: Db) {
  const [row] = await query<Product>(
    "select id, name, sku, category, unit, price, active from products where id = $1",
    [id],
    db,
  );
  return row ?? null;
}

export function listDistributors(activeOnly = false) {
  return query<Distributor>(
    `select id, name, city, contact, phone, active from distributors
     where active or not $1 order by name`,
    [activeOnly],
  );
}

export async function getDistributor(id: string, db?: Db) {
  const [row] = await query<Distributor>(
    "select id, name, city, contact, phone, active from distributors where id = $1",
    [id],
    db,
  );
  return row ?? null;
}

const SALE_SELECT = (kind: SaleKind) => `
  select s.id, s.sale_date, s.distributor_id, d.name as distributor,
         s.product_id, p.name as product, s.quantity, s.price,
         s.created_by, u.name as entered_by
  from ${SALE_TABLE[kind]} s
  join distributors d on d.id = s.distributor_id
  join products p on p.id = s.product_id
  join users u on u.id = s.created_by`;

export function listSales(kind: SaleKind, filters: SaleFilters, limit = 500) {
  return query<Sale>(
    `${SALE_SELECT(kind)}
     where ($1::date is null or s.sale_date >= $1)
       and ($2::date is null or s.sale_date <= $2)
       and ($3::uuid is null or s.distributor_id = $3)
       and ($4::uuid is null or s.created_by = $4)
     order by s.sale_date desc, s.created_at desc
     limit $5`,
    [
      filters.from ?? null,
      filters.to ?? null,
      filters.distributorId ?? null,
      filters.createdBy ?? null,
      limit,
    ],
  );
}

export async function getSale(kind: SaleKind, id: string, db?: Db) {
  const [row] = await query<Sale>(
    `${SALE_SELECT(kind)} where s.id = $1`,
    [id],
    db,
  );
  return row ?? null;
}

export type StockRow = {
  id: string;
  name: string;
  city: string;
  primary_units: number;
  secondary_units: number;
  stock: number;
};

/**
 * Units moved in the date range, plus stock as at the end of the range.
 * Stock is always primary minus secondary since the beginning; it is never stored.
 */
export function stockByDistributor(filters: SaleFilters) {
  return query<StockRow>(
    `select d.id, d.name, d.city,
            coalesce(p.in_range, 0)::int as primary_units,
            coalesce(s.in_range, 0)::int as secondary_units,
            (coalesce(p.total, 0) - coalesce(s.total, 0))::int as stock
     from distributors d
     left join (
       select distributor_id,
              sum(quantity) filter (where $1::date is null or sale_date >= $1) as in_range,
              sum(quantity) as total
       from primary_sales where $2::date is null or sale_date <= $2
       group by distributor_id
     ) p on p.distributor_id = d.id
     left join (
       select distributor_id,
              sum(quantity) filter (where $1::date is null or sale_date >= $1) as in_range,
              sum(quantity) as total
       from secondary_sales where $2::date is null or sale_date <= $2
       group by distributor_id
     ) s on s.distributor_id = d.id
     where ($3::uuid is null or d.id = $3)
       and (d.active or p.total is not null or s.total is not null)
     order by d.name`,
    [filters.from ?? null, filters.to ?? null, filters.distributorId ?? null],
  );
}

export type ProductStockRow = {
  id: string;
  name: string;
  sku: string;
  primary_units: number;
  secondary_units: number;
  stock: number;
};

/** Current stock of every product held by one distributor. */
export function stockByProduct(distributorId: string) {
  return query<ProductStockRow>(
    `select pr.id, pr.name, pr.sku,
            coalesce(p.total, 0)::int as primary_units,
            coalesce(s.total, 0)::int as secondary_units,
            (coalesce(p.total, 0) - coalesce(s.total, 0))::int as stock
     from products pr
     left join (select product_id, sum(quantity) as total from primary_sales
                where distributor_id = $1 group by product_id) p on p.product_id = pr.id
     left join (select product_id, sum(quantity) as total from secondary_sales
                where distributor_id = $1 group by product_id) s on s.product_id = pr.id
     where p.total is not null or s.total is not null
     order by pr.name`,
    [distributorId],
  );
}

export type Totals = { units: number; value: number };

export async function salesTotals(kind: SaleKind, filters: SaleFilters) {
  const [row] = await query<Totals>(
    `select coalesce(sum(quantity), 0)::int as units,
            coalesce(sum(quantity * price), 0)::float8 as value
     from ${SALE_TABLE[kind]}
     where ($1::date is null or sale_date >= $1)
       and ($2::date is null or sale_date <= $2)
       and ($3::uuid is null or distributor_id = $3)`,
    [filters.from ?? null, filters.to ?? null, filters.distributorId ?? null],
  );
  return row;
}

export type TopProduct = {
  id: string;
  name: string;
  primary_units: number;
  secondary_units: number;
};

export function topProducts(filters: SaleFilters, limit = 5) {
  const where = `where ($1::date is null or sale_date >= $1)
                   and ($2::date is null or sale_date <= $2)
                   and ($3::uuid is null or distributor_id = $3)`;
  return query<TopProduct>(
    `select pr.id, pr.name,
            coalesce(p.total, 0)::int as primary_units,
            coalesce(s.total, 0)::int as secondary_units
     from products pr
     left join (select product_id, sum(quantity) as total from primary_sales
                ${where} group by product_id) p on p.product_id = pr.id
     left join (select product_id, sum(quantity) as total from secondary_sales
                ${where} group by product_id) s on s.product_id = pr.id
     where p.total is not null or s.total is not null
     order by secondary_units desc, primary_units desc, pr.name
     limit $4`,
    [
      filters.from ?? null,
      filters.to ?? null,
      filters.distributorId ?? null,
      limit,
    ],
  );
}

export type MonthRow = {
  month: string;
  primary_value: number;
  secondary_value: number;
};

/** Sales value per calendar month between two dates (both required). */
export function monthlyTrend(
  from: string,
  to: string,
  distributorId?: string | null,
) {
  const monthly = (table: string) =>
    `select date_trunc('month', sale_date) as m, sum(quantity * price) as total
     from ${table}
     where sale_date >= date_trunc('month', $1::date) and sale_date <= $2
       and ($3::uuid is null or distributor_id = $3)
     group by 1`;
  return query<MonthRow>(
    `select to_char(months.m, 'YYYY-MM') as month,
            coalesce(p.total, 0)::float8 as primary_value,
            coalesce(s.total, 0)::float8 as secondary_value
     from generate_series(date_trunc('month', $1::date),
                          date_trunc('month', $2::date), interval '1 month') as months(m)
     left join (${monthly("primary_sales")}) p on p.m = months.m
     left join (${monthly("secondary_sales")}) s on s.m = months.m
     order by months.m`,
    [from, to, distributorId ?? null],
  );
}

export function listUsers(roles: Role[]) {
  return query<User>(
    `select id, name, email, role, active from users
     where role = any($1) order by role, name`,
    [roles],
  );
}

export async function getUser(id: string, db?: Db) {
  const [row] = await query<User>(
    "select id, name, email, role, active from users where id = $1",
    [id],
    db,
  );
  return row ?? null;
}

export type AuditRow = {
  id: string;
  created_at: Date;
  actor: string | null;
  action: string;
  entity_type: string;
  before_data: unknown;
  after_data: unknown;
};

export function listAudit(limit = 200) {
  return query<AuditRow>(
    `select a.id, a.created_at, u.name as actor, a.action, a.entity_type,
            a.before_data, a.after_data
     from audit_log a left join users u on u.id = a.actor_id
     order by a.created_at desc limit $1`,
    [limit],
  );
}
