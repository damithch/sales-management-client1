"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearSession, getSession, requireRole, setSession } from "@/lib/auth";
import type { Session } from "@/lib/auth";
import { query, transaction, type Db } from "@/lib/db";
import { parseDate, parseId, today } from "@/lib/format";
import {
  hashPassword,
  MIN_PASSWORD_LENGTH,
  verifyPassword,
} from "@/lib/password";
import {
  defaultPrice,
  getBrand,
  getProduct,
  getSale,
  getShop,
  getUser,
  type PaymentTerms,
  type Sale,
  SALE_TABLE,
  type SaleKind,
} from "@/lib/queries";
import { hasRole, isRole, rolesBelow } from "@/lib/roles";

export type FormState = { error?: string; ok?: string };

const text = (form: FormData, name: string) =>
  String(form.get(name) ?? "").trim();

function audit(
  db: Db,
  actor: Session,
  action: string,
  entityType: string,
  entityId: string,
  before: unknown,
  after: unknown,
) {
  return db.query(
    `insert into audit_log (actor_id, action, entity_type, entity_id, before_data, after_data)
     values ($1, $2, $3, $4, $5, $6)`,
    [
      actor.id,
      action,
      entityType,
      entityId,
      before === null ? null : JSON.stringify(before),
      after === null ? null : JSON.stringify(after),
    ],
  );
}

const isUniqueViolation = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  (error as { code?: string }).code === "23505";

// ---------------------------------------------------------------- session

// A fixed hash to compare against when the email is unknown, so the response
// takes the same time whether or not the account exists.
const DUMMY_HASH = hashPassword("not-a-real-password");

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = text(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const [user] = await query<{ id: string; password_hash: string }>(
    "select id, password_hash from users where lower(email) = $1 and active",
    [email],
  );
  const valid = verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !valid) return { error: "Wrong email or password." };
  await setSession(user.id, user.password_hash);
  redirect("/");
}

export async function logout() {
  await clearSession();
  redirect("/login");
}

