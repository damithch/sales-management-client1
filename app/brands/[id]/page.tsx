import Link from "next/link";
import { notFound } from "next/navigation";
import { updateBrand } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { ActiveCheckbox } from "@/components/product-fields";
import { FormPanel } from "@/components/panel";
import { Shell } from "@/components/shell";
import { StockTable } from "@/components/stock-table";
import { Field } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { parseId } from "@/lib/format";
import { getBrand, stockByProduct } from "@/lib/queries";

export default async function BrandDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("Admin");
  const id = parseId((await params).id);
  const brand = id && (await getBrand(id));
  if (!brand) notFound();
  const stock = await stockByProduct({ brandId: brand.id });

  return (
    <Shell
      session={session}
      title={brand.name}
      description={
        <>
          <Link href="/brands" className="link">
            ← Brands
          </Link>
          {" · Stock in hand by model, all time"}
          {!brand.active && " · inactive"}
        </>
      }
      actions={
        <>
          <Link href={`/products?brand=${brand.id}`} className="btn-secondary">
            Products and prices
          </Link>
          <FormPanel label="Edit brand" title={`Edit ${brand.name}`}>
            <ActionForm
              action={updateBrand.bind(null, brand.id)}
              submit="Save changes"
              className="space-y-4"
            >
              <Field label="Brand name">
                <input
                  required
                  name="name"
                  defaultValue={brand.name}
                  className="input"
                />
              </Field>
              <ActiveCheckbox
                active={brand.active}
                label="Active (its products can be chosen on new sales)"
              />
            </ActionForm>
          </FormPanel>
        </>
      }
    >
      <StockTable rows={stock} showBrand={false} />
    </Shell>
  );
}
