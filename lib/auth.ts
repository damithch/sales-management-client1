import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "./db";
import { parseId } from "./format";
import { hasRole, type Role } from "./roles";

export const SESSION_COOKIE = "sales_session";
const SESSION_HOURS = 12;

export type Session = { id: string; email: string; name: string; role: Role };

type UserRow = Session & { password_hash: string };

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters");
  }
  return value;
}

// The password hash is part of the signed data, so changing or resetting a
// password signs out every existing session for that user.
function sign(userId: string, expires: number, passwordHash: string) {
  return createHmac("sha256", secret())
    .update([userId, expires, passwordHash].join("."))
    .digest("hex");
}

export async function setSession(userId: string, passwordHash: string) {
  const expires = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const value = [userId, expires, sign(userId, expires, passwordHash)].join(
    ".",
  );
  (await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires),
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Reads the cookie, checks its signature and reloads the user on every request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  const [rawId, expiresText, signature] = value.split(".");
  const userId = parseId(rawId);
  const expires = Number(expiresText);
  if (!userId || !signature || !(expires > Date.now())) return null;

  const [user] = await query<UserRow>(
    "select id, email, name, role, password_hash from users where id = $1 and active",
    [userId],
  );
  if (!user) return null;

  const expected = Buffer.from(sign(user.id, expires, user.password_hash));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  return { id: user.id, email: user.email, name: user.name, role: user.role };
});

/** For pages and actions: sends the visitor away unless they hold the role. */
export async function requireRole(minimum: Role): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, minimum)) redirect("/");
  return session;
}
