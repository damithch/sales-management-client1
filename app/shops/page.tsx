import Link from "next/link";
import { createShop } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { Shell } from "@/components/shell";
import { ShopFields } from "@/components/shop-fields";
import { Badge, ExportLink, Table, Td } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { listShops } from "@/lib/queries";

export default async function Shops() {
  // Only Admins add or change shops; Sales Reps just pick them on a sale.
  const session = await requireRole("Admin");
  const shops = await listShops();
  return (
    <Shell session={session} title="Shops">
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <ActionForm action={createShop} submit="Add shop">
          <h2 className="font-bold">New shop</h2>
          <p className="text-sm text-slate-500">
            A retail shop you sell to. Sales reps choose it when they record a
            sale.
          </p>
          <ShopFields />
        </ActionForm>
        <div>
          <div className="mb-4 flex justify-end">
            <ExportLink kind="shops" />
          </div>
          <Table
            head={["Shop", "City", "Contact", "Phone", "Credit", "Status"]}
            empty={shops.length === 0 && "No shops yet."}
          >
            {shops.map((shop) => (
              <tr key={shop.id}>
                <Td className="font-semibold">
                  <Link
                    href={`/shops/${shop.id}`}
                    className="text-brand hover:underline"
                  >
                    {shop.name}
                  </Link>
                </Td>
                <Td className="text-slate-500">{shop.city}</Td>
                <Td>{shop.contact}</Td>
                <Td>{shop.phone}</Td>
                <Td className="whitespace-nowrap">{shop.credit_days} days</Td>
                <Td>
                  <Badge tone={shop.active ? "green" : "slate"}>
                    {shop.active ? "Active" : "Inactive"}
                  </Badge>
                </Td>
              </tr>
            ))}
          </Table>
        </div>
      </div>
    </Shell>
  );
}
