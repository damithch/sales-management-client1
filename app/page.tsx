import Link from "next/link";
import { Shell } from "@/components/shell";
import { StockTable } from "@/components/stock-table";
import { ExportLink, Filters, StatCard } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { debtorTotals } from "@/lib/debtors";
import { readFilters, sixMonthsBefore, type SearchParams } from "@/lib/filters";
import { money, today, units } from "@/lib/format";
import {
  listBrands,
  monthlyTrend,
  salesByProduct,
  salesTotals,
  secondaryProfit,
  stockByProduct,
} from "@/lib/queries";
import { hasRole } from "@/lib/roles";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireRole("Sales Rep");
  const chosen = await readFilters(searchParams);
  // Default view: the last six calendar months up to today.
  const to = chosen.to ?? today();
  const from = chosen.from ?? sixMonthsBefore(to);
  const filters = { from, to, brandId: chosen.brandId };

  const isAdmin = hasRole(session.role, "Admin");
  const [brands, purchases, sales, profit, stock, byProduct, trend, debts] =
    await Promise.all([
      listBrands(),
      salesTotals("primary", filters),
      salesTotals("secondary", filters),
      secondaryProfit(filters),
      stockByProduct(filters),
      salesByProduct(filters),
      monthlyTrend(from, to, filters.brandId),
      // Debts are as at today, whatever the date filter; reps see their own.
      debtorTotals({ asOf: today(), repId: isAdmin ? null : session.id }),
    ]);

  const stockInHand = stock.reduce((sum, row) => sum + row.closing, 0);
  const stockValue = stock.reduce(
    (sum, row) => sum + Math.max(row.closing, 0) * (row.rd_cash ?? 0),
    0,
  );
  const grossProfit = profit.revenue - profit.cost;
  const margin =
    profit.revenue > 0 ? (grossProfit / profit.revenue) * 100 : null;

  // Top products, grouped by brand, brands ordered by units sold.
  const brandGroups = new Map<
    string,
    { units: number; rows: typeof byProduct }
  >();
  for (const row of byProduct) {
    const key = row.brand ?? "No brand";
    const group = brandGroups.get(key) ?? { units: 0, rows: [] };
    group.units += row.sold_units;
    group.rows.push(row);
    brandGroups.set(key, group);
  }
  const groups = [...brandGroups.entries()].sort(
    (a, b) => b[1].units - a[1].units,
  );
  const topUnits = Math.max(1, ...byProduct.map((row) => row.sold_units));

  const months = trend.slice(-12);
  const peak = Math.max(
    1,
    ...months.flatMap((row) => [row.primary_value, row.secondary_value]),
  );

  return (
    <Shell session={session} title="Overview">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <Filters
          from={from}
          to={to}
          brandId={filters.brandId}
          brands={brands}
        />
        <ExportLink
          kind="stock"
          params={{ from, to, brand: filters.brandId }}
        />
      </div>

      <div
        className={`grid gap-4 sm:grid-cols-2 ${isAdmin ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}
      >
        <StatCard
          label="Primary sales (purchases)"
          value={money(purchases.value)}
          note={`${units(purchases.units)} units bought`}
          accent="bg-brand"
        />
        <StatCard
          label="Secondary sales"
          value={money(sales.value)}
          note={`${units(sales.units)} units sold to shops`}
          accent="bg-emerald-500"
        />
        <StatCard
          label="Stock in hand"
          value={units(stockInHand)}
          note={`Units as at ${to} · ${money(stockValue)} at RD cash price`}
          accent="bg-amber-500"
        />
        <Link
          href="/debtors?overdue=1"
          className="rounded-2xl outline-none ring-brand/30 hover:ring-4 focus-visible:ring-4"
        >
          <StatCard
            label="Overdue from shops"
            value={money(debts.overdue)}
            note={`${debts.overdue_shops} ${debts.overdue_shops === 1 ? "shop" : "shops"} · ${money(debts.outstanding)} owed in total · tap to see who`}
            accent="bg-rose-500"
          />
        </Link>
        {isAdmin && (
          <StatCard
            label="Gross profit (estimate)"
            value={money(grossProfit)}
            note={
              (margin === null
                ? "No costed sales yet"
                : `${margin.toFixed(1)}% margin`) +
              (profit.uncosted_units > 0
                ? ` · ${units(profit.uncosted_units)} units without an RD price left out`
                : "")
            }
            accent="bg-violet-500"
          />
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="card p-5">
          <h2 className="font-bold">Monthly trend</h2>
          <p className="mt-1 text-xs text-slate-400">Value per month</p>
          <div className="mt-4 flex h-56 items-end gap-2 border-b border-slate-100 sm:gap-4">
            {months.map((row) => (
              <div
                key={row.month}
                className="flex h-full flex-1 flex-col justify-end"
              >
                <div className="flex h-full items-end justify-center gap-1">
                  <div
                    title={`Primary ${money(row.primary_value)}`}
                    style={{ height: `${(row.primary_value / peak) * 100}%` }}
                    className="w-1/3 rounded-t bg-brand"
                  />
                  <div
                    title={`Secondary ${money(row.secondary_value)}`}
                    style={{ height: `${(row.secondary_value / peak) * 100}%` }}
                    className="w-1/3 rounded-t bg-emerald-400"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 sm:gap-4">
            {months.map((row) => (
              <span
                key={row.month}
                className="flex-1 pt-2 text-center text-[11px] text-slate-400"
              >
                {row.month.slice(2)}
              </span>
            ))}
          </div>
          <div className="mt-4 flex gap-5 text-xs text-slate-500">
            <span>
              <i className="mr-2 inline-block h-2 w-2 rounded-full bg-brand" />
              Primary
            </span>
            <span>
              <i className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400" />
              Secondary
            </span>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-bold">Top products by brand</h2>
          <p className="mt-1 text-xs text-slate-400">Units sold to shops</p>
          <div className="mt-5 space-y-5">
            {groups.length === 0 && (
              <p className="text-sm text-slate-400">No sales in this period.</p>
            )}
            {groups.map(([brand, group]) => (
              <div key={brand}>
                <div className="mb-2 flex justify-between text-xs font-bold uppercase tracking-wide text-slate-500">
                  <span>{brand}</span>
                  <span>{units(group.units)}</span>
                </div>
                <div className="space-y-3">
                  {group.rows.slice(0, 5).map((row) => (
                    <div key={row.id}>
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="truncate font-semibold">
                          {row.model}
                          {row.capacity && (
                            <span className="font-normal text-slate-400">
                              {" "}
                              {row.capacity}
                            </span>
                          )}
                        </span>
                        <span className="font-bold">
                          {units(row.sold_units)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                        <div
                          className="h-1.5 rounded-full bg-brand"
                          style={{
                            width: `${(row.sold_units / topUnits) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="mb-1 mt-8 font-bold">Stock in hand by model</h2>
      <p className="mb-4 text-xs text-slate-400">
        Opening stock at {from}, plus purchases, less sales to shops, gives
        stock in hand at {to}.
        {isAdmin && (
          <>
            {" "}
            Set opening stock on each{" "}
            <Link href="/products" className="text-brand hover:underline">
              product
            </Link>
            .
          </>
        )}
      </p>
      <StockTable rows={stock} />
    </Shell>
  );
}
