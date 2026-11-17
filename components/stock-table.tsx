import { units } from "@/lib/format";
import type { StockRow } from "@/lib/queries";
import { ListCard, StockBadge, Table, Td } from "./ui";

/** Opening + purchases − sales = stock in hand, one row per model. */
export function StockTable({
  rows,
  showBrand = true,
}: {
  rows: StockRow[];
  showBrand?: boolean;
}) {
  const total = (key: "opening" | "purchased" | "sold" | "closing") =>
    rows.reduce((sum, row) => sum + row[key], 0);
  const name = (row: StockRow) =>
    [showBrand ? row.brand : null, row.model].filter(Boolean).join(" ");
  return (
    <Table
      head={["Product", "Opening", "Purchased", "Sold", "Stock in hand"]}
      align={{ 1: "right", 2: "right", 3: "right", 4: "right" }}
      empty={rows.length === 0 && "No products yet."}
      cards={rows.map((row) => (
        <ListCard
          key={row.id}
          title={name(row)}
          subtitle={row.capacity || undefined}
          value={<StockBadge stock={row.closing} />}
          valueNote="in hand"
        >
          <span>Opening {units(row.opening)}</span>
          <span>Bought {units(row.purchased)}</span>
          <span>Sold {units(row.sold)}</span>
        </ListCard>
      ))}
    >
      {rows.map((row) => (
        <tr key={row.id} className="hover:bg-slate-50">
          <Td>
            <span className="font-medium">{name(row)}</span>
            {row.capacity && (
              <span className="text-slate-500"> · {row.capacity}</span>
            )}
          </Td>
          <Td right>{units(row.opening)}</Td>
          <Td right>{units(row.purchased)}</Td>
          <Td right>{units(row.sold)}</Td>
          <Td right>
            <StockBadge stock={row.closing} />
          </Td>
        </tr>
      ))}
      {rows.length > 1 && (
        <tr className="bg-slate-50 font-semibold">
          <Td>Total</Td>
          <Td right>{units(total("opening"))}</Td>
          <Td right>{units(total("purchased"))}</Td>
          <Td right>{units(total("sold"))}</Td>
          <Td right>
            <StockBadge stock={total("closing")} />
          </Td>
        </tr>
      )}
    </Table>
  );
}
