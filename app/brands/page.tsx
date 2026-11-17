import Link from "next/link";
import { createBrand } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { FormPanel } from "@/components/panel";
import { Shell } from "@/components/shell";
import {
  Badge,
  ExportLink,
  Field,
  ListCard,
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
  const summary = (name: string) =>
    byBrand.get(name) ?? { models: 0, stock: 0 };

  return (
    <Shell
      session={session}
      title="Brands"
      description="The brands you buy and sell. Open one to see its stock by model."
      actions={
        <>
          <ExportLink kind="brands" />
          <FormPanel
            label="Add brand"
            title="New brand"
            description="Add its products afterwards on the Products page"
          >
            <ActionForm
              action={createBrand}
              submit="Add brand"
              className="space-y-4"
            >
              <Field label="Brand name">
                <input
                  required
                  name="name"
                  placeholder="e.g. TCL"
                  className="input"
                />
              </Field>
            </ActionForm>
          </FormPanel>
        </>
      }
    >
      <Table
        head={["Brand", "Models", "Stock in hand", "Status"]}
        align={{ 1: "right", 2: "right" }}
        empty={brands.length === 0 && "No brands yet. Add your first brand."}
        cards={brands.map((brand) => (
          <ListCard
            key={brand.id}
            href={`/brands/${brand.id}`}
            title={brand.name}
            subtitle={`${summary(brand.name).models} models`}
            value={<StockBadge stock={summary(brand.name).stock} />}
            valueNote="in hand"
          >
            {!brand.active && <Badge tone="slate">Inactive</Badge>}
          </ListCard>
        ))}
      >
        {brands.map((brand) => (
          <tr key={brand.id} className="hover:bg-slate-50">
            <Td>
              <Link href={`/brands/${brand.id}`} className="link">
                {brand.name}
              </Link>
            </Td>
            <Td right>{summary(brand.name).models}</Td>
            <Td right>
              <StockBadge stock={summary(brand.name).stock} />
            </Td>
            <Td>
              <Badge tone={brand.active ? "green" : "slate"}>
                {brand.active ? "Active" : "Inactive"}
              </Badge>
            </Td>
          </tr>
        ))}
      </Table>
    </Shell>
  );
}
