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
  items.push({
    href: "/secondary-sales",
    label: "Secondary sales",
    icon: "secondary",
  });
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
  children,
}: {
  session: Session;
  title: string;
  children: React.ReactNode;
}) {
  const items = navFor(session);
  const account = (
    <>
      <Link href="/account" className="min-w-0 flex-1 hover:underline">
        <div className="truncate text-sm font-semibold">{session.name}</div>
        <div className="text-xs text-slate-500">{session.role}</div>
      </Link>
      <form action={logout}>
        <button
          title="Sign out"
          aria-label="Sign out"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <LogOut size={17} />
        </button>
      </form>
    </>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 lg:flex">
        <div className="mb-8 px-3">
          <div className="font-bold tracking-tight">Sales dashboard</div>
          <div className="text-xs text-slate-400">Primary and secondary</div>
        </div>
        <NavLinks items={items} layout="sidebar" />
        <div className="mt-auto flex items-center gap-2 rounded-xl bg-slate-50 p-3">
          {account}
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {title}
          </h1>
          <div className="flex items-center gap-2 lg:hidden">{account}</div>
        </header>
        <NavLinks items={items} layout="strip" />
        <div className="p-4 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
