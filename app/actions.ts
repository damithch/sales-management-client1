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
  getDistributor,
  getProduct,
  getSale,
  getUser,
  SALE_TABLE,
  type SaleKind,
} from "@/lib/queries";
import { isRole, rolesBelow } from "@/lib/roles";

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

// --------------------------------------------------------------- products

function readProduct(form: FormData) {
  const price = Number(text(form, "price"));
  const product = {
    name: text(form, "name"),
    sku: text(form, "sku"),
    category: text(form, "category"),
    unit: text(form, "unit"),
    price,
  };
  if (!product.name || !product.sku) return "Name and SKU are required.";
  if (!Number.isFinite(price) || price < 0) return "Price must be 0 or more.";
  return product;
}

export async function createProduct(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireRole("Admin");
  const product = readProduct(form);
  if (typeof product === "string") return { error: product };
  try {
    await transaction(async (db) => {
      const { rows } = await db.query(
        `insert into products (name, sku, category, unit, price)
         values ($1, $2, $3, $4, $5) returning id`,
        [
          product.name,
          product.sku,
          product.category,
          product.unit,
          product.price,
        ],
      );
      await audit(db, actor, "create", "product", rows[0].id, null, product);
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "That SKU already exists." };
    throw error;
  }
  revalidatePath("/products");
  return { ok: `Added ${product.name}.` };
}

export async function updateProduct(
  id: string,
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireRole("Admin");
  const product = readProduct(form);
  if (typeof product === "string") return { error: product };
  const after = { ...product, active: form.get("active") === "on" };
  try {
    const found = await transaction(async (db) => {
      const before = await getProduct(id, db);
      if (!before) return false;
      await db.query(
        `update products set name = $1, sku = $2, category = $3, unit = $4,
                price = $5, active = $6 where id = $7`,
        [
          after.name,
          after.sku,
          after.category,
          after.unit,
          after.price,
          after.active,
          id,
        ],
      );
      await audit(db, actor, "update", "product", id, before, after);
      return true;
    });
    if (!found) return { error: "Product not found." };
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "That SKU already exists." };
    throw error;
  }
  revalidatePath("/products");
  redirect("/products");
}

// ----------------------------------------------------------- distributors

function readDistributor(form: FormData) {
  const distributor = {
    name: text(form, "name"),
    city: text(form, "city"),
    contact: text(form, "contact"),
    phone: text(form, "phone"),
  };
  return distributor.name ? distributor : "Name is required.";
}

export async function createDistributor(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireRole("Admin");
  const distributor = readDistributor(form);
  if (typeof distributor === "string") return { error: distributor };
  try {
    await transaction(async (db) => {
      const { rows } = await db.query(
        `insert into distributors (name, city, contact, phone)
         values ($1, $2, $3, $4) returning id`,
        [
          distributor.name,
          distributor.city,
          distributor.contact,
          distributor.phone,
        ],
      );
      await audit(
        db,
        actor,
        "create",
        "distributor",
        rows[0].id,
        null,
        distributor,
      );
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "A distributor with that name already exists." };
    }
    throw error;
  }
  revalidatePath("/distributors");
  return { ok: `Added ${distributor.name}.` };
}

export async function updateDistributor(
  id: string,
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const actor = await requireRole("Admin");
  const distributor = readDistributor(form);
  if (typeof distributor === "string") return { error: distributor };
  const after = { ...distributor, active: form.get("active") === "on" };
  try {
    const found = await transaction(async (db) => {
      const before = await getDistributor(id, db);
      if (!before) return false;
      await db.query(
        `update distributors set name = $1, city = $2, contact = $3, phone = $4,
                active = $5 where id = $6`,
        [after.name, after.city, after.contact, after.phone, after.active, id],
      );
      await audit(db, actor, "update", "distributor", id, before, after);
      return true;
    });
    if (!found) return { error: "Distributor not found." };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "A distributor with that name already exists." };
    }
    throw error;
  }
  revalidatePath("/distributors");
  revalidatePath(`/distributors/${id}`);
  return { ok: "Saved." };
}

// ------------------------------------------------------------------ sales

const SALE_PATH: Record<SaleKind, string> = {
  primary: "/primary-sales",
  secondary: "/secondary-sales",
};

/** Validates a sale form. A blank price falls back to the product's list price. */
async function readSale(form: FormData) {
  const date = parseDate(form.get("date"));
  const distributorId = parseId(form.get("distributor_id"));
  const productId = parseId(form.get("product_id"));
  const quantity = Number(text(form, "quantity"));
  const priceText = text(form, "price");

  if (!date) return "Enter a valid date.";
  if (date > today()) return "The date cannot be in the future.";
  if (!distributorId || !productId)
    return "Choose a distributor and a product.";
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return "Quantity must be a whole number above 0.";
  }
  const [distributor, product] = await Promise.all([
    getDistributor(distributorId),
    getProduct(productId),
  ]);
  if (!distributor || !product) return "Choose a distributor and a product.";

  const price = priceText === "" ? product.price : Number(priceText);
  if (!Number.isFinite(price) || price < 0) return "Price must be 0 or more.";
  return {
    sale_date: date,
    distributor_id: distributorId,
    product_id: productId,
    quantity,
    price,
  };
}

export async function createSale(
  kind: SaleKind,
  _: FormState,
  form: FormData,
): Promise<FormState> {
  // Primary sales are entered by Admins; secondary sales by anyone signed in.
  const actor = await requireRole(kind === "primary" ? "Admin" : "Sales Rep");
  const sale = await readSale(form);
  if (typeof sale === "string") return { error: sale };
  await transaction(async (db) => {
    const { rows } = await db.query(
      `insert into ${SALE_TABLE[kind]}
         (sale_date, distributor_id, product_id, quantity, price, created_by)
       values ($1, $2, $3, $4, $5, $6) returning id`,
      [
        sale.sale_date,
        sale.distributor_id,
        sale.product_id,
        sale.quantity,
        sale.price,
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
  const sale = await readSale(form);
  if (typeof sale === "string") return { error: sale };
  const found = await transaction(async (db) => {
    const before = await getSale(kind, id, db);
    if (!before) return false;
    await db.query(
      `update ${SALE_TABLE[kind]} set sale_date = $1, distributor_id = $2,
              product_id = $3, quantity = $4, price = $5 where id = $6`,
      [
        sale.sale_date,
        sale.distributor_id,
        sale.product_id,
        sale.quantity,
        sale.price,
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
