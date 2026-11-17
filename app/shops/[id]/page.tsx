import Link from "next/link";
import { notFound } from "next/navigation";
import { updateShop } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { FormPanel } from "@/components/panel";
import { ActiveCheckbox } from "@/components/product-fields";
import { Shell } from "@/components/shell";
import { ShopFields } from "@/components/shop-fields";
import { Badge, ListCard, Table, Td } from "@/components/ui";
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
  const terms = (cash: boolean) => (
    <Badge tone={cash ? "green" : "amber"}>{cash ? "Cash" : "Credit"}</Badge>
  );

  return (
    <Shell
      session={session}
      title={shop.name}
      description={
        <>
          <Link href="/shops" className="link">
            ← Shops
          </Link>
          {" · "}
          {[
            shop.city,
            shop.contact,
            shop.phone,
            `${shop.credit_days} days credit`,
          ]
            .filter(Boolean)
            .join(" · ")}
          {!shop.active && " · inactive"}
        </>
      }
      actions={
        <>
          <Link href={`/debtors/${shop.id}`} className="btn-secondary">
            What this shop owes
          </Link>
          <FormPanel label="Edit shop" title={`Edit ${shop.name}`}>
            <ActionForm
              action={updateShop.bind(null, shop.id)}
              submit="Save changes"
              className="space-y-4"
            >
              <ShopFields shop={shop} />
              <ActiveCheckbox
                active={shop.active}
                label="Active (can be chosen on new sales)"
              />
            </ActionForm>
          </FormPanel>
        </>
      }
    >
      <h2 className="mb-3 font-semibold">Latest sales to this shop</h2>
      <Table
        head={["Date", "Product", "Qty", "Payment", "Value", "Entered by"]}
        align={{ 2: "right", 4: "right" }}
        empty={sales.length === 0 && "Nothing sold to this shop yet."}
        cards={sales.map((sale) => (
          <ListCard
            key={sale.id}
            title={productLabel(sale)}
            subtitle={`${sale.sale_date} · ${units(sale.quantity)} × ${money(sale.price)}`}
            value={money(sale.quantity * sale.price)}
          >
            {terms(sale.payment_terms === "cash")}
            <span>by {sale.entered_by}</span>
          </ListCard>
        ))}
      >
        {sales.map((sale) => (
          <tr key={sale.id} className="hover:bg-slate-50">
            <Td className="whitespace-nowrap text-slate-500">
              {sale.sale_date}
            </Td>
            <Td className="font-medium">{productLabel(sale)}</Td>
            <Td right>{units(sale.quantity)}</Td>
            <Td>{terms(sale.payment_terms === "cash")}</Td>
            <Td right>{money(sale.quantity * sale.price)}</Td>
            <Td className="whitespace-nowrap text-slate-500">
              {sale.entered_by}
            </Td>
          </tr>
        ))}
      </Table>
    </Shell>
  );
}
