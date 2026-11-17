import Link from "next/link";
import { Download } from "lucide-react";

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
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
      </div>
      <div className="text-2xl font-bold tracking-tight sm:text-3xl">
        {value}
      </div>
      <div className="mt-2 text-xs text-slate-500">{note}</div>
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
      <Download size={16} className="mr-2" />
      Export Excel
    </a>
  );
}

export function Table({
  head,
  children,
  empty,
}: {
  head: string[];
  children: React.ReactNode;
  empty?: string | false;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
              {head.map((label, index) => (
                <th key={index} className="whitespace-nowrap px-4 py-3">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">{children}</tbody>
        </table>
      </div>
      {empty && (
        <p className="px-4 py-8 text-center text-sm text-slate-400">{empty}</p>
      )}
    </div>
  );
}

export function Td({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function Badge({
  tone,
  children,
}: {
  tone: "green" | "red" | "slate";
  children: React.ReactNode;
}) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-rose-50 text-rose-700",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function StockBadge({ stock }: { stock: number }) {
  return (
    <Badge tone={stock < 0 ? "red" : stock === 0 ? "slate" : "green"}>
      {stock.toLocaleString("en-US")} units
    </Badge>
  );
}

export function EditLink({ href }: { href: string }) {
  return (
    <Link href={href} className="font-semibold text-brand hover:underline">
      Edit
    </Link>
  );
}

type Option = { id: string; name: string };

/**
 * Date range plus optional brand, shop and rep filters, submitted as query
 * parameters. A select is shown only when its options are passed.
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
}: {
  from: string | null;
  to: string | null;
  brandId?: string | null;
  brands?: Option[];
  shopId?: string | null;
  shops?: Option[];
  repId?: string | null;
  reps?: Option[];
}) {
  const select = (
    name: string,
    label: string,
    all: string,
    value: string | null,
    options: Option[],
  ) => (
    <label>
      <span className="label">{label}</span>
      <select name={name} defaultValue={value ?? ""} className="input">
        <option value="">{all}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <form className="flex flex-wrap items-end gap-3">
      <label>
        <span className="label">From</span>
        <input
          type="date"
          name="from"
          defaultValue={from ?? ""}
          className="input"
        />
      </label>
      <label>
        <span className="label">To</span>
        <input
          type="date"
          name="to"
          defaultValue={to ?? ""}
          className="input"
        />
      </label>
      {brands && select("brand", "Brand", "All brands", brandId, brands)}
      {shops && select("shop", "Shop", "All shops", shopId, shops)}
      {reps && select("rep", "Sales rep", "All reps", repId, reps)}
      <button className="btn-secondary">Apply</button>
    </form>
  );
}
