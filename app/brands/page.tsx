import Link from "next/link";
import { createBrand } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { Shell } from "@/components/shell";
import {
  Badge,
  ExportLink,
  Field,
  StockBadge,
  Table,
  Td,
} from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { listBrands, stockByProduct } from "@/lib/queries";

export default async function Brands() {
  const session = await requireRole("Admin");
  const [brands, stock] = await Promise.all([listBrands(), stockByProduct({})]);

  const byBrand = new Map<string, { models: number; stock: number }>();
  for (const row of stock) {
    const entry = byBrand.get(row.brand ?? "") ?? { models: 0, stock: 0 };
    entry.models += 1;
    entry.stock += row.closing;
    byBrand.set(row.brand ?? "", entry);
  }

  return (
    <Shell session={session} title="Brands">
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <ActionForm action={createBrand} submit="Add brand">
          <h2 className="font-bold">New brand</h2>
          <p className="text-sm text-slate-500">
            A brand you buy and sell, e.g. TCL or Alcatel. Add its products on
            the Products page.
          </p>
          <Field label="Brand name">
            <input required name="name" className="input" />
          </Field>
        </ActionForm>
        <div>
          <div className="mb-4 flex justify-end">
            <ExportLink kind="brands" />
          </div>
          <Table
            head={["Brand", "Models", "Stock in hand", "Status"]}
            empty={brands.length === 0 && "No brands yet."}
          >
            {brands.map((brand) => {
              const summary = byBrand.get(brand.name) ?? {
                models: 0,
                stock: 0,
              };
              return (
                <tr key={brand.id}>
                  <Td className="font-semibold">
                    <Link
                      href={`/brands/${brand.id}`}
                      className="text-brand hover:underline"
                    >
                      {brand.name}
                    </Link>
                  </Td>
                  <Td>{summary.models}</Td>
                  <Td>
                    <StockBadge stock={summary.stock} />
                  </Td>
                  <Td>
                    <Badge tone={brand.active ? "green" : "slate"}>
                      {brand.active ? "Active" : "Inactive"}
                    </Badge>
                  </Td>
                </tr>
              );
            })}
          </Table>
        </div>
      </div>
    </Shell>
  );
}
