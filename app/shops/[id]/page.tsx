import Link from "next/link";
import { notFound } from "next/navigation";
import { updateShop } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { ActiveCheckbox } from "@/components/product-fields";
import { Shell } from "@/components/shell";
import { ShopFields } from "@/components/shop-fields";
import { Table, Td } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { money, parseId, units } from "@/lib/format";
import { getShop, listSales, productLabel } from "@/lib/queries";

export default async function ShopDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("Admin");
  const id = parseId((await params).id);
  const shop = id && (await getShop(id));
  if (!shop) notFound();
  const sales = await listSales("secondary", { shopId: shop.id }, 50);

  return (
    <Shell session={session} title={shop.name}>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <ActionForm
          action={updateShop.bind(null, shop.id)}
          submit="Save changes"
        >
          <ShopFields shop={shop} />
          <ActiveCheckbox
            active={shop.active}
            label="Active (can be chosen on new sales)"
          />
        </ActionForm>
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-bold">Latest sales to this shop</h2>
            <Link
              href={`/debtors/${shop.id}`}
              className="text-sm font-semibold text-brand hover:underline"
            >
              What this shop owes
            </Link>
          </div>
          <Table
            head={[
              "Date",
              "Product",
              "Quantity",
              "Terms",
              "Value",
              "Entered by",
            ]}
            empty={sales.length === 0 && "Nothing sold to this shop yet."}
          >
            {sales.map((sale) => (
              <tr key={sale.id}>
                <Td className="whitespace-nowrap text-slate-500">
                  {sale.sale_date}
                </Td>
                <Td>{productLabel(sale)}</Td>
                <Td>{units(sale.quantity)}</Td>
                <Td className="capitalize">{sale.payment_terms}</Td>
                <Td className="whitespace-nowrap">
                  {money(sale.quantity * sale.price)}
                </Td>
                <Td className="text-slate-500">{sale.entered_by}</Td>
              </tr>
            ))}
          </Table>
        </section>
      </div>
    </Shell>
  );
}
