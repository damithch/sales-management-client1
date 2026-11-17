import writeExcelFile from "write-excel-file/node";
import { getSession } from "@/lib/auth";
import { debtorsByShop } from "@/lib/debtors";
import { parseDate, parseId, today } from "@/lib/format";
import {
  listBrands,
  listProducts,
  listSales,
  listShops,
  listUsers,
  stockByProduct,
  type SaleKind,
} from "@/lib/queries";
import { hasRole, rolesBelow } from "@/lib/roles";

type Cell = string | number | null;

const EXPORT_LIMIT = 100_000;
const status = (active: boolean) => (active ? "Active" : "Inactive");

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return new Response("Sign in first.", { status: 401 });
  const isAdmin = hasRole(session.role, "Admin");

  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") ?? "";
  const filters = {
    from: parseDate(params.get("from")),
    to: parseDate(params.get("to")),
    brandId: parseId(params.get("brand")),
    shopId: parseId(params.get("shop")),
    repId: parseId(params.get("rep")),
  };

  let rows: Cell[][];
  if (kind === "stock") {
    const stock = await stockByProduct(filters);
    rows = [
      [
        "Brand",
        "Model",
        "Capacity",
        "Code",
        "Opening",
        "Purchased",
        "Sold",
        "Stock in hand",
      ],
      ...stock.map((row) => [
        row.brand,
        row.model,
        row.capacity,
        row.sku,
        row.opening,
        row.purchased,
        row.sold,
        row.closing,
      ]),
    ];
  } else if (kind === "primary" || kind === "secondary") {
    if (kind === "primary" && !isAdmin) return forbidden();
    const sales = await listSales(
      kind as SaleKind,
      { ...filters, createdBy: isAdmin ? filters.repId : session.id },
      EXPORT_LIMIT,
    );
    rows = [
      [
        "Date",
        ...(kind === "secondary" ? ["Shop"] : []),
        "Brand",
        "Model",
        "Capacity",
        "Quantity",
        "Payment",
        "Unit price",
        "Value",
        "Entered by",
      ],
      ...sales.map((sale) => [
        sale.sale_date,
        ...(kind === "secondary" ? [sale.shop] : []),
        sale.brand,
        sale.model,
        sale.capacity,
        sale.quantity,
        sale.payment_terms === "cash" ? "Cash" : "Credit",
        sale.price,
        sale.quantity * sale.price,
        sale.entered_by,
      ]),
    ];
  } else if (kind === "debtors") {
    // Reps export their own debtors; Admins all, or one rep's.
    const repId = isAdmin ? filters.repId : session.id;
    let debtors = await debtorsByShop({ asOf: today(), repId });
    if (params.get("overdue") === "1") {
      debtors = debtors.filter((row) => row.overdue > 0);
    }
    rows = [
      [
        "Shop",
        "City",
        "Phone",
        "Credit days",
        "Not yet due",
        "1-30 days",
        "31-60 days",
        "61-90 days",
        "Over 90 days",
        "Total owed",
        "Oldest overdue (days)",
      ],
      ...debtors.map((row) => [
        row.shop,
        row.city,
        row.phone,
        row.credit_days,
        row.not_due,
        row.d1_30,
        row.d31_60,
        row.d61_90,
        row.d90_plus,
        row.outstanding,
        row.oldest_overdue_days,
      ]),
    ];
  } else if (kind === "products") {
    if (!isAdmin) return forbidden();
    const products = await listProducts({ brandId: filters.brandId });
    rows = [
      [
        "Brand",
        "Model",
        "Capacity",
        "Code",
        "Unit",
        "RD cash",
        "RD credit",
        "Dealer cash",
        "Dealer credit",
        "MRP",
        "Opening stock",
        "Opening date",
        "Status",
      ],
      ...products.map((product) => [
        product.brand,
        product.model,
        product.capacity,
        product.sku,
        product.unit,
        product.rd_cash,
        product.rd_credit,
        product.dealer_cash,
        product.dealer_credit,
        product.mrp,
        product.opening_qty,
        product.opening_date,
        status(product.active),
      ]),
    ];
  } else if (kind === "brands") {
    if (!isAdmin) return forbidden();
    const brands = await listBrands();
    rows = [
      ["Brand", "Status"],
      ...brands.map((brand) => [brand.name, status(brand.active)]),
    ];
  } else if (kind === "shops") {
    if (!isAdmin) return forbidden();
    const shops = await listShops();
    rows = [
      ["Shop", "City", "Contact", "Phone", "Credit days", "Status"],
      ...shops.map((shop) => [
        shop.name,
        shop.city,
        shop.contact,
        shop.phone,
        shop.credit_days,
        status(shop.active),
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
