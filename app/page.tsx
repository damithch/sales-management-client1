import Link from "next/link";
import { Shell } from "@/components/shell";
import {
  ExportLink,
  Filters,
  StatCard,
  StockBadge,
  Table,
  Td,
} from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { readFilters, sixMonthsBefore, type SearchParams } from "@/lib/filters";
import { money, today, units } from "@/lib/format";
import {
  listDistributors,
  monthlyTrend,
  salesTotals,
  stockByDistributor,
  topProducts,
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
  const filters = { from, to, distributorId: chosen.distributorId };

  const [distributors, primary, secondary, stock, products, trend] =
    await Promise.all([
      listDistributors(),
      salesTotals("primary", filters),
      salesTotals("secondary", filters),
      stockByDistributor(filters),
      topProducts(filters),
      monthlyTrend(from, to, filters.distributorId),
    ]);

  const totalStock = stock.reduce((sum, row) => sum + row.stock, 0);
  const months = trend.slice(-12);
  const peak = Math.max(
    1,
    ...months.flatMap((row) => [row.primary_value, row.secondary_value]),
  );
  const topUnits = Math.max(1, ...products.map((row) => row.secondary_units));
  const isAdmin = hasRole(session.role, "Admin");

  return (
    <Shell session={session} title="Overview">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <Filters {...filters} distributors={distributors} />
        <ExportLink
          kind="stock"
          params={{ from, to, distributor: filters.distributorId }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Primary sales"
          value={money(primary.value)}
          note={`${units(primary.units)} units to distributors`}
          accent="bg-brand"
        />
        <StatCard
          label="Secondary sales"
          value={money(secondary.value)}
          note={`${units(secondary.units)} units sold on`}
          accent="bg-emerald-500"
        />
        <StatCard
          label="Stock at distributors"
          value={units(totalStock)}
          note={`Units held as at ${to}`}
          accent="bg-amber-500"
        />
        <StatCard
          label="Sell-through"
          value={
            primary.units > 0
              ? `${Math.round((secondary.units / primary.units) * 100)}%`
              : "–"
          }
          note="Secondary units as a share of primary"
          accent="bg-violet-500"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="card p-5">
          <h2 className="font-bold">Monthly trend</h2>
          <p className="mt-1 text-xs text-slate-400">Sales value per month</p>
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
          <h2 className="font-bold">Top products</h2>
          <p className="mt-1 text-xs text-slate-400">By secondary units sold</p>
          <div className="mt-5 space-y-4">
            {products.length === 0 && (
              <p className="text-sm text-slate-400">No sales in this period.</p>
            )}
            {products.map((row) => (
              <div key={row.id}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="truncate font-semibold">{row.name}</span>
                  <span className="font-bold">
                    {units(row.secondary_units)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                  <div
                    className="h-1.5 rounded-full bg-brand"
                    style={{
                      width: `${(row.secondary_units / topUnits) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="mb-1 mt-8 font-bold">Stock by distributor</h2>
      <p className="mb-4 text-xs text-slate-400">
        Units moved in the period, and stock held as at {to} (all primary less
        all secondary up to that date)
      </p>
      <Table
        head={[
          "Distributor",
          "City",
          "Primary units",
          "Secondary units",
          "Stock",
        ]}
        empty={stock.length === 0 && "No distributors yet."}
      >
        {stock.map((row) => (
          <tr key={row.id}>
            <Td className="font-semibold">
              {isAdmin ? (
                <Link
                  href={`/distributors/${row.id}`}
                  className="hover:underline"
                >
                  {row.name}
                </Link>
              ) : (
                row.name
              )}
            </Td>
            <Td className="text-slate-500">{row.city}</Td>
            <Td>{units(row.primary_units)}</Td>
            <Td>{units(row.secondary_units)}</Td>
            <Td>
              <StockBadge stock={row.stock} />
            </Td>
          </tr>
        ))}
      </Table>
    </Shell>
  );
}
