import Link from "next/link";
import { createDistributor } from "@/app/actions";
import { DistributorFields } from "@/components/distributor-fields";
import { ActionForm } from "@/components/forms";
import { Shell } from "@/components/shell";
import { ExportLink, StockBadge, Table, Td } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { listDistributors, stockByDistributor } from "@/lib/queries";

export default async function Distributors() {
  const session = await requireRole("Admin");
  const [distributors, stock] = await Promise.all([
    listDistributors(),
    stockByDistributor({}),
  ]);
  const stockById = new Map(stock.map((row) => [row.id, row.stock]));
  return (
    <Shell session={session} title="Distributors">
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <ActionForm action={createDistributor} submit="Add distributor">
          <h2 className="font-bold">New distributor</h2>
          <DistributorFields />
        </ActionForm>
        <div>
          <div className="mb-4 flex justify-end">
            <ExportLink kind="distributors" />
          </div>
          <Table
            head={["Name", "City", "Contact", "Phone", "Current stock"]}
            empty={distributors.length === 0 && "No distributors yet."}
          >
            {distributors.map((distributor) => (
              <tr
                key={distributor.id}
                className={distributor.active ? "" : "opacity-50"}
              >
                <Td className="font-semibold">
                  <Link
                    href={`/distributors/${distributor.id}`}
                    className="text-brand hover:underline"
                  >
                    {distributor.name}
                  </Link>
                  {!distributor.active && " (inactive)"}
                </Td>
                <Td className="text-slate-500">{distributor.city}</Td>
                <Td>{distributor.contact}</Td>
                <Td>{distributor.phone}</Td>
                <Td>
                  <StockBadge stock={stockById.get(distributor.id) ?? 0} />
                </Td>
              </tr>
            ))}
          </Table>
        </div>
      </div>
    </Shell>
  );
}
