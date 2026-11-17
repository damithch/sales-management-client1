import { notFound } from "next/navigation";
import { createSale, deleteSale, updateSale } from "@/app/actions";
import { requireRole } from "@/lib/auth";
import { readFilters, type SearchParams } from "@/lib/filters";
import { money, parseId, today, units } from "@/lib/format";
import {
  getSale,
  listBrands,
  listProducts,
  listSales,
  listShops,
  type Product,
  type SaleKind,
} from "@/lib/queries";
import { hasRole } from "@/lib/roles";
import { ActionForm, ConfirmButton } from "./forms";
import { SaleFields, type SaleProductOption } from "./sale-fields";
import { Shell } from "./shell";
import { Badge, EditLink, ExportLink, Filters, Table, Td } from "./ui";

const COPY = {
  primary: {
    title: "Primary sales",
    path: "/primary-sales",
    intro: "Stock bought from the principal, at the RD price",
  },
  secondary: {
    title: "Secondary sales",
    path: "/secondary-sales",
    intro: "Stock sold to shops, at the Dealer price",
  },
};

const toOption = (product: Product): SaleProductOption => ({
  id: product.id,
  brandId: product.brand_id,
  label: [product.model, product.capacity].filter(Boolean).join(" · "),
  rd_cash: product.rd_cash,
  rd_credit: product.rd_credit,
  dealer_cash: product.dealer_cash,
  dealer_credit: product.dealer_credit,
});

/** List, filter and entry screen shared by primary and secondary sales. */
export async function SalesPage({
  kind,
  searchParams,
}: {
  kind: SaleKind;
  searchParams: SearchParams;
}) {
  const session = await requireRole(kind === "primary" ? "Admin" : "Sales Rep");
  const isAdmin = hasRole(session.role, "Admin");
  const filters = await readFilters(searchParams);
  const copy = COPY[kind];

  const [brands, products, shops, sales] = await Promise.all([
    listBrands(),
    listProducts({ activeOnly: true }),
    kind === "secondary" ? listShops() : Promise.resolve(undefined),
    // Sales reps only ever see what they entered themselves.
    listSales(kind, { ...filters, createdBy: isAdmin ? null : session.id }),
  ]);
  const activeBrands = brands.filter((brand) => brand.active);
  const activeShops = shops?.filter((shop) => shop.active);
  const total = sales.reduce(
    (sum, sale) => sum + sale.quantity * sale.price,
    0,
  );

  const missing =
    activeBrands.length === 0 || products.length === 0
      ? "Add a brand and its products first."
      : activeShops && activeShops.length === 0
        ? isAdmin
          ? "Add a shop first, on the Shops page."
          : "No shops have been added yet. Ask the office to add them."
        : null;

  return (
    <Shell session={session} title={copy.title}>
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {missing ? (
          <div className="card space-y-2 p-5 text-sm">
            <h2 className="font-bold">Record a sale</h2>
            <p className="text-slate-500">{missing}</p>
          </div>
        ) : (
          <ActionForm action={createSale.bind(null, kind)} submit="Save sale">
            <h2 className="font-bold">Record a sale</h2>
            <SaleFields
              kind={kind}
              today={today()}
              brands={activeBrands}
              products={products.map(toOption)}
              shops={activeShops}
              canEditPrice={isAdmin}
            />
          </ActionForm>
        )}
        <div className="min-w-0">
          <p className="mb-3 text-sm text-slate-500">
            {copy.intro}
            {!isAdmin && " – showing your own entries"}
          </p>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <Filters
              from={filters.from}
              to={filters.to}
              brandId={filters.brandId}
              brands={brands}
              shopId={filters.shopId}
              shops={shops}
            />
            <ExportLink
              kind={kind}
              params={{
                from: filters.from,
                to: filters.to,
                brand: filters.brandId,
                shop: filters.shopId,
              }}
            />
          </div>
          <Table
            head={[
              "Date",
              ...(kind === "secondary" ? ["Shop"] : []),
              "Brand",
              "Model",
              "Qty",
              "Payment",
              "Unit price",
              "Value",
              "Entered by",
              "",
            ]}
            empty={sales.length === 0 && "No sales match these filters."}
          >
            {sales.map((sale) => (
              <tr key={sale.id}>
                <Td className="whitespace-nowrap text-slate-500">
                  {sale.sale_date}
                </Td>
                {kind === "secondary" && (
                  <Td className="font-semibold">{sale.shop ?? "–"}</Td>
                )}
                <Td className={kind === "primary" ? "font-semibold" : ""}>
                  {sale.brand ?? "–"}
                </Td>
                <Td>
                  {sale.model}
                  {sale.capacity && (
                    <div className="text-xs text-slate-400">
                      {sale.capacity}
                    </div>
                  )}
                </Td>
                <Td>{units(sale.quantity)}</Td>
                <Td>
                  <Badge
                    tone={sale.payment_terms === "cash" ? "green" : "slate"}
                  >
                    {sale.payment_terms === "cash" ? "Cash" : "Credit"}
                  </Badge>
                </Td>
                <Td className="whitespace-nowrap">{money(sale.price)}</Td>
                <Td className="whitespace-nowrap">
                  {money(sale.quantity * sale.price)}
                </Td>
                <Td className="text-slate-500">{sale.entered_by}</Td>
                <Td>
                  {isAdmin && <EditLink href={`${copy.path}/${sale.id}`} />}
                </Td>
              </tr>
            ))}
          </Table>
          <p className="mt-3 text-xs text-slate-400">
            {sales.length} {sales.length === 1 ? "sale" : "sales"},{" "}
            {money(total)} in total
            {sales.length === 500 &&
              ". Showing the latest 500; narrow the dates or export to see all."}
          </p>
        </div>
      </div>
    </Shell>
  );
}

/** Edit and delete screen for one sale. Admins only. */
export async function SaleEditPage({
  kind,
  params,
}: {
  kind: SaleKind;
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("Admin");
  const id = parseId((await params).id);
  const sale = id && (await getSale(kind, id));
  if (!sale) notFound();

  const [brands, products, shops] = await Promise.all([
    listBrands(),
    listProducts(),
    kind === "secondary" ? listShops() : Promise.resolve(undefined),
  ]);

  return (
    <Shell
      session={session}
      title={kind === "primary" ? "Edit primary sale" : "Edit secondary sale"}
    >
      <div className="max-w-md space-y-4">
        <ActionForm
          action={updateSale.bind(null, kind, sale.id)}
          submit="Save changes"
        >
          <SaleFields
            kind={kind}
            today={today()}
            // Inactive records stay choosable only when this sale already uses them.
            brands={brands.filter(
              (brand) => brand.active || brand.id === sale.brand_id,
            )}
            products={products
              .filter(
                (product) => product.active || product.id === sale.product_id,
              )
              .map(toOption)}
            shops={shops?.filter(
              (shop) => shop.active || shop.id === sale.shop_id,
            )}
            canEditPrice
            initial={{
              date: sale.sale_date,
              shopId: sale.shop_id,
              brandId: sale.brand_id,
              productId: sale.product_id,
              quantity: sale.quantity,
              terms: sale.payment_terms,
              price: sale.price,
            }}
          />
          <p className="text-xs text-slate-400">Entered by {sale.entered_by}</p>
        </ActionForm>
        <ConfirmButton
          action={deleteSale.bind(null, kind, sale.id)}
          message="Delete this sale? Stock figures will change."
        >
          Delete this sale
        </ConfirmButton>
      </div>
    </Shell>
  );
}
