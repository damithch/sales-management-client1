import { createProduct } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { ProductFields } from "@/components/product-fields";
import { Shell } from "@/components/shell";
import { Badge, EditLink, ExportLink, Table, Td } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { money } from "@/lib/format";
import { listProducts } from "@/lib/queries";

export default async function Products() {
  const session = await requireRole("Admin");
  const products = await listProducts();
  return (
    <Shell session={session} title="Products">
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <ActionForm action={createProduct} submit="Add product">
          <h2 className="font-bold">New product</h2>
          <ProductFields />
        </ActionForm>
        <div>
          <div className="mb-4 flex justify-end">
            <ExportLink kind="products" />
          </div>
          <Table
            head={[
              "Name",
              "SKU",
              "Category",
              "Unit",
              "List price",
              "Status",
              "",
            ]}
            empty={products.length === 0 && "No products yet."}
          >
            {products.map((product) => (
              <tr key={product.id}>
                <Td className="font-semibold">{product.name}</Td>
                <Td className="text-slate-500">{product.sku}</Td>
                <Td>{product.category}</Td>
                <Td>{product.unit}</Td>
                <Td>{money(product.price)}</Td>
                <Td>
                  <Badge tone={product.active ? "green" : "slate"}>
                    {product.active ? "Active" : "Inactive"}
                  </Badge>
                </Td>
                <Td>
                  <EditLink href={`/products/${product.id}`} />
                </Td>
              </tr>
            ))}
          </Table>
        </div>
      </div>
    </Shell>
  );
}
