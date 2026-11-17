import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/app/actions";
import type { Session } from "@/lib/auth";
import { hasRole } from "@/lib/roles";
import { NavLinks, type NavItem } from "./nav";

function navFor(session: Session): NavItem[] {
  const items: NavItem[] = [{ href: "/", label: "Overview", icon: "overview" }];
  if (hasRole(session.role, "Admin")) {
    items.push(
      { href: "/brands", label: "Brands", icon: "brands" },
      { href: "/products", label: "Products", icon: "products" },
      { href: "/shops", label: "Shops", icon: "shops" },
      { href: "/primary-sales", label: "Primary sales", icon: "primary" },
    );
  }
  items.push(
    { href: "/secondary-sales", label: "Secondary sales", icon: "secondary" },
    { href: "/debtors", label: "Debtors", icon: "debtors" },
  );
  if (hasRole(session.role, "Admin")) {
    items.push({ href: "/users", label: "Users", icon: "users" });
  }
  if (hasRole(session.role, "Developer")) {
    items.push({ href: "/audit", label: "Audit log", icon: "audit" });
  }
  return items;
}

/** Page frame. Every page passes the session it got from requireRole(). */
export function Shell({
  session,
  title,
  description,
  actions,
  children,
}: {
  session: Session;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const items = navFor(session);
  const initials = session.name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const signOut = (
    <form action={logout}>
      <button
        title="Sign out"
        aria-label="Sign out"
        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <LogOut size={17} />
      </button>
    </form>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-5 lg:flex">
        <div className="mb-6 flex items-center gap-2.5 px-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm font-bold text-white">
            S
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold">Sales dashboard</div>
            <div className="text-xs text-slate-400">
              Primary &amp; secondary
            </div>
          </div>
        </div>
        <NavLinks items={items} layout="sidebar" />
        <div className="mt-auto flex items-center gap-2 rounded-lg border border-slate-200 p-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
            {initials}
          </div>
          <Link href="/account" className="min-w-0 flex-1 hover:underline">
            <div className="truncate text-sm font-semibold">{session.name}</div>
            <div className="text-xs text-slate-500">{session.role}</div>
          </Link>
          {signOut}
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5 lg:hidden">
          <div className="text-sm font-bold">Sales dashboard</div>
          <div className="flex items-center gap-1">
            <Link
              href="/account"
              aria-label="My account"
              className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600"
            >
              {initials}
            </Link>
            {signOut}
          </div>
        </div>
        <NavLinks items={items} layout="strip" />
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                {title}
              </h1>
              {description && (
                <p className="mt-1 text-sm text-slate-500">{description}</p>
              )}
            </div>
            {actions && (
              <div className="flex flex-wrap items-center gap-2">{actions}</div>
            )}
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
