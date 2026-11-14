import { notFound } from "next/navigation";
import { updateDistributor } from "@/app/actions";
import { DistributorFields } from "@/components/distributor-fields";
import { ActionForm } from "@/components/forms";
import { ActiveCheckbox } from "@/components/product-fields";
import { Shell } from "@/components/shell";
import { StockBadge, Table, Td } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { money, parseId, units } from "@/lib/format";
import {
  getDistributor,
  listSales,
  stockByProduct,
  type Sale,
} from "@/lib/queries";

function History({ title, sales }: { title: string; sales: Sale[] }) {
  return (
    <section>
      <h2 className="mb-3 font-bold">{title}</h2>
      <Table
        head={["Date", "Product", "Quantity", "Value"]}
        empty={sales.length === 0 && "Nothing recorded yet."}
      >
        {sales.map((sale) => (
          <tr key={sale.id}>
            <Td className="whitespace-nowrap text-slate-500">
              {sale.sale_date}
            </Td>
            <Td>{sale.product}</Td>
            <Td>{units(sale.quantity)}</Td>
            <Td>{money(sale.quantity * sale.price)}</Td>
          </tr>
        ))}
      </Table>
    </section>
  );
}

export default async function DistributorDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("Admin");
  const id = parseId((await params).id);
  const distributor = id && (await getDistributor(id));
  if (!distributor) notFound();

  const [stock, primary, secondary] = await Promise.all([
    stockByProduct(distributor.id),
    listSales("primary", { distributorId: distributor.id }, 50),
    listSales("secondary", { distributorId: distributor.id }, 50),
  ]);

  return (
    <Shell session={session} title={distributor.name}>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <ActionForm
          action={updateDistributor.bind(null, distributor.id)}
          submit="Save changes"
        >
          <h2 className="font-bold">Details</h2>
          <DistributorFields distributor={distributor} />
          <ActiveCheckbox
            active={distributor.active}
            label="Active (can be chosen on new sales)"
          />
        </ActionForm>
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 font-bold">Current stock by product</h2>
            <Table
              head={[
                "Product",
                "SKU",
                "Primary units",
                "Secondary units",
                "Stock",
              ]}
              empty={stock.length === 0 && "No sales recorded yet."}
            >
              {stock.map((row) => (
                <tr key={row.id}>
                  <Td className="font-semibold">{row.name}</Td>
                  <Td className="text-slate-500">{row.sku}</Td>
                  <Td>{units(row.primary_units)}</Td>
                  <Td>{units(row.secondary_units)}</Td>
                  <Td>
                    <StockBadge stock={row.stock} />
                  </Td>
                </tr>
              ))}
            </Table>
          </section>
          <History title="Latest primary sales" sales={primary} />
          <History title="Latest secondary sales" sales={secondary} />
        </div>
      </div>
    </Shell>
  );
}
