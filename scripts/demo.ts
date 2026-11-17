// Fills an EMPTY database with demo users, brands, products, shops, opening
// stock and six months of purchases and sales, so the dashboard has something
// to show. Not for production.
import { randomBytes } from "node:crypto";
import { closePool, query } from "../lib/db";
import { hashPassword } from "../lib/password";
import { PRICE_LIST_PRODUCTS } from "./price-lists";

const shops = [
  ["A Mobile", "Colombo", "Nimal Perera", "+94 77 123 4567"],
  ["City Phones", "Kandy", "Saman Silva", "+94 71 987 6543"],
  ["Galle Cellular", "Galle", "Amal Fernando", "+94 76 555 8832"],
  ["North Star Mobile", "Jaffna", "Ravi Kumar", "+94 75 440 2190"],
  ["Smart Zone", "Negombo", "Kasun Jayasinghe", "+94 72 310 4455"],
] as const;

async function main() {
  const [{ count }] = await query<{ count: number }>(
    `select (select count(*) from products) + (select count(*) from brands)
          + (select count(*) from shops) as count`,
  );
  if (count > 0) {
    throw new Error(
      "The database already has brands, products or shops; demo data not added.",
    );
  }

  const password = process.env.DEMO_PASSWORD || randomBytes(6).toString("hex");
  const hash = hashPassword(password);
  const users = await query<{ id: string; role: string }>(
    `insert into users (name, email, role, password_hash) values
       ('Demo Admin', 'admin@example.com', 'Admin', $1),
       ('Demo Rep One', 'rep1@example.com', 'Sales Rep', $1),
       ('Demo Rep Two', 'rep2@example.com', 'Sales Rep', $1)
     returning id, role`,
    [hash],
  );
  const admin = users.find((user) => user.role === "Admin")!.id;
  const reps = users
    .filter((user) => user.role === "Sales Rep")
    .map((user) => user.id);

  const brandIds = new Map<string, string>();
  for (const name of new Set(PRICE_LIST_PRODUCTS.map((p) => p.brand))) {
    const [row] = await query<{ id: string }>(
      "insert into brands (name) values ($1) returning id",
      [name],
    );
    brandIds.set(name, row.id);
  }

  const now = new Date();
  const day = (monthsAgo: number, dayOfMonth: number) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, dayOfMonth),
    );
    return date > now ? null : date.toISOString().slice(0, 10);
  };
  const openingDate = day(6, 1)!;

  const products: {
    id: string;
    rd: number;
    dealer: number;
    dealerCredit: number;
  }[] = [];
  for (const [index, p] of PRICE_LIST_PRODUCTS.entries()) {
    const [row] = await query<{ id: string }>(
      `insert into products (name, brand_id, model, capacity, sku, category, unit,
         rd_cash, rd_credit, dealer_cash, dealer_credit, mrp, opening_qty, opening_date)
       values ($1, $2, $3, $4, $5, $6, 'Piece', $7, $8, $9, $10, $11, $12, $13)
       returning id`,
      [
        [p.model, p.capacity].filter(Boolean).join(" "),
        brandIds.get(p.brand),
        p.model,
        p.capacity,
        p.sku,
        p.category,
        p.rd_cash,
        p.rd_credit,
        p.dealer_cash,
        p.dealer_credit,
        p.mrp,
        10 + (index % 4) * 5,
        openingDate,
      ],
    );
    products.push({
      id: row.id,
      rd: p.rd_cash,
      dealer: p.dealer_cash,
      dealerCredit: p.dealer_credit ?? p.dealer_cash,
    });
  }

  const shopIds: string[] = [];
  for (const [name, city, contact, phone] of shops) {
    const [row] = await query<{ id: string }>(
      `insert into shops (name, city, contact, phone) values ($1, $2, $3, $4)
       returning id`,
      [name, city, contact, phone],
    );
    shopIds.push(row.id);
  }

  // Each month: one purchase per product on the 3rd, then most of it sold to
  // shops on the 10th, 18th and 26th, a mix of cash and credit.
  for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
    for (const [p, product] of products.entries()) {
      const bought = 12 + ((p * 7 + monthsAgo * 5) % 6) * 4;
      const purchaseDate = day(monthsAgo, 3);
      if (!purchaseDate) continue;
      await query(
        `insert into primary_sales
           (sale_date, product_id, quantity, price, payment_terms, created_by)
         values ($1, $2, $3, $4, $5, $6)`,
        [
          purchaseDate,
          product.id,
          bought,
          product.rd,
          p % 3 ? "cash" : "credit",
          admin,
        ],
      );
      for (const [index, dayOfMonth] of [10, 18, 26].entries()) {
        const saleDate = day(monthsAgo, dayOfMonth);
        if (!saleDate) continue;
        const credit = (p + index + monthsAgo) % 3 === 0;
        await query(
          `insert into secondary_sales
             (sale_date, product_id, shop_id, quantity, price, payment_terms, created_by)
           values ($1, $2, $3, $4, $5, $6, $7)`,
          [
            saleDate,
            product.id,
            shopIds[(p + index + monthsAgo) % shopIds.length],
            Math.max(1, Math.floor((bought * (0.55 + (p % 4) * 0.1)) / 3)),
            credit ? product.dealerCredit : product.dealer,
            credit ? "credit" : "cash",
            reps[(p + index) % reps.length],
          ],
        );
      }
    }
  }

  console.log("Demo data added. Demo logins (all share one password):");
  console.log("  admin@example.com, rep1@example.com, rep2@example.com");
  console.log(`  password: ${password}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(closePool);
