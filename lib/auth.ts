import { cookies } from "next/headers"; import { redirect } from "next/navigation"; import type { Role } from "./data";
export type Session = { id: string; email: string; name: string; role: Role };
const rank: Record<Role, number> = { "Sales Rep": 1, Admin: 2, Developer: 3 };
export async function getSession(): Promise<Session | null> { const value = (await cookies()).get("distribu_session")?.value; if (!value) return null; try { return JSON.parse(Buffer.from(value, "base64url").toString()) as Session; } catch { return null; } }
export async function requireRole(role: Role) { const session = await getSession(); if (!session || rank[session.role] < rank[role]) redirect("/login"); return session; }
export async function setSession(session: Session) { (await cookies()).set("distribu_session", Buffer.from(JSON.stringify(session)).toString("base64url"), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 }); }
export async function clearSession() { (await cookies()).delete("distribu_session"); }