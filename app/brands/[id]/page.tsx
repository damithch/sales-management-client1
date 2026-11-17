import { notFound } from "next/navigation";
import { updateBrand } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { ActiveCheckbox } from "@/components/product-fields";
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
    <Shell session={session} title={brand.name}>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <ActionForm
          action={updateBrand.bind(null, brand.id)}
          submit="Save changes"
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
        <section className="min-w-0">
          <h2 className="mb-3 font-bold">Stock in hand by model</h2>
          <StockTable rows={stock} showBrand={false} />
        </section>
      </div>
    </Shell>
  );
}
