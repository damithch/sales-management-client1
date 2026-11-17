import Link from "next/link";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { FilterToggle } from "./panel";

export function StatCard({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note: string;
  accent: string;
}) {
  return (
    <div className="card h-full p-4 sm:p-5">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 sm:text-sm">
        <span className={`h-2 w-2 shrink-0 rounded-full ${accent}`} />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-2 text-lg font-bold tracking-tight sm:text-2xl">
        {value}
      </div>
      <div className="mt-1 text-xs leading-snug text-slate-500">{note}</div>
    </div>
  );
}

/** Downloads a list as an Excel file, carrying the page's current filters. */
export function ExportLink({
  kind,
  params = {},
}: {
  kind: string;
  params?: Record<string, string | null | undefined>;
}) {
  const search = new URLSearchParams({ kind });
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return (
    <a href={`/api/export?${search}`} className="btn-secondary">
      <Download size={16} />
      <span className="hidden sm:inline">Export</span> Excel
    </a>
  );
}

/**
 * A table on a computer. Pass `cards` to show a simpler list instead on
 * phones, where wide tables would need sideways scrolling.
 */
export function Table({
  head,
  children,
  empty,
  cards,
  align = {},
}: {
  head: string[];
  children: React.ReactNode;
  empty?: string | false;
  cards?: React.ReactNode;
  /** Column indexes to right-align (money and quantities). */
  align?: Record<number, "right">;
}) {
  if (empty) {
    return (
      <div className="card px-4 py-12 text-center text-sm text-slate-500">
        {empty}
      </div>
    );
  }
  return (
    <>
      {cards && <div className="space-y-2 lg:hidden">{cards}</div>}
      <div className={`card overflow-hidden ${cards ? "hidden lg:block" : ""}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr className="text-xs font-semibold text-slate-500">
                {head.map((label, index) => (
                  <th
                    key={index}
                    className={`whitespace-nowrap px-4 py-2.5 ${align[index] ? "text-right" : ""}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">{children}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function Td({
  children,
  className = "",
  right = false,
}: {
  children?: React.ReactNode;
  className?: string;
  right?: boolean;
}) {
  return (
    <td
      className={`px-4 py-3 ${right ? "whitespace-nowrap text-right" : ""} ${className}`}
    >
      {children}
    </td>
  );
}

/** One record as a card, for phone screens. */
export function ListCard({
  href,
  title,
  subtitle,
  value,
  valueNote,
  children,
}: {
  href?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  value?: React.ReactNode;
  valueNote?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">{title}</div>
          {subtitle && <div className="text-sm text-slate-500">{subtitle}</div>}
        </div>
        {value !== undefined && (
          <div className="shrink-0 text-right">
            <div className="font-semibold">{value}</div>
            {valueNote && (
              <div className="text-xs text-slate-500">{valueNote}</div>
            )}
          </div>
        )}
      </div>
      {children && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          {children}
        </div>
      )}
    </>
  );
  return href ? (
    <Link href={href} className="card block p-3.5 hover:border-slate-300">
      {body}
    </Link>
  ) : (
    <div className="card p-3.5">{body}</div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && (
        <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      )}
    </label>
  );
}

export function Badge({
  tone,
  children,
}: {
  tone: "green" | "red" | "slate" | "amber";
  children: React.ReactNode;
}) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    red: "bg-rose-50 text-rose-700 ring-rose-600/20",
    amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
    slate: "bg-slate-50 text-slate-600 ring-slate-500/20",
  };
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function StockBadge({ stock }: { stock: number }) {
  return (
    <Badge tone={stock < 0 ? "red" : stock === 0 ? "slate" : "green"}>
      {stock.toLocaleString("en-US")}
    </Badge>
  );
}

export function EditLink({ href }: { href: string }) {
  return (
    <Link href={href} className="link">
      Edit
    </Link>
  );
}

/** Previous / next page links, keeping the other query parameters. */
export function Pager({
  page,
  pageSize,
  total,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  params: Record<string, string | null | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    if (target > 1) search.set("page", String(target));
    const query = search.toString();
    return query ? `?${query}` : "?";
  };
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const arrow = (
    target: number,
    disabled: boolean,
    children: React.ReactNode,
    label: string,
  ) =>
    disabled ? (
      <span
        className="btn-secondary pointer-events-none opacity-40"
        aria-hidden
      >
        {children}
      </span>
    ) : (
      <Link href={href(target)} className="btn-secondary" aria-label={label}>
        {children}
      </Link>
    );
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-500">
      <span>
        {first.toLocaleString("en-US")}–{last.toLocaleString("en-US")} of{" "}
        {total.toLocaleString("en-US")}
      </span>
      <div className="flex gap-2">
        {arrow(page - 1, page <= 1, <ChevronLeft size={16} />, "Previous page")}
        {arrow(
          page + 1,
          page >= pages,
          <ChevronRight size={16} />,
          "Next page",
        )}
      </div>
    </div>
  );
}

type Option = { id: string; name: string };

/**
 * Date range plus optional brand, shop and rep filters, submitted as query
 * parameters. A select is shown only when its options are passed. On phones
 * the filters fold away behind a button.
 */
export function Filters({
  from,
  to,
  brandId = null,
  brands,
  shopId = null,
  shops,
  repId = null,
  reps,
  showDates = true,
}: {
  from?: string | null;
  to?: string | null;
  brandId?: string | null;
  brands?: Option[];
  shopId?: string | null;
  shops?: Option[];
  repId?: string | null;
  reps?: Option[];
  showDates?: boolean;
}) {
  const select = (
    name: string,
    label: string,
    all: string,
    value: string | null,
    options: Option[],
  ) => (
    <label className="min-w-0 flex-1 sm:flex-none">
      <span className="label">{label}</span>
      <select name={name} defaultValue={value ?? ""} className="input sm:w-44">
        <option value="">{all}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
  const active = [from, to, brandId, shopId, repId].filter(Boolean).length;
  return (
    <FilterToggle active={active}>
      <form className="card flex flex-wrap items-end gap-3 p-3">
        {showDates && (
          <>
            <label className="min-w-0 flex-1 sm:flex-none">
              <span className="label">From</span>
              <input
                type="date"
                name="from"
                defaultValue={from ?? ""}
                className="input"
              />
            </label>
            <label className="min-w-0 flex-1 sm:flex-none">
              <span className="label">To</span>
              <input
                type="date"
                name="to"
                defaultValue={to ?? ""}
                className="input"
              />
            </label>
          </>
        )}
        {brands && select("brand", "Brand", "All brands", brandId, brands)}
        {shops && select("shop", "Shop", "All shops", shopId, shops)}
        {reps && select("rep", "Sales rep", "All reps", repId, reps)}
        <div className="flex gap-2">
          <button className="btn-primary">Apply</button>
          {active > 0 && (
            <Link href="?" className="btn-ghost">
              Clear
            </Link>
          )}
        </div>
      </form>
    </FilterToggle>
  );
}
