"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  History,
  Package,
  Store,
  Tags,
  Users,
  Wallet,
} from "lucide-react";

const icons = {
  overview: BarChart3,
  products: Package,
  brands: Tags,
  shops: Store,
  primary: ClipboardList,
  secondary: Boxes,
  debtors: Wallet,
  users: Users,
  audit: History,
};

export type NavItem = { href: string; label: string; icon: keyof typeof icons };

/** Vertical list in the desktop sidebar, horizontal scrolling strip on phones. */
export function NavLinks({
  items,
  layout,
}: {
  items: NavItem[];
  layout: "sidebar" | "strip";
}) {
  const path = usePathname();
  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);

  if (layout === "strip") {
    return (
      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 lg:hidden">
        {items.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
              isActive(href) ? "bg-indigo-50 text-brand" : "text-slate-500"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <nav className="space-y-1">
      {items.map(({ href, label, icon }) => {
        const Icon = icons[icon];
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
              isActive(href)
                ? "bg-indigo-50 text-brand"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
