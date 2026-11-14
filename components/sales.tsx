import { notFound } from "next/navigation";
import { createSale, deleteSale, updateSale } from "@/app/actions";
import { requireRole } from "@/lib/auth";
import { readFilters, type SearchParams } from "@/lib/filters";
import { money, parseId, today, units } from "@/lib/format";
import {
  getSale,
  listDistributors,
  listProducts,
  listSales,
  type Distributor,
  type Product,
  type Sale,
  type SaleKind,
} from "@/lib/queries";
import { hasRole } from "@/lib/roles";
import { ActionForm, ConfirmButton } from "./forms";
import { Shell } from "./shell";
import { EditLink, ExportLink, Field, Filters, Table, Td } from "./ui";

const COPY = {
  primary: {
    title: "Primary sales",
    path: "/primary-sales",
    intro: "Sales from the company to distributors",
  },
  secondary: {
    title: "Secondary sales",
    path: "/secondary-sales",
    intro: "Sales from distributors on to the market",
  },
};

function SaleFields({
  sale,
  distributors,
  products,
}: {
  sale?: Sale;
  distributors: Distributor[];
  products: Product[];
}) {
  return (
    <>
      <Field label="Date">
        <input
          required
          name="date"
          type="date"
          max={today()}
          defaultValue={sale?.sale_date ?? today()}
          className="input"
        />
      </Field>
      <Field label="Distributor">
        <select
          required
          name="distributor_id"
          defaultValue={sale?.distributor_id ?? ""}
          className="input"
        >
          <option value="" disabled>
            Choose…
          </option>
          {distributors.map((distributor) => (
            <option key={distributor.id} value={distributor.id}>
              {distributor.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Product">
        <select
          required
          name="product_id"
          defaultValue={sale?.product_id ?? ""}
          className="input"
        >
          <option value="" disabled>
            Choose…
          </option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} ({product.sku})
            </option>
          ))}
        </select>
      </Field>
      <Field label="Quantity">
        <input
          required
          name="quantity"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          defaultValue={sale?.quantity}
          className="input"
        />
      </Field>
      <Field label="Unit price">
        <input
          name="price"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          defaultValue={sale?.price}
          placeholder="Blank = product list price"
          className="input"
        />
      </Field>
    </>
  );
}

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

  const [distributors, products, sales] = await Promise.all([
    listDistributors(),
    listProducts(true),
    // Sales reps only ever see what they entered themselves.
    listSales(kind, { ...filters, createdBy: isAdmin ? null : session.id }),
  ]);
  const total = sales.reduce(
    (sum, sale) => sum + sale.quantity * sale.price,
    0,
  );

  return (
    <Shell session={session} title={copy.title}>
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <ActionForm action={createSale.bind(null, kind)} submit="Save sale">
          <h2 className="font-bold">Record a sale</h2>
          <SaleFields
            distributors={distributors.filter(
              (distributor) => distributor.active,
            )}
            products={products}
          />
        </ActionForm>
        <div className="min-w-0">
          <p className="mb-3 text-sm text-slate-500">
            {copy.intro}
            {!isAdmin && " – showing your own entries"}
          </p>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <Filters {...filters} distributors={distributors} />
            <ExportLink
              kind={kind}
              params={{
                from: filters.from,
                to: filters.to,
                distributor: filters.distributorId,
              }}
            />
          </div>
          <Table
            head={[
              "Date",
              "Distributor",
              "Product",
              "Quantity",
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
                <Td className="font-semibold">{sale.distributor}</Td>
                <Td>{sale.product}</Td>
                <Td>{units(sale.quantity)}</Td>
                <Td>{money(sale.price)}</Td>
                <Td>{money(sale.quantity * sale.price)}</Td>
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

  const [distributors, products] = await Promise.all([
    listDistributors(),
    listProducts(),
  ]);

  return (
    <Shell
      session={session}
      title={`Edit ${COPY[kind].title.toLowerCase().slice(0, -1)}`}
    >
      <div className="max-w-md space-y-4">
        <ActionForm
          action={updateSale.bind(null, kind, sale.id)}
          submit="Save changes"
        >
          <SaleFields
            sale={sale}
            // Keep inactive records selectable only when this sale already uses them.
            distributors={distributors.filter(
              (distributor) =>
                distributor.active || distributor.id === sale.distributor_id,
            )}
            products={products.filter(
              (product) => product.active || product.id === sale.product_id,
            )}
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
