import Link from "next/link";
import { Shell } from "@/components/shell";
import { ExportLink, StatCard, Table, Td } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { debtorsByShop, debtorTotals, type DebtorRow } from "@/lib/debtors";
import type { SearchParams } from "@/lib/filters";
import { money, parseId, today } from "@/lib/format";
import { listReps } from "@/lib/queries";
import { hasRole } from "@/lib/roles";

const amount = (value: number) => (value > 0 ? money(value) : "–");

export default async function Debtors({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireRole("Sales Rep");
  const isAdmin = hasRole(session.role, "Admin");
  const params = await searchParams;
  const overdueOnly = params.overdue === "1";
  // Admins can pick a rep. Reps see their own sales unless they ask for all
  // shops, which they need when collecting from a shop another rep sold to.
  const allShops = params.all === "1";
  const repId = isAdmin ? parseId(params.rep) : allShops ? null : session.id;
  const asOf = today();

  const [rows, totals, reps] = await Promise.all([
    debtorsByShop({ asOf, repId }),
    debtorTotals({ asOf, repId }),
    isAdmin ? listReps() : Promise.resolve([]),
  ]);
  const shown = overdueOnly ? rows.filter((row) => row.overdue > 0) : rows;
  const sum = (key: keyof DebtorRow) =>
    shown.reduce((total, row) => total + Number(row[key] ?? 0), 0);

  const link = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams();
    const current: Record<string, string | null> = {
      overdue: overdueOnly ? "1" : null,
      rep: isAdmin ? repId : null,
      all: !isAdmin && allShops ? "1" : null,
      ...changes,
    };
    for (const [key, value] of Object.entries(current)) {
      if (value) next.set(key, value);
    }
    const query = next.toString();
    return query ? `/debtors?${query}` : "/debtors";
  };
  const tab = (label: string, href: string, active: boolean) => (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm font-semibold ${
        active ? "bg-indigo-50 text-brand" : "text-slate-500 hover:bg-slate-100"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <Shell session={session} title="Debtors">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Overdue"
          value={money(totals.overdue)}
          note={`${totals.overdue_shops} ${totals.overdue_shops === 1 ? "shop" : "shops"} past their credit period`}
          accent="bg-rose-500"
        />
        <StatCard
          label="Total owed by shops"
          value={money(totals.outstanding)}
          note="Unpaid credit sales, due or not"
          accent="bg-amber-500"
        />
        <StatCard
          label="Not yet due"
          value={money(totals.outstanding - totals.overdue)}
          note="Still within the credit period"
          accent="bg-emerald-500"
        />
      </div>

      <div className="mb-4 mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1">
          {tab("All debtors", link({ overdue: null }), !overdueOnly)}
          {tab("Overdue only", link({ overdue: "1" }), overdueOnly)}
          {!isAdmin && (
            <>
              <span className="mx-2 h-5 w-px bg-slate-200" />
              {tab("My sales", link({ all: null }), !allShops)}
              {tab("All shops", link({ all: "1" }), allShops)}
            </>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {isAdmin && (
            <form className="flex items-end gap-2">
              {overdueOnly && <input type="hidden" name="overdue" value="1" />}
              <label>
                <span className="label">Sales rep</span>
                <select name="rep" defaultValue={repId ?? ""} className="input">
                  <option value="">All reps</option>
                  {reps.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn-secondary">Apply</button>
            </form>
          )}
          <ExportLink
            kind="debtors"
            params={{ rep: repId, overdue: overdueOnly ? "1" : null }}
          />
        </div>
      </div>

      <Table
        head={[
          "Shop",
          "Not yet due",
          "1–30 days",
          "31–60 days",
          "61–90 days",
          "Over 90 days",
          "Total owed",
          "",
        ]}
        empty={
          shown.length === 0 &&
          (overdueOnly ? "No shop is overdue." : "No shop owes anything.")
        }
      >
        {shown.map((row) => (
          <tr key={row.shop_id}>
            <Td className="font-semibold">
              <Link
                href={`/debtors/${row.shop_id}`}
                className="text-brand hover:underline"
              >
                {row.shop}
              </Link>
              <div className="text-xs font-normal text-slate-400">
                {[row.city, row.phone].filter(Boolean).join(" · ")}
              </div>
            </Td>
            <Td className="whitespace-nowrap">{amount(row.not_due)}</Td>
            <Td className="whitespace-nowrap">{amount(row.d1_30)}</Td>
            <Td className="whitespace-nowrap">{amount(row.d31_60)}</Td>
            <Td className="whitespace-nowrap">{amount(row.d61_90)}</Td>
            <Td className="whitespace-nowrap">{amount(row.d90_plus)}</Td>
            <Td className="whitespace-nowrap font-semibold">
              {money(row.outstanding)}
              {row.oldest_overdue_days !== null && (
                <div className="text-xs font-normal text-rose-600">
                  oldest {row.oldest_overdue_days} days overdue
                </div>
              )}
            </Td>
            <Td>
              <Link
                href={`/debtors/${row.shop_id}`}
                className="whitespace-nowrap font-semibold text-brand hover:underline"
              >
                Collect
              </Link>
            </Td>
          </tr>
        ))}
        {shown.length > 1 && (
          <tr className="bg-slate-50 font-semibold">
            <Td>Total</Td>
            <Td className="whitespace-nowrap">{amount(sum("not_due"))}</Td>
            <Td className="whitespace-nowrap">{amount(sum("d1_30"))}</Td>
            <Td className="whitespace-nowrap">{amount(sum("d31_60"))}</Td>
            <Td className="whitespace-nowrap">{amount(sum("d61_90"))}</Td>
            <Td className="whitespace-nowrap">{amount(sum("d90_plus"))}</Td>
            <Td className="whitespace-nowrap">{money(sum("outstanding"))}</Td>
            <Td />
          </tr>
        )}
      </Table>
      <p className="mt-3 text-xs text-slate-400">
        As at {asOf}. Ages count days past each sale&apos;s due date.
        Collections pay off a shop&apos;s oldest credit sales first.
        {!isAdmin &&
          !allShops &&
          " Showing credit sales you made; choose All shops to collect for any shop."}
      </p>
    </Shell>
  );
}
