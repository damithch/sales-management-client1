// Fills an EMPTY database with demo users, products, distributors and six
// months of sales so the dashboard has something to show. Not for production.
import { randomBytes } from "node:crypto";
import { closePool, query } from "../lib/db";
import { hashPassword } from "../lib/password";

const products = [
  ["Classic Cola 330ml", "CC-330", "Beverages", "Case", 1800],
  ["Orange Burst 500ml", "OB-500", "Beverages", "Case", 2200],
  ["Crispy Chips Original", "CH-001", "Snacks", "Box", 1400],
  ["Sparkling Water 1L", "SW-100", "Beverages", "Case", 1200],
] as const;

const distributors = [
  ["Metro Wholesale", "Colombo", "Nimal Perera", "+94 77 123 4567"],
  ["Lanka Trade Centre", "Kandy", "Saman Silva", "+94 71 987 6543"],
  ["Southern Distributors", "Galle", "Amal Fernando", "+94 76 555 8832"],
  ["North Star Trading", "Jaffna", "Ravi Kumar", "+94 75 440 2190"],
] as const;

async function main() {
  const [{ count }] = await query<{ count: number }>(
    "select (select count(*) from products) + (select count(*) from distributors) as count",
  );
  if (count > 0) {
    throw new Error(
      "The database already has products or distributors; demo data not added.",
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

  const productIds: { id: string; price: number }[] = [];
  for (const [name, sku, category, unit, price] of products) {
    const [row] = await query<{ id: string }>(
      `insert into products (name, sku, category, unit, price)
       values ($1, $2, $3, $4, $5) returning id`,
      [name, sku, category, unit, price],
    );
    productIds.push({ id: row.id, price });
  }
  const distributorIds: string[] = [];
  for (const [name, city, contact, phone] of distributors) {
    const [row] = await query<{ id: string }>(
      `insert into distributors (name, city, contact, phone)
       values ($1, $2, $3, $4) returning id`,
      [name, city, contact, phone],
    );
    distributorIds.push(row.id);
  }

  // One primary delivery per distributor, product and month, on the 3rd, then
  // 60-90% of it sold on in two secondary sales later the same month.
  const now = new Date();
  for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
    const day = (dayOfMonth: number) => {
      const date = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() - monthsAgo,
          dayOfMonth,
        ),
      );
      return date > now ? null : date.toISOString().slice(0, 10);
    };
    for (const [d, distributorId] of distributorIds.entries()) {
      for (const [p, product] of productIds.entries()) {
        const delivered = 120 + ((d * 37 + p * 53 + monthsAgo * 29) % 9) * 20;
        const delivery = day(3);
        if (!delivery) continue;
        await query(
          `insert into primary_sales
             (sale_date, distributor_id, product_id, quantity, price, created_by)
           values ($1, $2, $3, $4, $5, $6)`,
          [
            delivery,
            distributorId,
            product.id,
            delivered,
            product.price,
            admin,
          ],
        );
        const share = 0.6 + ((d + p + monthsAgo) % 4) * 0.1;
        const half = Math.floor((delivered * share) / 2);
        for (const [index, dayOfMonth] of [12, 24].entries()) {
          const soldOn = day(dayOfMonth);
          if (!soldOn) continue;
          await query(
            `insert into secondary_sales
               (sale_date, distributor_id, product_id, quantity, price, created_by)
             values ($1, $2, $3, $4, $5, $6)`,
            [
              soldOn,
              distributorId,
              product.id,
              half,
              Math.round(product.price * 1.25),
              reps[(d + index) % reps.length],
            ],
          );
        }
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
