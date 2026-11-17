import Link from "next/link";
import { notFound } from "next/navigation";
import { createSale, deleteSale, updateSale } from "@/app/actions";
import { requireRole } from "@/lib/auth";
import { readFilters, type SearchParams } from "@/lib/filters";
import { money, parseId, today, units } from "@/lib/format";
import {
  getSale,
  listBrands,
  listProducts,
  listReps,
  listSales,
  listShops,
  salesSummary,
  type Product,
  type SaleKind,
} from "@/lib/queries";
import { hasRole } from "@/lib/roles";
import { ActionForm, ConfirmButton } from "./forms";
import { SaleFields, type SaleProductOption } from "./sale-fields";
import { Shell } from "./shell";
import { FormPanel } from "./panel";
import {
  Badge,
  EditLink,
  ExportLink,
  Filters,
  ListCard,
  Pager,
  Table,
  Td,
} from "./ui";

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

const PAGE_SIZE = 50;

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
  const page = Math.max(1, Math.floor(Number((await searchParams).page)) || 1);
  const copy = COPY[kind];
  // Sales reps only ever see what they entered themselves.
  const scope = { ...filters, createdBy: isAdmin ? filters.repId : session.id };

  const [brands, products, shops, reps, sales, summary] = await Promise.all([
    listBrands(),
    listProducts({ activeOnly: true }),
    kind === "secondary" ? listShops() : Promise.resolve(undefined),
    kind === "secondary" && isAdmin ? listReps() : Promise.resolve(undefined),
    listSales(kind, scope, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    salesSummary(kind, scope),
  ]);
  const activeBrands = brands.filter((brand) => brand.active);
  const activeShops = shops?.filter((shop) => shop.active);

  const missing =
    activeBrands.length === 0 || products.length === 0
      ? "Add a brand and its products first."
      : activeShops && activeShops.length === 0
        ? isAdmin
          ? "Add a shop first, on the Shops page."
          : "No shops yet. Ask the office to add them."
        : null;
  const queryParams = {
    from: filters.from,
    to: filters.to,
    brand: filters.brandId,
    shop: filters.shopId,
    rep: isAdmin ? filters.repId : null,
  };
  const product = (sale: (typeof sales)[number]) =>
    [sale.brand, sale.model, sale.capacity].filter(Boolean).join(" ");
  const terms = (sale: (typeof sales)[number]) => (
    <Badge tone={sale.payment_terms === "cash" ? "green" : "amber"}>
      {sale.payment_terms === "cash" ? "Cash" : "Credit"}
    </Badge>
  );

  return (
    <Shell
      session={session}
      title={copy.title}
      description={copy.intro + (isAdmin ? "" : " · your own entries")}
      actions={
        <>
          <ExportLink kind={kind} params={queryParams} />
          {missing ? (
            <span className="text-sm text-slate-500">{missing}</span>
          ) : (
            <FormPanel
              label="Record sale"
              title={kind === "primary" ? "Record a purchase" : "Record a sale"}
              description={
                kind === "primary"
                  ? "Stock bought from the principal"
                  : "Stock sold to a shop"
              }
            >
              <ActionForm
                action={createSale.bind(null, kind)}
                submit="Save sale"
                className="space-y-4"
              >
                <SaleFields
                  kind={kind}
                  today={today()}
                  brands={activeBrands}
                  products={products.map(toOption)}
                  shops={activeShops}
                  canEditPrice={isAdmin}
                />
              </ActionForm>
            </FormPanel>
          )}
        </>
      }
    >
      <div className="mb-4">
        <Filters
          from={filters.from}
          to={filters.to}
          brandId={filters.brandId}
          brands={brands}
          shopId={filters.shopId}
          shops={shops}
          repId={filters.repId}
          reps={reps}
        />
      </div>

      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
        <span>
          <strong className="text-slate-900">
            {summary.count.toLocaleString("en-US")}
          </strong>{" "}
          {summary.count === 1 ? "sale" : "sales"}
        </span>
        <span>
          <strong className="text-slate-900">{units(summary.units)}</strong>{" "}
          units
        </span>
        <span>
          <strong className="text-slate-900">{money(summary.value)}</strong>{" "}
          total
        </span>
      </div>

      <Table
        head={[
          "Date",
          ...(kind === "secondary" ? ["Shop"] : []),
          "Product",
          "Qty",
          "Payment",
          "Unit price",
          "Value",
          "Entered by",
          "",
        ]}
        align={
          kind === "secondary"
            ? { 3: "right", 5: "right", 6: "right" }
            : { 2: "right", 4: "right", 5: "right" }
        }
        empty={sales.length === 0 && "No sales match these filters."}
        cards={sales.map((sale) => (
          <ListCard
            key={sale.id}
            href={isAdmin ? `${copy.path}/${sale.id}` : undefined}
            title={kind === "secondary" ? (sale.shop ?? "–") : product(sale)}
            subtitle={
              kind === "secondary"
                ? product(sale)
                : `${units(sale.quantity)} × ${money(sale.price)}`
            }
            value={money(sale.quantity * sale.price)}
            valueNote={
              kind === "secondary"
                ? `${units(sale.quantity)} × ${money(sale.price)}`
                : undefined
            }
          >
            <span>{sale.sale_date}</span>
            {terms(sale)}
            {isAdmin && <span>by {sale.entered_by}</span>}
          </ListCard>
        ))}
      >
        {sales.map((sale) => (
          <tr key={sale.id} className="hover:bg-slate-50">
            <Td className="whitespace-nowrap text-slate-500">
              {sale.sale_date}
            </Td>
            {kind === "secondary" && (
              <Td className="font-medium">{sale.shop ?? "–"}</Td>
            )}
            <Td>
              <span className="font-medium">{sale.brand}</span> {sale.model}
              {sale.capacity && (
                <span className="text-slate-500"> · {sale.capacity}</span>
              )}
            </Td>
            <Td right>{units(sale.quantity)}</Td>
            <Td>{terms(sale)}</Td>
            <Td right>{money(sale.price)}</Td>
            <Td right className="font-medium">
              {money(sale.quantity * sale.price)}
            </Td>
            <Td className="whitespace-nowrap text-slate-500">
              {sale.entered_by}
            </Td>
            <Td right>
              {isAdmin && <EditLink href={`${copy.path}/${sale.id}`} />}
            </Td>
          </tr>
        ))}
      </Table>
      <Pager
        page={page}
        pageSize={PAGE_SIZE}
        total={summary.count}
        params={queryParams}
      />
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
      description={
        <Link href={COPY[kind].path} className="link">
          ← {COPY[kind].title}
        </Link>
      }
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
