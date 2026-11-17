import { notFound } from "next/navigation";
import { updateProduct } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { ActiveCheckbox, ProductFields } from "@/components/product-fields";
import { Shell } from "@/components/shell";
import { requireRole } from "@/lib/auth";
import { parseId } from "@/lib/format";
import { getProduct, listBrands, productLabel } from "@/lib/queries";

export default async function EditProduct({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("Admin");
  const id = parseId((await params).id);
  const product = id && (await getProduct(id));
  if (!product) notFound();
  // Keep the product's current brand choosable even if it is now inactive.
  const brands = (await listBrands()).filter(
    (brand) => brand.active || brand.id === product.brand_id,
  );
  return (
    <Shell session={session} title={`Edit ${productLabel(product)}`}>
      <div className="max-w-md">
        <ActionForm
          action={updateProduct.bind(null, product.id)}
          submit="Save changes"
        >
          <ProductFields product={product} brands={brands} />
          <ActiveCheckbox
            active={product.active}
            label="Active (can be chosen on new sales)"
          />
        </ActionForm>
        <p className="mt-3 text-xs text-slate-400">
          Changing a price affects new sales only. Sales already recorded keep
          the price they were entered at.
        </p>
      </div>
    </Shell>
  );
}
