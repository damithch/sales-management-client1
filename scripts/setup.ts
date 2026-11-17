// Creates or updates the tables and the Developer account. Safe to run more than once.
import { readdirSync, readFileSync } from "node:fs";
import { closePool, query } from "../lib/db";
import { hashPassword, MIN_PASSWORD_LENGTH } from "../lib/password";

async function main() {
  const email = (process.env.DEVELOPER_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.DEVELOPER_PASSWORD ?? "";
  if (!email || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Set DEVELOPER_EMAIL and DEVELOPER_PASSWORD (at least ${MIN_PASSWORD_LENGTH} characters).`,
    );
  }

  await query(
    readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"),
  );
  // Migrations are idempotent and run in file-name order.
  const dir = new URL("../db/migrations/", import.meta.url);
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    await query(readFileSync(new URL(file, dir), "utf8"));
    console.log(`Applied ${file}`);
  }

  // Running it again resets the Developer's password to DEVELOPER_PASSWORD.
  await query(
    `insert into users (name, email, role, password_hash)
     values ('Developer', $1, 'Developer', $2)
     on conflict (email) do update
       set role = 'Developer', active = true, password_hash = excluded.password_hash`,
    [email, hashPassword(password)],
  );
  console.log(`Tables ready. Developer account: ${email}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(closePool);
