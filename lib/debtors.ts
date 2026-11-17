import { query, type Db } from "./db";

/**
 * Every credit sale to a shop is a debt, due `credit_days` after the sale.
 * A shop's collections pay off its oldest credit sales first, so how much of
 * each sale is still owed is worked out here, as at a given date, from the
 * sales and collections. Nothing about payment status is stored.
 */

export type Invoice = {
  id: string;
  shop_id: string;
  shop: string;
  sale_date: string;
  due_date: string;
  days_overdue: number;
  created_by: string;
  rep: string;
  brand: string | null;
  model: string;
  capacity: string;
  quantity: number;
  price: number;
  amount: number;
  paid: number;
  balance: number;
};

const INVOICES = `
  with inv as (
    select s.id, s.shop_id, s.sale_date, s.created_by, s.product_id,
           s.quantity, s.price, s.quantity * s.price as amount,
           coalesce(sum(s.quantity * s.price) over (
             partition by s.shop_id order by s.sale_date, s.created_at, s.id
             rows between unbounded preceding and 1 preceding), 0) as before
    from secondary_sales s
    where s.payment_terms = 'credit' and s.shop_id is not null and s.sale_date <= $1
  ),
  paid as (
    select shop_id, sum(amount) as total from collections
    where collected_on <= $1 group by shop_id
  ),
  allocated as (
    select inv.*, least(greatest(coalesce(paid.total, 0) - inv.before, 0), inv.amount) as paid
    from inv left join paid on paid.shop_id = inv.shop_id
  )
  select a.id, a.shop_id, sh.name as shop, a.sale_date,
         to_char(a.sale_date + sh.credit_days, 'YYYY-MM-DD') as due_date,
         ($1::date - (a.sale_date + sh.credit_days))::int as days_overdue,
         a.created_by, u.name as rep, b.name as brand, p.model, p.capacity,
         a.quantity, a.price, a.amount::float8 as amount, a.paid::float8 as paid,
         (a.amount - a.paid)::float8 as balance
  from allocated a
  join shops sh on sh.id = a.shop_id
  join users u on u.id = a.created_by
  join products p on p.id = a.product_id
  left join brands b on b.id = p.brand_id`;

export type DebtorFilters = {
  asOf: string;
  shopId?: string | null;
  repId?: string | null;
};

/** Credit sales with money still owed, oldest first. */
export function openInvoices(filters: DebtorFilters, db?: Db) {
  return query<Invoice>(
    `select * from (${INVOICES}) i
     where balance > 0
       and ($2::uuid is null or shop_id = $2)
       and ($3::uuid is null or created_by = $3)
     order by sale_date, shop`,
    [filters.asOf, filters.shopId ?? null, filters.repId ?? null],
    db,
  );
}

export type DebtorRow = {
  shop_id: string;
  shop: string;
  city: string;
  phone: string;
  credit_days: number;
  invoices: number;
  outstanding: number;
  not_due: number;
  overdue: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d90_plus: number;
  oldest_overdue_days: number | null;
};

/** One row per shop that owes money, with the balance split by age. */
export function debtorsByShop(filters: DebtorFilters) {
  const bucket = (where: string) =>
    `coalesce(sum(balance) filter (where ${where}), 0)::float8`;
  return query<DebtorRow>(
    `select i.shop_id, i.shop, sh.city, sh.phone, sh.credit_days,
            count(*)::int as invoices,
            sum(balance)::float8 as outstanding,
            ${bucket("days_overdue <= 0")} as not_due,
            ${bucket("days_overdue > 0")} as overdue,
            ${bucket("days_overdue between 1 and 30")} as d1_30,
            ${bucket("days_overdue between 31 and 60")} as d31_60,
            ${bucket("days_overdue between 61 and 90")} as d61_90,
            ${bucket("days_overdue > 90")} as d90_plus,
            max(days_overdue) filter (where days_overdue > 0) as oldest_overdue_days
     from (${INVOICES}) i join shops sh on sh.id = i.shop_id
     where balance > 0
       and ($2::uuid is null or shop_id = $2)
       and ($3::uuid is null or created_by = $3)
     group by i.shop_id, i.shop, sh.city, sh.phone, sh.credit_days
     order by overdue desc, outstanding desc`,
    [filters.asOf, filters.shopId ?? null, filters.repId ?? null],
  );
}

export type DebtorTotals = {
  outstanding: number;
  overdue: number;
  overdue_shops: number;
};

export async function debtorTotals(filters: DebtorFilters) {
  const [row] = await query<DebtorTotals>(
    `select coalesce(sum(balance), 0)::float8 as outstanding,
            coalesce(sum(balance) filter (where days_overdue > 0), 0)::float8 as overdue,
            count(distinct shop_id) filter (where days_overdue > 0)::int as overdue_shops
     from (${INVOICES}) i
     where balance > 0 and ($2::uuid is null or created_by = $2)`,
    [filters.asOf, filters.repId ?? null],
  );
  return row;
}

export type Collection = {
  id: string;
  shop_id: string;
  shop: string;
  amount: number;
  collected_on: string;
  method: "cash" | "cheque" | "bank";
  reference: string;
  created_by: string;
  entered_by: string;
};

export function listCollections(
  filters: { shopId?: string | null },
  limit = 100,
) {
  return query<Collection>(
    `select c.id, c.shop_id, sh.name as shop, c.amount::float8 as amount,
            to_char(c.collected_on, 'YYYY-MM-DD') as collected_on, c.method,
            c.reference, c.created_by, u.name as entered_by
     from collections c join shops sh on sh.id = c.shop_id
     join users u on u.id = c.created_by
     where $1::uuid is null or c.shop_id = $1
     order by c.collected_on desc, c.created_at desc
     limit $2`,
    [filters.shopId ?? null, limit],
  );
}

export async function getCollection(id: string, db?: Db) {
  const [row] = await query<Collection>(
    `select c.id, c.shop_id, sh.name as shop, c.amount::float8 as amount,
            to_char(c.collected_on, 'YYYY-MM-DD') as collected_on, c.method,
            c.reference, c.created_by, u.name as entered_by
     from collections c join shops sh on sh.id = c.shop_id
     join users u on u.id = c.created_by
     where c.id = $1`,
    [id],
    db,
  );
  return row ?? null;
}

export type ShopAccount = {
  credit_sales: number;
  collected: number;
  outstanding: number;
  advance: number;
};

/** A shop's whole credit account: sold on credit, collected, owed, paid in advance. */
export async function shopAccount(shopId: string, asOf: string) {
  const [row] = await query<{ credit_sales: number; collected: number }>(
    `select
       coalesce((select sum(quantity * price) from secondary_sales
                 where shop_id = $1 and payment_terms = 'credit' and sale_date <= $2), 0)::float8
         as credit_sales,
       coalesce((select sum(amount) from collections
                 where shop_id = $1 and collected_on <= $2), 0)::float8 as collected`,
    [shopId, asOf],
  );
  const difference = row.credit_sales - row.collected;
  return {
    credit_sales: row.credit_sales,
    collected: row.collected,
    outstanding: Math.max(difference, 0),
    advance: Math.max(-difference, 0),
  };
}
