import { query, type Db } from "./db";
import type { PaymentTerms, SaleKind } from "./pricing";
import type { Role } from "./roles";

export { defaultPrice } from "./pricing";
export type { PaymentTerms, SaleKind } from "./pricing";

// Table names are never taken from user input; they come from this map.
export const SALE_TABLE: Record<SaleKind, string> = {
  primary: "primary_sales",
  secondary: "secondary_sales",
};

export type Brand = { id: string; name: string; active: boolean };

export type Product = {
  id: string;
  brand_id: string | null;
  brand: string | null;
  model: string;
  capacity: string;
  sku: string;
  category: string;
  unit: string;
  rd_cash: number | null;
  rd_credit: number | null;
  dealer_cash: number | null;
  dealer_credit: number | null;
  mrp: number | null;
  opening_qty: number;
  opening_date: string | null;
  active: boolean;
};

export type Shop = {
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
  product_id: string;
  brand_id: string | null;
  brand: string | null;
  model: string;
  capacity: string;
  sku: string;
  shop_id: string | null;
  shop: string | null;
  quantity: number;
  price: number;
  payment_terms: PaymentTerms;
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

export type Filters = {
  from?: string | null;
  to?: string | null;
  brandId?: string | null;
  shopId?: string | null;
  createdBy?: string | null;
};

/** "Alcatel 1021" or "KXD A5 3+8GB/64GB". */
export function productLabel(product: {
  brand: string | null;
  model: string;
  capacity: string;
}) {
  return [product.brand, product.model, product.capacity]
    .filter(Boolean)
    .join(" ");
}

// ------------------------------------------------------------------ brands

export function listBrands(activeOnly = false) {
  return query<Brand>(
    "select id, name, active from brands where active or not $1 order by name",
    [activeOnly],
  );
}

export async function getBrand(id: string, db?: Db) {
  const [row] = await query<Brand>(
    "select id, name, active from brands where id = $1",
    [id],
    db,
  );
  return row ?? null;
}

// ---------------------------------------------------------------- products

const PRODUCT_SELECT = `
  select p.id, p.brand_id, b.name as brand, p.model, p.capacity, p.sku,
         p.category, p.unit, p.rd_cash, p.rd_credit, p.dealer_cash,
         p.dealer_credit, p.mrp, p.opening_qty, p.opening_date, p.active
  from products p left join brands b on b.id = p.brand_id`;

export function listProducts(
  options: { activeOnly?: boolean; brandId?: string | null } = {},
) {
  return query<Product>(
    `${PRODUCT_SELECT}
     where (p.active or not $1) and ($2::uuid is null or p.brand_id = $2)
     order by b.name nulls last, p.model, p.capacity`,
    [options.activeOnly ?? false, options.brandId ?? null],
  );
}

export async function getProduct(id: string, db?: Db) {
  const [row] = await query<Product>(
    `${PRODUCT_SELECT} where p.id = $1`,
    [id],
    db,
  );
  return row ?? null;
}

// ------------------------------------------------------------------- shops

export function listShops(activeOnly = false) {
  return query<Shop>(
    `select id, name, city, contact, phone, active from shops
     where active or not $1 order by name`,
    [activeOnly],
  );
}

export async function getShop(id: string, db?: Db) {
  const [row] = await query<Shop>(
    "select id, name, city, contact, phone, active from shops where id = $1",
    [id],
    db,
  );
  return row ?? null;
}

// ------------------------------------------------------------------- sales

const SALE_SELECT = (kind: SaleKind) => `
  select s.id, s.sale_date, s.product_id, p.brand_id, b.name as brand,
         p.model, p.capacity, p.sku,
         ${kind === "secondary" ? "s.shop_id, sh.name as shop" : "null::uuid as shop_id, null::text as shop"},
         s.quantity, s.price, s.payment_terms, s.created_by, u.name as entered_by
  from ${SALE_TABLE[kind]} s
  join products p on p.id = s.product_id
  left join brands b on b.id = p.brand_id
  ${kind === "secondary" ? "left join shops sh on sh.id = s.shop_id" : ""}
  join users u on u.id = s.created_by`;

export function listSales(kind: SaleKind, filters: Filters, limit = 500) {
  return query<Sale>(
    `${SALE_SELECT(kind)}
     where ($1::date is null or s.sale_date >= $1)
       and ($2::date is null or s.sale_date <= $2)
       and ($3::uuid is null or p.brand_id = $3)
       and ($4::uuid is null or s.created_by = $4)
       ${kind === "secondary" ? "and ($6::uuid is null or s.shop_id = $6)" : "and $6::uuid is null"}
     order by s.sale_date desc, s.created_at desc
     limit $5`,
    [
      filters.from ?? null,
      filters.to ?? null,
      filters.brandId ?? null,
      filters.createdBy ?? null,
      limit,
      kind === "secondary" ? (filters.shopId ?? null) : null,
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

// ------------------------------------------------------------------- stock

export type StockRow = {
  id: string;
  brand: string | null;
  model: string;
  capacity: string;
  sku: string;
  rd_cash: number | null;
  opening: number;
  purchased: number;
  sold: number;
  closing: number;
};

/**
 * Stock in hand per model for a date range:
 *   opening   = opening stock + purchases − sales before the range
 *   closing   = opening + purchases − sales within the range
 * Stock is always calculated from the movements; it is never stored.
 */
export function stockByProduct(filters: Filters) {
  const movements = (table: string) => `
    select product_id,
           sum(quantity) filter (where $1::date is not null and sale_date < $1) as before,
           sum(quantity) filter (where ($1::date is null or sale_date >= $1)
                                   and ($2::date is null or sale_date <= $2)) as in_range
    from ${table} group by product_id`;
  return query<StockRow>(
    `select id, brand, model, capacity, sku, rd_cash, opening, purchased, sold,
            opening + purchased - sold as closing
     from (
       select p.id, b.name as brand, p.model, p.capacity, p.sku, p.rd_cash, p.active,
              (case when p.opening_date is null or $2::date is null or p.opening_date <= $2
                    then p.opening_qty else 0 end
               + coalesce(ps.before, 0) - coalesce(ss.before, 0))::int as opening,
              coalesce(ps.in_range, 0)::int as purchased,
              coalesce(ss.in_range, 0)::int as sold
       from products p
       left join brands b on b.id = p.brand_id
       left join (${movements("primary_sales")}) ps on ps.product_id = p.id
       left join (${movements("secondary_sales")}) ss on ss.product_id = p.id
       where $3::uuid is null or p.brand_id = $3
     ) t
     where active or opening <> 0 or purchased <> 0 or sold <> 0
     order by brand nulls last, model, capacity`,
    [filters.from ?? null, filters.to ?? null, filters.brandId ?? null],
  );
}

// ---------------------------------------------------------------- dashboard

export type Totals = { units: number; value: number };

const IN_RANGE = `($1::date is null or s.sale_date >= $1)
  and ($2::date is null or s.sale_date <= $2)
  and ($3::uuid is null or p.brand_id = $3)`;

export async function salesTotals(kind: SaleKind, filters: Filters) {
  const [row] = await query<Totals>(
    `select coalesce(sum(s.quantity), 0)::int as units,
            coalesce(sum(s.quantity * s.price), 0)::float8 as value
     from ${SALE_TABLE[kind]} s join products p on p.id = s.product_id
     where ${IN_RANGE}`,
    [filters.from ?? null, filters.to ?? null, filters.brandId ?? null],
  );
  return row;
}

export type Profit = { revenue: number; cost: number; uncosted_units: number };

/**
 * Gross profit on secondary sales: what shops paid less the product's
 * current RD cash price. Sales of products with no RD price are left out
 * and counted in uncosted_units.
 */
export async function secondaryProfit(filters: Filters) {
  const [row] = await query<Profit>(
    `select coalesce(sum(s.quantity * s.price) filter (where p.rd_cash is not null), 0)::float8 as revenue,
            coalesce(sum(s.quantity * p.rd_cash), 0)::float8 as cost,
            coalesce(sum(s.quantity) filter (where p.rd_cash is null), 0)::int as uncosted_units
     from secondary_sales s join products p on p.id = s.product_id
     where ${IN_RANGE}`,
    [filters.from ?? null, filters.to ?? null, filters.brandId ?? null],
  );
  return row;
}

export type ProductSalesRow = {
  id: string;
  brand: string | null;
  model: string;
  capacity: string;
  sold_units: number;
  sold_value: number;
};

/** Secondary sales per model in the range, for "Top products" by brand. */
export function salesByProduct(filters: Filters) {
  return query<ProductSalesRow>(
    `select p.id, b.name as brand, p.model, p.capacity,
            sum(s.quantity)::int as sold_units,
            sum(s.quantity * s.price)::float8 as sold_value
     from secondary_sales s
     join products p on p.id = s.product_id
     left join brands b on b.id = p.brand_id
     where ${IN_RANGE}
     group by p.id, b.name
     order by sold_units desc`,
    [filters.from ?? null, filters.to ?? null, filters.brandId ?? null],
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
  brandId?: string | null,
) {
  const monthly = (table: string) =>
    `select date_trunc('month', s.sale_date) as m, sum(s.quantity * s.price) as total
     from ${table} s join products p on p.id = s.product_id
     where s.sale_date >= date_trunc('month', $1::date) and s.sale_date <= $2
       and ($3::uuid is null or p.brand_id = $3)
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
    [from, to, brandId ?? null],
  );
}

// ------------------------------------------------------------------- users

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
