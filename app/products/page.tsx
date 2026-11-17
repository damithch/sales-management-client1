import Link from "next/link";
import { createProduct } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { ProductFields } from "@/components/product-fields";
import { Shell } from "@/components/shell";
import { Badge, EditLink, ExportLink, Table, Td } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { readFilters, type SearchParams } from "@/lib/filters";
import { money } from "@/lib/format";
import { listBrands, listProducts } from "@/lib/queries";

const price = (value: number | null) => (value === null ? "–" : money(value));

export default async function Products({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireRole("Admin");
  const { brandId } = await readFilters(searchParams);
  const [brands, products] = await Promise.all([
    listBrands(),
    listProducts({ brandId }),
  ]);
  const activeBrands = brands.filter((brand) => brand.active);

  return (
    <Shell session={session} title="Products">
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {activeBrands.length === 0 ? (
          <div className="card space-y-3 p-5 text-sm">
            <h2 className="font-bold">New product</h2>
            <p className="text-slate-500">
              Add a brand first, then its products.
            </p>
            <Link href="/brands" className="btn-primary w-full">
              Add a brand
            </Link>
          </div>
        ) : (
          <ActionForm action={createProduct} submit="Add product">
            <h2 className="font-bold">New product</h2>
            <ProductFields brands={activeBrands} />
          </ActionForm>
        )}
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <form className="flex items-end gap-3">
              <label>
                <span className="label">Brand</span>
                <select
                  name="brand"
                  defaultValue={brandId ?? ""}
                  className="input"
                >
                  <option value="">All brands</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn-secondary">Apply</button>
            </form>
            <ExportLink kind="products" params={{ brand: brandId }} />
          </div>
          <Table
            head={[
              "Brand",
              "Model",
              "Capacity",
              "RD cash",
              "Dealer cash",
              "MRP",
              "Opening stock",
              "Status",
              "",
            ]}
            empty={products.length === 0 && "No products yet."}
          >
            {products.map((product) => (
              <tr key={product.id}>
                <Td className="font-semibold">{product.brand ?? "–"}</Td>
                <Td>
                  {product.model}
                  <div className="text-xs text-slate-400">{product.sku}</div>
                </Td>
                <Td className="whitespace-nowrap">{product.capacity || "–"}</Td>
                <Td className="whitespace-nowrap">{price(product.rd_cash)}</Td>
                <Td className="whitespace-nowrap">
                  {price(product.dealer_cash)}
                </Td>
                <Td className="whitespace-nowrap">{price(product.mrp)}</Td>
                <Td>{product.opening_qty || "–"}</Td>
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