export async function changeOwnPassword(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/login");
  const current = String(form.get("current") ?? "");
  const next = String(form.get("password") ?? "");
  if (next.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  const [row] = await query<{ password_hash: string }>(
    "select password_hash from users where id = $1",
    [session.id],
  );
  if (!row || !verifyPassword(current, row.password_hash)) {
    return { error: "Current password is wrong." };
  }
  const hash = hashPassword(next);
  await transaction(async (db) => {
    await db.query("update users set password_hash = $1 where id = $2", [
      hash,
      session.id,
    ]);
    await audit(db, session, "change_password", "user", session.id, null, null);
  });
  await setSession(session.id, hash);
  return { ok: "Password changed." };
}

// ----------------------------------------------------------------- brands

export async function createBrand(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireRole("Admin");
  const name = text(form, "name");
  if (!name) return { error: "Brand name is required." };
  try {
    await transaction(async (db) => {
      const { rows } = await db.query(
        "insert into brands (name) values ($1) returning id",
        [name],
      );
      await audit(db, actor, "create", "brand", rows[0].id, null, { name });
    });
  } catch (error) {
    if (isUniqueViolation(error))
      return { error: "That brand already exists." };
    throw error;
  }
  revalidatePath("/brands");
  return { ok: `Added ${name}.` };
}

export async function updateBrand(
  id: string,
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireRole("Admin");
  const after = {
    name: text(form, "name"),
    active: form.get("active") === "on",
  };
  if (!after.name) return { error: "Brand name is required." };
  try {
    const found = await transaction(async (db) => {
      const before = await getBrand(id, db);
      if (!before) return false;
      await db.query("update brands set name = $1, active = $2 where id = $3", [
        after.name,
        after.active,
        id,
      ]);
      await audit(db, actor, "update", "brand", id, before, after);
      return true;
    });
    if (!found) return { error: "Brand not found." };
  } catch (error) {
    if (isUniqueViolation(error))
      return { error: "That brand already exists." };
    throw error;
  }
  revalidatePath("/", "layout");
  return { ok: "Saved." };
}

// --------------------------------------------------------------- products

/** Blank means "not set"; anything else must be a number of 0 or more. */
function optionalPrice(form: FormData, name: string): number | null | "bad" {
  const raw = text(form, name).replace(/,/g, "");
  if (raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : "bad";
}

const PRICE_FIELDS = [
  ["rd_cash", "RD cash price"],
  ["rd_credit", "RD credit price"],
  ["dealer_cash", "Dealer cash price"],
  ["dealer_credit", "Dealer credit price"],
  ["mrp", "MRP"],
] as const;

type ProductInput = {
  brand_id: string;
  model: string;
  capacity: string;
  sku: string;
  unit: string;
  rd_cash: number | null;
  rd_credit: number | null;
  dealer_cash: number | null;
  dealer_credit: number | null;
  mrp: number | null;
  opening_qty: number;
  opening_date: string | null;
};

async function readProduct(form: FormData): Promise<ProductInput | string> {
  const brandId = parseId(form.get("brand_id"));
  const model = text(form, "model");
  if (!brandId || !model) return "Choose a brand and enter the model.";
  const brand = await getBrand(brandId);
  if (!brand) return "Choose a brand and enter the model.";

  const prices: Record<string, number | null> = {};
  for (const [field, label] of PRICE_FIELDS) {
    const value = optionalPrice(form, field);
    if (value === "bad") return `${label} must be a number of 0 or more.`;
    prices[field] = value;
  }

  const openingText = text(form, "opening_qty");
  const openingQty = openingText === "" ? 0 : Number(openingText);
  if (!Number.isInteger(openingQty) || openingQty < 0) {
    return "Opening stock must be a whole number of 0 or more.";
  }
  const openingDateText = text(form, "opening_date");
  const openingDate = openingDateText ? parseDate(openingDateText) : null;
  if (openingDateText && !openingDate)
    return "Enter a valid opening stock date.";

  const capacity = text(form, "capacity");
  return {
    brand_id: brandId,
    model,
    capacity,
    sku: text(form, "sku") || makeSku(brand.name, model, capacity),
    unit: text(form, "unit") || "Piece",
    rd_cash: prices.rd_cash,
    rd_credit: prices.rd_credit,
    dealer_cash: prices.dealer_cash,
    dealer_credit: prices.dealer_credit,
    mrp: prices.mrp,
    opening_qty: openingQty,
    opening_date: openingDate,
  };
}

/** "KXD", "A5", "3+8GB/64GB" -> "KXD-A5-3-8GB-64GB" */
function makeSku(brand: string, model: string, capacity: string) {
  return [brand, model, capacity]
    .filter(Boolean)
    .join("-")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const productName = (product: ProductInput) =>
  [product.model, product.capacity].filter(Boolean).join(" ");

const productValues = (product: ProductInput) => [
  productName(product),
  product.brand_id,
  product.model,
  product.capacity,
  product.sku,
  product.unit,
  product.rd_cash,
  product.rd_credit,
  product.dealer_cash,
  product.dealer_credit,
  product.mrp,
  product.opening_qty,
  product.opening_date,
];

export async function createProduct(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireRole("Admin");
  const product = await readProduct(form);
  if (typeof product === "string") return { error: product };
  try {
    await transaction(async (db) => {
      const { rows } = await db.query(
        `insert into products (name, brand_id, model, capacity, sku, unit,
           rd_cash, rd_credit, dealer_cash, dealer_credit, mrp, opening_qty, opening_date)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) returning id`,
        productValues(product),
      );
      await audit(db, actor, "create", "product", rows[0].id, null, product);
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        error: `The code ${product.sku} is already used by another product.`,
      };
    }
    throw error;
  }
  revalidatePath("/products");
  return { ok: `Added ${productName(product)} (${product.sku}).` };
}

export async function updateProduct(
  id: string,
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireRole("Admin");
  const product = await readProduct(form);
  if (typeof product === "string") return { error: product };
  const active = form.get("active") === "on";
  try {
    const found = await transaction(async (db) => {
      const before = await getProduct(id, db);
      if (!before) return false;
      await db.query(
        `update products set name = $1, brand_id = $2, model = $3, capacity = $4,
                sku = $5, unit = $6, rd_cash = $7, rd_credit = $8, dealer_cash = $9,
                dealer_credit = $10, mrp = $11, opening_qty = $12, opening_date = $13,
                active = $14
         where id = $15`,
        [...productValues(product), active, id],
      );
      await audit(db, actor, "update", "product", id, before, {
        ...product,
        active,
      });
      return true;
    });
    if (!found) return { error: "Product not found." };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        error: `The code ${product.sku} is already used by another product.`,
      };
    }
    throw error;
  }
  revalidatePath("/", "layout");
  redirect("/products");
}

// ------------------------------------------------------------------ shops

function readShop(form: FormData) {
  const shop = {
    name: text(form, "name"),
    city: text(form, "city"),
    contact: text(form, "contact"),
    phone: text(form, "phone"),
  };
  return shop.name ? shop : "Shop name is required.";
}

export async function createShop(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireRole("Admin");
  const shop = readShop(form);
  if (typeof shop === "string") return { error: shop };
  try {
    await transaction(async (db) => {
      const { rows } = await db.query(
        `insert into shops (name, city, contact, phone)
         values ($1, $2, $3, $4) returning id`,
        [shop.name, shop.city, shop.contact, shop.phone],
      );
      await audit(db, actor, "create", "shop", rows[0].id, null, shop);
    });
  } catch (error) {
    if (isUniqueViolation(error))
      return { error: "A shop with that name already exists." };
    throw error;
  }
  revalidatePath("/shops");
  return { ok: `Added ${shop.name}.` };
}

export async function updateShop(
  id: string,
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireRole("Admin");
  const shop = readShop(form);
  if (typeof shop === "string") return { error: shop };
  const after = { ...shop, active: form.get("active") === "on" };
  try {
    const found = await transaction(async (db) => {
      const before = await getShop(id, db);
      if (!before) return false;
      await db.query(
        `update shops set name = $1, city = $2, contact = $3, phone = $4, active = $5
         where id = $6`,
        [after.name, after.city, after.contact, after.phone, after.active, id],
      );
      await audit(db, actor, "update", "shop", id, before, after);
      return true;
    });
    if (!found) return { error: "Shop not found." };
  } catch (error) {
    if (isUniqueViolation(error))
      return { error: "A shop with that name already exists." };
    throw error;
  }
  revalidatePath("/", "layout");
  return { ok: "Saved." };
}

// ------------------------------------------------------------------ sales

const SALE_PATH: Record<SaleKind, string> = {
  primary: "/primary-sales",
  secondary: "/secondary-sales",
};

type SaleInput = {
  sale_date: string;
  product_id: string;
  shop_id: string | null;
  quantity: number;
  price: number;
  payment_terms: PaymentTerms;
};

/**
 * Validates a sale form. The price defaults to the product's RD price
 * (primary) or Dealer price (secondary) for the chosen terms. Sales Reps
 * always get the default price; only Admins can type a different one.
 */
async function readSale(
  kind: SaleKind,
  form: FormData,
  actor: Session,
  editing?: Sale,
): Promise<SaleInput | string> {
  const date = parseDate(form.get("date"));
  const productId = parseId(form.get("product_id"));
  const shopId = kind === "secondary" ? parseId(form.get("shop_id")) : null;
  const quantity = Number(text(form, "quantity"));
  const terms = text(form, "payment_terms");

  if (!date) return "Enter a valid date.";
  if (date > today()) return "The date cannot be in the future.";
  if (!productId) return "Choose a product.";
  if (kind === "secondary" && !shopId) return "Choose the shop.";
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return "Quantity must be a whole number above 0.";
  }
  if (terms !== "cash" && terms !== "credit") return "Choose cash or credit.";

  const [product, shop] = await Promise.all([
    getProduct(productId),
    shopId ? getShop(shopId) : null,
  ]);
  // Inactive products and shops can stay on a sale being edited, but cannot
  // be chosen for a new one.
  if (!product || (!product.active && product.id !== editing?.product_id)) {
    return "Choose a product.";
  }
  if (
    kind === "secondary" &&
    (!shop || (!shop.active && shop.id !== editing?.shop_id))
  ) {
    return "Choose the shop.";
  }

  const tier = kind === "primary" ? "RD" : "Dealer";
  const listPrice = defaultPrice(product, kind, terms);
  let price: number;
  const priceText = text(form, "price").replace(/,/g, "");
  if (hasRole(actor.role, "Admin") && priceText !== "") {
    price = Number(priceText);
    if (!Number.isFinite(price) || price < 0) return "Price must be 0 or more.";
  } else if (listPrice !== null) {
    price = listPrice;
  } else {
    return hasRole(actor.role, "Admin")
      ? `This product has no ${tier} price. Enter the unit price, or add it on the product.`
      : `This product has no ${tier} price yet. Ask the office to add it.`;
  }
  return {
    sale_date: date,
    product_id: product.id,
    shop_id: shopId,
    quantity,
    price,
    payment_terms: terms,
  };
}

