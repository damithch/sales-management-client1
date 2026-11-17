import { units } from "@/lib/format";
import type { StockRow } from "@/lib/queries";
import { StockBadge, Table, Td } from "./ui";

/** Opening + purchases − sales = stock in hand, one row per model. */
export function StockTable({
  rows,
  showBrand = true,
}: {
  rows: StockRow[];
  showBrand?: boolean;
}) {
  const head = [
    ...(showBrand ? ["Brand"] : []),
    "Model",
    "Capacity",
    "Opening",
    "Purchased",
    "Sold",
    "Stock in hand",
  ];
  const total = (key: "opening" | "purchased" | "sold" | "closing") =>
    rows.reduce((sum, row) => sum + row[key], 0);
  return (
    <Table head={head} empty={rows.length === 0 && "No products yet."}>
      {rows.map((row) => (
        <tr key={row.id}>
          {showBrand && <Td className="font-semibold">{row.brand ?? "–"}</Td>}
          <Td>{row.model}</Td>
          <Td className="whitespace-nowrap">{row.capacity || "–"}</Td>
          <Td>{units(row.opening)}</Td>
          <Td>{units(row.purchased)}</Td>
          <Td>{units(row.sold)}</Td>
          <Td>
            <StockBadge stock={row.closing} />
          </Td>
        </tr>
      ))}
      {rows.length > 1 && (
        <tr className="bg-slate-50 font-semibold">
          {showBrand && <Td>Total</Td>}
          <Td>{showBrand ? "" : "Total"}</Td>
          <Td />
          <Td>{units(total("opening"))}</Td>
          <Td>{units(total("purchased"))}</Td>
          <Td>{units(total("sold"))}</Td>
          <Td>
            <StockBadge stock={total("closing")} />
          </Td>
        </tr>
      )}
    </Table>
  );
}
