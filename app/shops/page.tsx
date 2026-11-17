import Link from "next/link";
import { createShop } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { FormPanel } from "@/components/panel";
import { Shell } from "@/components/shell";
import { ShopFields } from "@/components/shop-fields";
import { Badge, ExportLink, ListCard, Table, Td } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { listShops } from "@/lib/queries";

export default async function Shops() {
  // Only Admins add or change shops; Sales Reps just pick them on a sale.
  const session = await requireRole("Admin");
  const shops = await listShops();
  return (
    <Shell
      session={session}
      title="Shops"
      description="Retail shops you sell to. Sales reps choose them when recording a sale."
      actions={
        <>
          <ExportLink kind="shops" />
          <FormPanel label="Add shop" title="New shop">
            <ActionForm
              action={createShop}
              submit="Add shop"
              className="space-y-4"
            >
              <ShopFields />
            </ActionForm>
          </FormPanel>
        </>
      }
    >
      <Table
        head={["Shop", "City", "Contact", "Phone", "Credit", "Status"]}
        empty={shops.length === 0 && "No shops yet. Add the shops you sell to."}
        cards={shops.map((shop) => (
          <ListCard
            key={shop.id}
            href={`/shops/${shop.id}`}
            title={shop.name}
            subtitle={[shop.city, shop.contact].filter(Boolean).join(" · ")}
            value={`${shop.credit_days} days`}
            valueNote="credit"
          >
            {shop.phone && <span>{shop.phone}</span>}
            {!shop.active && <Badge tone="slate">Inactive</Badge>}
          </ListCard>
        ))}
      >
        {shops.map((shop) => (
          <tr key={shop.id} className="hover:bg-slate-50">
            <Td>
              <Link href={`/shops/${shop.id}`} className="link">
                {shop.name}
              </Link>
            </Td>
            <Td className="text-slate-600">{shop.city || "–"}</Td>
            <Td>{shop.contact || "–"}</Td>
            <Td className="whitespace-nowrap">{shop.phone || "–"}</Td>
            <Td className="whitespace-nowrap">{shop.credit_days} days</Td>
            <Td>
              <Badge tone={shop.active ? "green" : "slate"}>
                {shop.active ? "Active" : "Inactive"}
              </Badge>
            </Td>
          </tr>
        ))}
      </Table>
    </Shell>
  );
}