export async function createSale(
  kind: SaleKind,
  _: FormState,
  form: FormData,
): Promise<FormState> {
  // Primary sales are entered by Admins; secondary sales by anyone signed in.
  const actor = await requireRole(kind === "primary" ? "Admin" : "Sales Rep");
  const sale = await readSale(kind, form, actor);
  if (typeof sale === "string") return { error: sale };
  await transaction(async (db) => {
    const { rows } =
      kind === "primary"
        ? await db.query(
            `insert into primary_sales
               (sale_date, product_id, quantity, price, payment_terms, created_by)
             values ($1, $2, $3, $4, $5, $6) returning id`,
            [
              sale.sale_date,
              sale.product_id,
              sale.quantity,
              sale.price,
              sale.payment_terms,
              actor.id,
            ],
          )
        : await db.query(
            `insert into secondary_sales
               (sale_date, product_id, shop_id, quantity, price, payment_terms, created_by)
             values ($1, $2, $3, $4, $5, $6, $7) returning id`,
            [
              sale.sale_date,
              sale.product_id,
              sale.shop_id,
              sale.quantity,
              sale.price,
              sale.payment_terms,
              actor.id,
            ],
          );
    await audit(db, actor, "create", `${kind}_sale`, rows[0].id, null, sale);
  });
  revalidatePath("/", "layout");
  return { ok: "Sale saved." };
}

