import { notFound } from "next/navigation";
import { updateProduct } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { ActiveCheckbox, ProductFields } from "@/components/product-fields";
import { Shell } from "@/components/shell";
import { requireRole } from "@/lib/auth";
import { parseId } from "@/lib/format";
import { getProduct } from "@/lib/queries";

export default async function EditProduct({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("Admin");
  const id = parseId((await params).id);
  const product = id && (await getProduct(id));
  if (!product) notFound();
  return (
    <Shell session={session} title="Edit product">
      <div className="max-w-md">
        <ActionForm
          action={updateProduct.bind(null, product.id)}
          submit="Save changes"
        >
          <ProductFields product={product} />
          <ActiveCheckbox
            active={product.active}
            label="Active (can be chosen on new sales)"
          />
        </ActionForm>
      </div>
    </Shell>
  );
}
