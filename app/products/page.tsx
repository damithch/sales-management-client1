import Link from "next/link";
import { createProduct } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { FormPanel } from "@/components/panel";
import { ProductFields } from "@/components/product-fields";
import { Shell } from "@/components/shell";
import {
  Badge,
  EditLink,
  ExportLink,
  ListCard,
  Table,
  Td,
} from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { readFilters, type SearchParams } from "@/lib/filters";
import { money, units } from "@/lib/format";
import { listBrands, listProducts } from "@/lib/queries";

const price = (value: number | null) => (value === null ? "–" : money(value));

/** Brand tabs: one link per brand, plus All. */
function BrandTabs({
  brands,
  current,
}: {
  brands: { id: string; name: string }[];
  current: string | null;
}) {
  const tab = (label: string, href: string, active: boolean) => (
    <Link
      key={href}
      href={href}
      className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm font-medium ${
        active
          ? "border-brand bg-brand text-white"
          : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
      {tab("All brands", "/products", !current)}
      {brands.map((brand) =>
        tab(brand.name, `/products?brand=${brand.id}`, current === brand.id),
      )}
    </div>
  );
}

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
    <Shell
      session={session}
      title="Products"
      description="Models and their prices. RD is what you pay; Dealer is what shops pay."
      actions={
        <>
          <ExportLink kind="products" params={{ brand: brandId }} />
          {activeBrands.length === 0 ? (
            <Link href="/brands" className="btn-primary">
              Add a brand first
            </Link>
          ) : (
            <FormPanel
              label="Add product"
              title="New product"
              description="Brand, model and capacity, then the prices"
            >
              <ActionForm
                action={createProduct}
                submit="Add product"
                className="space-y-4"
              >
                <ProductFields brands={activeBrands} />
              </ActionForm>
            </FormPanel>
          )}
        </>
      }
    >
      <BrandTabs brands={brands} current={brandId} />
      <Table
        head={[
          "Product",
          "RD cash",
          "RD credit",
          "Dealer cash",
          "Dealer credit",
          "MRP",
          "Opening stock",
          "",
        ]}
        align={{
          1: "right",
          2: "right",
          3: "right",
          4: "right",
          5: "right",
          6: "right",
        }}
        empty={products.length === 0 && "No products yet."}
        cards={products.map((product) => (
          <ListCard
            key={product.id}
            href={`/products/${product.id}`}
            title={[product.brand, product.model].filter(Boolean).join(" ")}
            subtitle={product.capacity || product.sku}
            value={price(product.dealer_cash)}
            valueNote="Dealer cash"
          >
            <span>RD {price(product.rd_cash)}</span>
            <span>MRP {price(product.mrp)}</span>
            {product.opening_qty > 0 && (
              <span>Opening {units(product.opening_qty)}</span>
            )}
            {!product.active && <Badge tone="slate">Inactive</Badge>}
          </ListCard>
        ))}
      >
        {products.map((product) => (
          <tr key={product.id} className="hover:bg-slate-50">
            <Td>
              <div className="font-medium">
                {product.brand} {product.model}
                {!product.active && (
                  <span className="ml-2">
                    <Badge tone="slate">Inactive</Badge>
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500">
                {[product.capacity, product.sku].filter(Boolean).join(" · ")}
              </div>
            </Td>
            <Td right>{price(product.rd_cash)}</Td>
            <Td right className="text-slate-500">
              {price(product.rd_credit)}
            </Td>
            <Td right>{price(product.dealer_cash)}</Td>
            <Td right className="text-slate-500">
              {price(product.dealer_credit)}
            </Td>
            <Td right className="text-slate-500">
              {price(product.mrp)}
            </Td>
            <Td right>
              {product.opening_qty ? units(product.opening_qty) : "–"}
            </Td>
            <Td right>
              <EditLink href={`/products/${product.id}`} />
            </Td>
          </tr>
        ))}
      </Table>
    </Shell>
  );
}