export async function updateSale(
  kind: SaleKind,
  id: string,
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireRole("Admin");
  const existing = await getSale(kind, id);
  if (!existing) return { error: "Sale not found." };
  const sale = await readSale(kind, form, actor, existing);
  if (typeof sale === "string") return { error: sale };
  const found = await transaction(async (db) => {
    const before = await getSale(kind, id, db);
    if (!before) return false;
    await db.query(
      `update ${SALE_TABLE[kind]} set sale_date = $1, product_id = $2, quantity = $3,
              price = $4, payment_terms = $5 ${kind === "secondary" ? ", shop_id = $7" : ""}
       where id = $6`,
      kind === "secondary"
        ? [
            sale.sale_date,
            sale.product_id,
            sale.quantity,
            sale.price,
            sale.payment_terms,
            id,
            sale.shop_id,
          ]
        : [
            sale.sale_date,
            sale.product_id,
            sale.quantity,
            sale.price,
            sale.payment_terms,
            id,
          ],
    );
    await audit(db, actor, "update", `${kind}_sale`, id, before, sale);
    return true;
  });
  if (!found) return { error: "Sale not found." };
  revalidatePath("/", "layout");
  redirect(SALE_PATH[kind]);
}

export async function deleteSale(kind: SaleKind, id: string) {
  const actor = await requireRole("Admin");
  await transaction(async (db) => {
    const before = await getSale(kind, id, db);
    if (!before) return;
    await db.query(`delete from ${SALE_TABLE[kind]} where id = $1`, [id]);
    await audit(db, actor, "delete", `${kind}_sale`, id, before, null);
  });
  revalidatePath("/", "layout");
  redirect(SALE_PATH[kind]);
}

// ------------------------------------------------------------------ users

export async function createUser(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireRole("Admin");
  const name = text(form, "name");
  const email = text(form, "email").toLowerCase();
  const role = text(form, "role");
  const password = String(form.get("password") ?? "");

  if (!name || !email.includes("@"))
    return { error: "Enter a name and a valid email." };
  if (!isRole(role) || !rolesBelow(actor.role).includes(role)) {
    return { error: "You cannot create an account with that role." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  try {
    await transaction(async (db) => {
      const { rows } = await db.query(
        `insert into users (name, email, role, password_hash)
         values ($1, $2, $3, $4) returning id`,
        [name, email, role, hashPassword(password)],
      );
      await audit(db, actor, "create", "user", rows[0].id, null, {
        name,
        email,
        role,
      });
    });
  } catch (error) {
    if (isUniqueViolation(error))
      return { error: "That email is already in use." };
    throw error;
  }
  revalidatePath("/users");
  return { ok: `Created ${name}.` };
}

export async function updateUser(
  id: string,
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireRole("Admin");
  const manageable = rolesBelow(actor.role);
  const name = text(form, "name");
  const role = text(form, "role");
  const active = form.get("active") === "on";
  const password = String(form.get("password") ?? "");

  if (!name) return { error: "Name is required." };
  if (!isRole(role) || !manageable.includes(role)) {
    return { error: "You cannot assign that role." };
  }
  if (password && password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  const result = await transaction(async (db) => {
    const before = await getUser(id, db);
    // Accounts at or above your own role are treated as if they do not exist.
    if (!before || !manageable.includes(before.role)) return "missing";
    await db.query(
      "update users set name = $1, role = $2, active = $3 where id = $4",
      [name, role, active, id],
    );
    if (password) {
      await db.query("update users set password_hash = $1 where id = $2", [
        hashPassword(password),
        id,
      ]);
    }
    await audit(db, actor, "update", "user", id, before, {
      name,
      role,
      active,
      password_reset: Boolean(password),
    });
    return "ok";
  });
  if (result === "missing") return { error: "User not found." };
  revalidatePath("/users");
  redirect("/users");
}
