import writeExcelFile from "write-excel-file/node";
import { getSession } from "@/lib/auth";
import { parseDate, parseId } from "@/lib/format";
import {
  listDistributors,
  listProducts,
  listSales,
  listUsers,
  stockByDistributor,
  type SaleKind,
} from "@/lib/queries";
import { hasRole, rolesBelow } from "@/lib/roles";

type Cell = string | number | null;

const EXPORT_LIMIT = 100_000;

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return new Response("Sign in first.", { status: 401 });
  const isAdmin = hasRole(session.role, "Admin");

  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") ?? "";
  const filters = {
    from: parseDate(params.get("from")),
    to: parseDate(params.get("to")),
    distributorId: parseId(params.get("distributor")),
  };

  let rows: Cell[][];
  if (kind === "stock") {
    const stock = await stockByDistributor(filters);
    rows = [
      ["Distributor", "City", "Primary units", "Secondary units", "Stock"],
      ...stock.map((row) => [
        row.name,
        row.city,
        row.primary_units,
        row.secondary_units,
        row.stock,
      ]),
    ];
  } else if (kind === "primary" || kind === "secondary") {
    if (kind === "primary" && !isAdmin) return forbidden();
    const sales = await listSales(
      kind as SaleKind,
      { ...filters, createdBy: isAdmin ? null : session.id },
      EXPORT_LIMIT,
    );
    rows = [
      [
        "Date",
        "Distributor",
        "Product",
        "Quantity",
        "Unit price",
        "Value",
        "Entered by",
      ],
      ...sales.map((sale) => [
        sale.sale_date,
        sale.distributor,
        sale.product,
        sale.quantity,
        sale.price,
        sale.quantity * sale.price,
        sale.entered_by,
      ]),
    ];
  } else if (kind === "products") {
    if (!isAdmin) return forbidden();
    const products = await listProducts();
    rows = [
      ["Name", "SKU", "Category", "Unit", "List price", "Status"],
      ...products.map((product) => [
        product.name,
        product.sku,
        product.category,
        product.unit,
        product.price,
        product.active ? "Active" : "Inactive",
      ]),
    ];
  } else if (kind === "distributors") {
    if (!isAdmin) return forbidden();
    const distributors = await listDistributors();
    rows = [
      ["Name", "City", "Contact", "Phone", "Status"],
      ...distributors.map((distributor) => [
        distributor.name,
        distributor.city,
        distributor.contact,
        distributor.phone,
        distributor.active ? "Active" : "Inactive",
      ]),
    ];
  } else if (kind === "users") {
    if (!isAdmin) return forbidden();
    const users = await listUsers(rolesBelow(session.role));
    rows = [
      ["Name", "Email", "Role", "Status"],
      ...users.map((user) => [
        user.name,
        user.email,
        user.role,
        user.active ? "Active" : "Disabled",
      ]),
    ];
  } else {
    return new Response("Unknown export.", { status: 400 });
  }

  const buffer = await writeExcelFile(rows).toBuffer();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${kind}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

function forbidden() {
  return new Response("Not allowed.", { status: 403 });
}
